// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  encryptEmailData,
  isEncryptionSupported,
} from '../_shared/encryption.ts';

type SendEmailRequest = {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  client_id?: string | null;
  lead_id?: string | null;
  signature_used?: string | null;
  in_reply_to_message_id?: string | null;
  references?: string[] | null;
  user_id?: string | null;
  email_comm_id?: string | null;
  _encryption_method?: 'client' | 'server';
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
  const cleanIdentifier = userIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 30);

  return `${cleanIdentifier}@${domain}`;
}

function getUserDisplayName(user: any, fromName?: string): string {
  if (fromName && fromName.trim()) return fromName.trim();

  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (fullName) return fullName;

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
  in_reply_to_message_id?: string | null;
  references?: string[] | null;
}) {
  const fromEmail = createUserEmail(args.fromIdentifier, SENDGRID_DOMAIN);
  const displayName = getUserDisplayName(args.user, args.fromName);

  const payload: any = {
    personalizations: [
      {
        to: [{ email: args.to }],
        subject: args.subject,
      },
    ],
    from: {
      email: fromEmail,
      name: displayName,
    },
    content: [],
    tracking_settings: {
      click_tracking: { enable: true },
      open_tracking: { enable: true },
    },
  };

  if (args.text) {
    payload.content.push({
      type: 'text/plain',
      value: args.text,
    });
  }
  if (args.html) {
    payload.content.push({
      type: 'text/html',
      value: args.html,
    });
  }

  if (args.headers) {
    payload.headers = args.headers;
  } else {
    payload.headers = {};
  }

  if (args.in_reply_to_message_id) {
    payload.headers['In-Reply-To'] = args.in_reply_to_message_id;
  }

  if (args.references && args.references.length > 0) {
    payload.headers['References'] = args.references.join(' ');
  }

  if (args.customArgs) {
    payload.custom_args = args.customArgs;
  }

  const res = await fetch(`${SENDGRID_BASE_URL}/mail/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('SendGrid error response:', errorText);
    throw new Error(`SendGrid error (${res.status}): ${errorText}`);
  }

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

  // Check if encryption is supported
  if (!isEncryptionSupported()) {
    return new Response(
      JSON.stringify({
        error: 'Server-side encryption not supported in this environment',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized();
  }
  const token = authHeader.replace('Bearer ', '');

  const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

  let user: any = null;

  if (isServiceRole) {
    const tempBody = await req.clone().json();
    if (tempBody.user_id) {
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(tempBody.user_id);
      if (userError || !userData) {
        return unauthorized('Invalid user_id');
      }
      user = userData.user;
    } else {
      return badRequest('user_id required for service role requests');
    }
  } else {
    const {
      data: { user: tokenUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !tokenUser) {
      return unauthorized('Invalid user');
    }
    user = tokenUser;
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

  const userIdentifier =
    body.from || user.email?.split('@')[0] || user.id.substring(0, 8);
  const senderEmail = createUserEmail(userIdentifier, SENDGRID_DOMAIN);
  const emailCommId = body.email_comm_id || crypto.randomUUID();
  const isScheduledEmail = !!body.email_comm_id;

  try {
    // Check suppression list
    const { data: suppress } = await supabaseAdmin
      .from('suppression_list')
      .select('id, reason')
      .eq('user_id', user.id)
      .eq('email', body.to.toLowerCase())
      .maybeSingle();

    if (suppress) {
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Email blocked - recipient is suppressed',
          userId: user.id,
          recipientEmail: body.to,
          suppressionReason: suppress.reason,
          timestamp: new Date().toISOString(),
        })
      );
      return badRequest(
        `Recipient is suppressed (${suppress.reason || 'unknown reason'})`
      );
    }

    // Encrypt email content using shared encryption utility
    console.log('Performing server-side encryption for user:', user.id);

    let encryptedData;
    try {
      encryptedData = await encryptEmailData(
        {
          subject: body.subject,
          body_text: body.text || null,
          body_html: body.html || null,
        },
        user.id
      );

      console.log('Encrypted Data: ', encryptedData);
    } catch (encryptionError) {
      console.error('Encryption failed:', encryptionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to encrypt email content',
          details: encryptionError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attempting to send email via SendGrid...');
    let sg;
    try {
      sg = await sendWithSendGrid({
        to: body.to,
        fromIdentifier: userIdentifier,
        fromName: body.from,
        subject: body.subject, // Send original subject to SendGrid for delivery
        html: body.html, // Send original content to SendGrid for delivery
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

    // Store encrypted content in database
    try {
      if (isScheduledEmail) {
        const { error: updateError } = await supabaseAdmin
          .from('email_communications')
          .update({
            sendgrid_message_id: sg.id,
            sender_email: senderEmail,
            status: 'sent',
            is_scheduled: false,
            scheduled_at: null,
            sent_at: new Date().toISOString(),
          })
          .eq('id', emailCommId);

        if (updateError) {
          console.error('Database update error:', updateError);
        } else {
          console.log('Scheduled email record updated successfully');
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('email_communications')
          .insert({
            id: emailCommId,
            user_id: user.id,
            client_id: body.client_id ?? null,
            lead_id: body.lead_id ?? null,
            sendgrid_message_id: sg.id,
            direction: 'sent',
            subject: encryptedData.subject, // Store encrypted subject
            body_text: encryptedData.body_text, // Store encrypted text
            body_html: encryptedData.body_html, // Store encrypted HTML
            sender_email: senderEmail,
            recipient_email: body.to,
            status: 'sent',
            signature_used: body.signature_used ?? null,
            in_reply_to_message_id: body.in_reply_to_message_id ?? null,
            references: body.references ?? null,
          });

        if (insertError) {
          console.error('Database insertion error:', insertError);
        } else {
          console.log(
            'Email communication record inserted successfully (server-side encrypted)'
          );
        }
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
    }

    return new Response(
      JSON.stringify({
        id: sg.id,
        emailId: emailCommId,
        messageId: sg.id,
        sender_email: senderEmail,
        recipient_email: body.to,
        status: 'sent',
        encryption_method: 'server',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        details: String(error?.message ?? error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
