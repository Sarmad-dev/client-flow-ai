// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

type SendEmailRequest = {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
<<<<<<< HEAD
  client_id?: string | null;
  lead_id?: string | null;
  signature_used?: string | null;
  in_reply_to_message_id?: string | null;
  references?: string[] | null;
=======
>>>>>>> parent of b4f42cb (Implemented detailed tasks)
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
<<<<<<< HEAD
  customArgs?: Record<string, string>;
  user?: any;
  in_reply_to_message_id?: string | null;
  references?: string[] | null;
=======
>>>>>>> parent of b4f42cb (Implemented detailed tasks)
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
<<<<<<< HEAD
    payload.headers = args.headers;
  } else {
    payload.headers = {};
  }

  // Add threading headers for email replies
  if (args.in_reply_to_message_id) {
    payload.headers['In-Reply-To'] = args.in_reply_to_message_id;
  }

  if (args.references && args.references.length > 0) {
    // References header should be a space-separated list of message IDs
    payload.headers['References'] = args.references.join(' ');
=======
    for (const [k, v] of Object.entries(args.headers)) {
      form.append(`h:${k}`, v);
    }
>>>>>>> parent of b4f42cb (Implemented detailed tasks)
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
<<<<<<< HEAD
        html: body.html,
        text: body.text,
        headers: {
          'X-Client-Email-Id': emailCommId,
        },
        customArgs: {
          user_id: user.id,
          email_comm_id: emailCommId,
          client_id: body.client_id || '',
          lead_id: body.lead_id || '',
        },
        user,
        in_reply_to_message_id: body.in_reply_to_message_id,
        references: body.references,
      });
      console.log('SendGrid response:', sg);
    } catch (sendGridError) {
      console.error('SendGrid error:', sendGridError);
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: String(sendGridError?.message ?? sendGridError),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to insert into database, but don't fail the entire request if this fails
    try {
      const { error: insertError } = await supabaseAdmin
        .from('email_communications')
        .insert({
          id: emailCommId,
          user_id: user.id,
          client_id: body.client_id ?? null,
          lead_id: body.lead_id ?? null,
          sendgrid_message_id: sg.id,
          direction: 'sent',
          subject: body.subject,
          body_text: body.text ?? null,
          body_html: body.html ?? null,
          sender_email: createUserEmail(userIdentifier, SENDGRID_DOMAIN),
          recipient_email: body.to,
          status: 'sent',
          signature_used: body.signature_used ?? null,
          in_reply_to_message_id: body.in_reply_to_message_id ?? null,
          references: body.references ?? null,
        });

      if (insertError) {
        console.error('Database insertion error:', insertError);
        // Log the error but don't fail the request since email was sent successfully
      } else {
        console.log('Email communication record inserted successfully');
      }
    } catch (dbError) {
      console.error('Database insertion failed:', dbError);
      // Log the error but don't fail the request since email was sent successfully
    }

    // Return success since email was sent successfully
    return new Response(
      JSON.stringify({
        id: sg.id,
=======
        body_text: body.text ?? null,
        body_html: body.html ?? null,
        sender_email: body.from,
        recipient_email: body.to,
>>>>>>> parent of b4f42cb (Implemented detailed tasks)
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
