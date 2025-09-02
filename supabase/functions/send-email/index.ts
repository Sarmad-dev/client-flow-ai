// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

type SendEmailRequest = {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
};

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY') ?? '';
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') ?? '';
const MAILGUN_BASE_URL =
  Deno.env.get('MAILGUN_BASE_URL') ?? 'https://api.mailgun.net';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function unauthorized(msg = 'Unauthorized') {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sendWithMailgun(args: {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  const form = new URLSearchParams();
  form.append('from', `${args.from} <${args.from}@${MAILGUN_DOMAIN}>`);
  form.append('to', args.to);
  form.append('subject', args.subject);
  if (args.html) form.append('html', args.html);
  if (args.text) form.append('text', args.text);
  // Enable tracking
  form.append('o:tracking', 'yes');
  form.append('o:tracking-opens', 'yes');
  form.append('o:tracking-clicks', 'yes');
  if (args.replyTo) form.append('h:Reply-To', args.replyTo);
  if (args.headers) {
    for (const [k, v] of Object.entries(args.headers)) {
      form.append(`h:${k}`, v);
    }
  }

  const res = await fetch(`${MAILGUN_BASE_URL}/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailgun error (${res.status}): ${text}`);
  }
  return (await res.json()) as { id: string; message: string };
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (
    !MAILGUN_API_KEY ||
    !MAILGUN_DOMAIN ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return new Response('Server not configured', { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }
  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return unauthorized('Invalid user');
  }

  let body: SendEmailRequest;
  try {
    body = (await req.json()) as SendEmailRequest;
  } catch {
    return badRequest('Invalid JSON');
  }

  if (!body.to || !body.subject || (!body.html && !body.text)) {
    return badRequest('Missing required fields: to, subject, (html or text)');
  }

  const replyTo =
    user.email.split('@')[0] + '@techcorps.online' ??
    `replies@${MAILGUN_DOMAIN}`;
  const emailCommId = crypto.randomUUID();

  try {
    // Suppression check
    const { data: suppress } = await supabaseAdmin
      .from('suppression_list')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', body.to)
      .maybeSingle();
    if (suppress) {
      return badRequest('Recipient is suppressed');
    }

    const mg = await sendWithMailgun({
      to: body.to,
      from: body.from,
      subject: body.subject,
      html: body.html,
      text: body.text,
      replyTo,
      headers: {
        'X-Client-Email-Id': emailCommId,
      },
    });

    console.log('mg', mg);

    const { error: insertError } = await supabaseAdmin
      .from('email_communications')
      .insert({
        id: emailCommId,
        user_id: user.id,
        client_id: body.client_id ?? null,
        mailgun_message_id: mg.id,
        direction: 'sent',
        subject: body.subject,
        body_text: body.text ?? null,
        body_html: body.html ?? null,
        sender_email: body.from,
        recipient_email: body.to,
        status: 'sent',
      });
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ id: mg.id, status: 'sent' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
