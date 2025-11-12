// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SENDGRID_WEBHOOK_VERIFY_KEY =
  Deno.env.get('SENDGRID_WEBHOOK_VERIFY_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function badRequest(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifySendGridSignature(
  payload: string,
  signature: string,
  timestamp: string
) {
  if (!SENDGRID_WEBHOOK_VERIFY_KEY) return true; // Skip verification if no key set

  const data = new TextEncoder().encode(payload + timestamp);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SENDGRID_WEBHOOK_VERIFY_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return badRequest('Server not configured', 500);
  }

  const rawBody = await req.text();

  // Verify signature if webhook verification is enabled
  if (SENDGRID_WEBHOOK_VERIFY_KEY) {
    const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
    const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

    if (!signature || !timestamp) {
      return badRequest('Missing signature headers');
    }

    const isValid = await verifySendGridSignature(
      rawBody,
      signature,
      timestamp
    );
    if (!isValid) {
      return badRequest('Invalid signature');
    }
  }

  // SendGrid Inbound Parse sends form-data or JSON
  let parsedData: any = {};
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      parsedData = JSON.parse(rawBody);
    } else {
      // Parse as form data for SendGrid Inbound Parse
      const form = new FormData();
      const body = new URLSearchParams(rawBody);
      for (const [key, value] of body.entries()) {
        form.set(key, value);
      }

      // Extract common fields from SendGrid Inbound Parse
      parsedData = {
        from: form.get('from') || '',
        to: form.get('to') || '',
        subject: form.get('subject') || '',
        text: form.get('text') || '',
        html: form.get('html') || '',
        headers: form.get('headers') || '{}',
        envelope: form.get('envelope') || '{}',
      };
    }
  } catch {
    return badRequest('Invalid payload format');
  }

  const sender = parsedData.from || '';
  const recipient = parsedData.to || '';
  const subject = parsedData.subject || '';
  const bodyText = parsedData.text || '';
  const bodyHtml = parsedData.html || '';

  // Parse headers and envelope for message tracking
  let headers: Record<string, string> = {};
  let envelope: any = {};

  try {
    headers =
      typeof parsedData.headers === 'string'
        ? JSON.parse(parsedData.headers)
        : parsedData.headers || {};
    envelope =
      typeof parsedData.envelope === 'string'
        ? JSON.parse(parsedData.envelope)
        : parsedData.envelope || {};
  } catch {}

  const messageId = (
    headers['Message-ID'] ||
    headers['message-id'] ||
    ''
  ).replace(/[<>]/g, '');
  const inReplyTo = (
    headers['In-Reply-To'] ||
    headers['in-reply-to'] ||
    ''
  ).replace(/[<>]/g, '');
  const references = (headers['References'] || headers['references'] || '')
    .split(/\s+/)
    .map((t: string) => t.replace(/[<>]/g, ''))
    .filter(Boolean);

  const nowIso = new Date().toISOString();

  try {
    // Find the user based on recipient email
    const recipientEmail = recipient || '';
    const local = recipientEmail.split('@')[0]?.toLowerCase();

    // Map alias local-part to a user via profiles.email
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .ilike('email', `${local}@%`)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile?.user_id) {
      return badRequest('Unknown recipient', 404);
    }

    // Insert the inbound email as a received communication
    const insertPayload: Record<string, any> = {
      user_id: profile.user_id,
      direction: 'received',
      subject: subject || null,
      body_text: bodyText || null,
      body_html: bodyHtml || null,
      sender_email: sender || null,
      recipient_email: recipient || null,
      status: 'received',
      sendgrid_message_id: messageId || null,
      in_reply_to_message_id: inReplyTo || null,
      references: references.length ? references : null,
      created_at: nowIso,
    };

    const { error: insErr } = await supabaseAdmin
      .from('email_communications')
      .insert(insertPayload);
    if (insErr) throw insErr;

    // Correlate with original sent email via In-Reply-To or References
    let correlateId: string | null = null;
    if (inReplyTo) correlateId = inReplyTo;
    if (!correlateId && references.length)
      correlateId = references[references.length - 1];

    if (correlateId) {
      const { data: orig, error: selErr } = await supabaseAdmin
        .from('email_communications')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('sendgrid_message_id', correlateId)
        .eq('direction', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selErr) throw selErr;
      if (orig?.id) {
        const { error: updErr } = await supabaseAdmin
          .from('email_communications')
          .update({ replied_at: nowIso, status: 'replied' })
          .eq('id', orig.id);
        if (updErr) throw updErr;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e: any) {
    console.error('Inbound email processing error:', e);
    return badRequest(String(e?.message ?? e), 500);
  }
}

Deno.serve(handler);
