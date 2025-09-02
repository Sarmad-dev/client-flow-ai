// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAILGUN_SIGNING_KEY = Deno.env.get('MAILGUN_SIGNING_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Verify Mailgun webhook signature
async function verifySignature(
  timestamp: string,
  token: string,
  signature: string
) {
  const data = new TextEncoder().encode(`${timestamp}${token}`);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(MAILGUN_SIGNING_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

async function handler(req: Request, res: Response): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MAILGUN_SIGNING_KEY) {
    return new Response('Server not configured', { status: 500 });
  }

  // Support both JSON and multipart/form-data payloads
  let parsedSig: {
    timestamp: string;
    token: string;
    signature: string;
  } | null = null;
  let parsedEvent: any = null;
  let inbound: {
    sender?: string | null;
    recipient?: string | null;
    subject?: string | null;
    bodyHtml?: string | null;
    bodyText?: string | null;
    messageId?: string | null;
  } = {};
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const jsonBody = (await req.json()) as any;
      parsedSig = jsonBody.signature ?? null;
      parsedEvent = jsonBody['event-data'] ?? jsonBody.eventData ?? null;
      // Some setups forward inbound as JSON too
      if (!parsedEvent && (jsonBody.sender || jsonBody.recipient)) {
        inbound.sender = jsonBody.sender ?? jsonBody.from ?? null;
        inbound.recipient = jsonBody.recipient ?? null;
        inbound.subject = jsonBody.subject ?? null;
        inbound.bodyHtml =
          jsonBody['stripped-html'] ?? jsonBody['body-html'] ?? null;
        inbound.bodyText =
          jsonBody['stripped-text'] ?? jsonBody['body-plain'] ?? null;
        inbound.messageId = jsonBody['Message-Id'] ?? null;
      }
    } else {
      // Attempt form parsing (multipart/form-data or x-www-form-urlencoded)
      const formData = await req.formData();
      const signature = formData.get('signature') as any;
      const eventData = (formData.get('event-data') ??
        formData.get('eventData')) as any;
      if (signature) {
        parsedSig =
          typeof signature === 'string' ? JSON.parse(signature) : signature;
      }
      if (eventData) {
        parsedEvent =
          typeof eventData === 'string' ? JSON.parse(eventData) : eventData;
      }
      if (!parsedEvent) {
        // Inbound route payload
        inbound.sender =
          (formData.get('sender') as string) ||
          (formData.get('from') as string) ||
          null;
        inbound.recipient = (formData.get('recipient') as string) || null;
        inbound.subject = (formData.get('subject') as string) || null;
        inbound.bodyHtml =
          (formData.get('stripped-html') as string) ||
          (formData.get('body-html') as string) ||
          null;
        inbound.bodyText =
          (formData.get('stripped-text') as string) ||
          (formData.get('body-plain') as string) ||
          null;
        const mh = formData.get('message-headers') as string | null;
        if (mh) {
          try {
            const arr = JSON.parse(mh) as [string, string][];
            const mid = (arr.find(([k]) => k.toLowerCase() === 'message-id') ||
              [])[1];
            inbound.messageId = mid ?? null;
          } catch (_) {
            inbound.messageId = null;
          }
        } else {
          inbound.messageId = (formData.get('Message-Id') as string) || null;
        }
      }
    }
  } catch (_) {
    // fallthrough to handling below
  }

  // If it's an inbound message (no event), handle storing the received email
  if (inbound.sender && inbound.recipient) {
    try {
      const recipient = inbound.recipient as string;
      const local = recipient.split('@')[0]?.toLowerCase();
      // Map alias local-part to a user via profiles.email
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email')
        .ilike('email', `${local}@%`)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (!profile?.user_id) {
        return badRequest('Unknown recipient');
      }

      const nowIso = new Date().toISOString();
      const { error: insertErr } = await supabaseAdmin
        .from('email_communications')
        .insert({
          user_id: profile.user_id,
          mailgun_message_id: inbound.messageId
            ? `<${inbound.messageId}>`
            : null,
          direction: 'received',
          subject: inbound.subject ?? null,
          body_text: inbound.bodyText ?? null,
          body_html: inbound.bodyHtml ?? null,
          sender_email: inbound.sender ?? null,
          recipient_email: inbound.recipient ?? null,
          status: 'received',
          created_at: nowIso,
        });
      if (insertErr) throw insertErr;

      // Mark the latest sent email to this sender as replied
      const { data: lastSent, error: fetchErr } = await supabaseAdmin
        .from('email_communications')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('direction', 'sent')
        .eq('recipient_email', inbound.sender)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!fetchErr && lastSent?.id) {
        await supabaseAdmin
          .from('email_communications')
          .update({ replied_at: nowIso })
          .eq('id', lastSent.id);
      }

      return new Response('OK', { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (!parsedSig || !parsedEvent) {
    return badRequest('Invalid webhook payload');
  }

  const ok = await verifySignature(
    parsedSig.timestamp,
    parsedSig.token,
    parsedSig.signature
  );
  if (!ok) {
    return badRequest('Invalid signature');
  }

  const event = parsedEvent.event as string; // delivered, opened, clicked, complained, unsubscribed, stored, failed, etc.
  // Prefer our custom correlation header first, then mailgun message-id
  const headers = (parsedEvent.message?.headers ?? {}) as Record<string, any>;
  const messageId = Object.keys(headers).reduce<string | undefined>(
    (acc, key) => {
      if (acc) return acc;
      return key.toLowerCase() === 'message-id'
        ? (headers[key] as string)
        : undefined;
    },
    undefined
  );

  if (!parsedEvent.message?.headers['message-id']) {
    return new Response('NOT OK', { status: 500 });
  }

  const timestamp = new Date(
    (parsedEvent.timestamp ?? Date.now()) * 1000
  ).toISOString();

  try {
    // Update email_communications row based on event. If no message-id, acknowledge without update.
    const update: Record<string, any> = {};
    switch (event) {
      case 'delivered':
        update.status = 'delivered';
        break;
      case 'opened':
        update.opened_at = timestamp;
        update.status = 'opened';
        break;
      case 'clicked':
        update.clicked_at = timestamp;
        update.status = 'clicked';
        break;
      case 'failed':
        update.status = 'failed';
        break;
      case 'complained':
        update.status = 'complained';
        break;
      default:
        // Ignore other events or store raw if needed
        break;
    }

    if (Object.keys(update).length > 0) {
      if (messageId) {
        const { error } = await supabaseAdmin
          .from('email_communications')
          .update(update)
          .eq('mailgun_message_id', `<${messageId}>`);
        if (error) throw error;
      }
    }

    // Reply storage is handled above when inbound payloads are posted to this webhook

    return new Response('OK', {
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(handler);
