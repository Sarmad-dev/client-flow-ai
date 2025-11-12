// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

type SendEmailRequest = {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  client_id?: string | null;
  lead_id?: string | null;
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const SENDGRID_DOMAIN = Deno.env.get('SENDGRID_DOMAIN') ?? '';
const SENDGRID_DEFAULT_NAME =
  Deno.env.get('SENDGRID_DEFAULT_NAME') ?? 'NexaSuit';
const SENDGRID_BASE_URL = 'https://api.sendgrid.com/v3';

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

function createUserEmail(userIdentifier: string, domain: string): string {
  // Clean the user identifier to be email-safe
  const cleanIdentifier = userIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '') // Remove non-alphanumeric chars except dots and hyphens
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 30); // Limit length

  return `${cleanIdentifier}@${domain}`;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function getUserDisplayName(user: any, fromName?: string): string {
  if (fromName && fromName.trim()) return fromName.trim();

  // Try to extract name from user metadata
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (fullName) return fullName;

  // Fallback to email username or default
  const emailUsername = user?.email?.split('@')[0];
  if (emailUsername) {
    return emailUsername
      .split(/[._-]/)
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  return SENDGRID_DEFAULT_NAME;
}

async function sendWithSendGrid(args: {
  to: string;
  fromIdentifier: string;
  fromName?: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  customArgs?: Record<string, string>;
  user?: any;
}) {
  // Validate required fields
  if (!args.to || !isValidEmail(args.to)) {
    throw new Error('Invalid recipient email address');
  }

  if (!args.subject || args.subject.trim().length === 0) {
    throw new Error('Subject is required');
  }

  if (!args.html && !args.text) {
    throw new Error('Either HTML or text content is required');
  }

  // Create dynamic sender email using user identifier + domain
  const senderEmail = createUserEmail(args.fromIdentifier, SENDGRID_DOMAIN);
  const senderName = getUserDisplayName(args.user, args.fromName);

  // Validate sender email format
  if (!isValidEmail(senderEmail)) {
    throw new Error(`Invalid sender email format: ${senderEmail}`);
  }

  // Ensure custom_args values are strings (SendGrid requirement)
  const customArgs = args.customArgs || {};
  const stringCustomArgs: Record<string, string> = {};
  for (const [key, value] of Object.entries(customArgs)) {
    stringCustomArgs[key] = String(value);
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: args.to }],
        subject: args.subject,
        custom_args: stringCustomArgs,
      },
    ],
    from: {
      email: senderEmail,
      name: senderName,
    },
    content: [] as Array<{ type: string; value: string }>,
    tracking_settings: {
      click_tracking: { enable: true, enable_text: false },
      open_tracking: { enable: true },
      subscription_tracking: { enable: false },
    },
    mail_settings: {
      sandbox_mode: { enable: false },
    },
  };

  // Set reply-to to the same dynamic sender email for proper reply tracking
  payload.reply_to = { email: senderEmail };

  // Add custom headers if provided
  if (args.headers) {
    payload.headers = args.headers;
  }

  // Add content in correct order: text/plain first, then text/html
  if (args.text) {
    payload.content.push({ type: 'text/plain', value: args.text });
  }
  if (args.html) {
    payload.content.push({ type: 'text/html', value: args.html });
  }

  // Ensure at least one content type is present
  if (payload.content.length === 0) {
    payload.content.push({ type: 'text/plain', value: args.subject });
  }

  console.log('SendGrid payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${SENDGRID_BASE_URL}/mail/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('SendGrid response status:', res.status);
  console.log(
    'SendGrid response headers:',
    Object.fromEntries(res.headers.entries())
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error('SendGrid error response:', errorText);
    throw new Error(`SendGrid error (${res.status}): ${errorText}`);
  }

  // SendGrid returns X-Message-Id header for tracking
  const messageId = res.headers.get('X-Message-Id') || crypto.randomUUID();
  return { id: messageId, message: 'Queued. Thank you.' };
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (
    !SENDGRID_API_KEY ||
    !SENDGRID_DOMAIN ||
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

  // Create user-specific sender identifier
  const userIdentifier =
    body.from || user.email?.split('@')[0] || user.id.substring(0, 8);
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

    console.log('Attempting to send email via SendGrid...');
    let sg;
    try {
      sg = await sendWithSendGrid({
        to: body.to,
        fromIdentifier: userIdentifier,
        fromName: body.from,
        subject: body.subject,
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
        status: 'sent',
        message: 'Email sent successfully',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
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
