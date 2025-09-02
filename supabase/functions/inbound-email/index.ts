// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAILGUN_SIGNING_KEY = Deno.env.get('MAILGUN_SIGNING_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function badRequest(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', { status: 405 });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MAILGUN_SIGNING_KEY) {
    return badRequest('Server not configured', 500);
  }

  // Mailgun Routes send form-data
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest('Invalid payload');
  }

  const sigObj = form.get('signature') as any;
  let sig: { timestamp: string; token: string; signature: string } | null =
    null;
  try {
    sig = typeof sigObj === 'string' ? JSON.parse(sigObj) : sigObj;
  } catch {}
  // if (!sig?.timestamp || !sig?.token || !sig?.signature) {
  //   return badRequest('Missing signature');
  // }
  // const ok = await verifySignature(sig.timestamp, sig.token, sig.signature);
  // if (!ok) return badRequest('Invalid signature');

  // return new Response('OK', { status: 200 });

  // Common route fields
  const sender =
    (form.get('sender') as string) || (form.get('from') as string) || '';
  const recipient =
    (form.get('recipient') as string) || (form.get('to') as string) || '';
  const subject = (form.get('subject') as string) || '';
  const bodyPlain =
    (form.get('body-plain') as string) ||
    (form.get('stripped-text') as string) ||
    '';
  const bodyHtml =
    (form.get('body-html') as string) ||
    (form.get('stripped-html') as string) ||
    '';

  // Headers
  const messageHeadersRaw = form.get('message-headers') as string | null; // JSON array of tuples
  // Also available sometimes: 'Message-Id', 'In-Reply-To', 'References'
  const messageIdHeader =
    (form.get('Message-Id') as string) ||
    (form.get('message-id') as string) ||
    '';
  const inReplyToHeader = (form.get('In-Reply-To') as string) || '';
  const referencesHeader = (form.get('References') as string) || '';

  let headerMap: Record<string, string> = {};
  try {
    if (messageHeadersRaw) {
      const pairs = JSON.parse(messageHeadersRaw) as [string, string][];
      for (const [k, v] of pairs) {
        headerMap[k.toLowerCase()] = v;
      }
    }
  } catch {}

  const lc = (s: string) => s?.toLowerCase?.() ?? '';
  const header = (k: string) => headerMap[lc(k)] || '';

  const messageId = (header('message-id') || messageIdHeader || '').replace(
    /[<>]/g,
    ''
  );
  const inReplyTo = (header('in-reply-to') || inReplyToHeader || '').replace(
    /[<>]/g,
    ''
  );
  const references = (header('references') || referencesHeader || '')
    .split(/\s+/)
    .map((t) => t.replace(/[<>]/g, ''))
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
      body_text: bodyPlain || null,
      body_html: bodyHtml || null,
      sender_email: sender || null,
      recipient_email: recipient || null,
      status: 'received',
      mailgun_message_id: messageId ? `<${messageId}>` : null,
      in_reply_to_message_id: inReplyTo ? `<${inReplyTo}>` : null,
      references: references.length ? references.map((r) => `<${r}>`) : null,
      created_at: nowIso,
    };

    const { error: insErr } = await supabaseAdmin
      .from('email_communications')
      .insert(insertPayload);
    if (insErr) throw insErr;

    // Correlate with original sent email via In-Reply-To or References
    let correlateId: string | null = null;
    if (inReplyTo) correlateId = `<${inReplyTo}>`;
    if (!correlateId && references.length)
      correlateId = `<${references[references.length - 1]}>`;

    if (correlateId) {
      const { data: orig, error: selErr } = await supabaseAdmin
        .from('email_communications')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('mailgun_message_id', correlateId)
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
    return badRequest(String(e?.message ?? e), 500);
  }
}

Deno.serve(handler);
