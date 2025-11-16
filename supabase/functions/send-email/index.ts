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
  signature_used?: string | null;
  in_reply_to_message_id?: string | null;
  references?: string[] | null;
  user_id?: string | null; // For scheduled/sequence emails
  email_comm_id?: string | null; // For updating existing scheduled emails
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

  // Add content
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

  // Add custom headers
  if (args.headers) {
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
  }

  // Add custom args for tracking
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

  // Check if this is a service role request
  const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

  let user: any = null;

  if (isServiceRole) {
    // For service role requests (scheduled/sequence emails), get user from body
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
    // For regular user requests, get user from token
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

  // Create user-specific sender identifier
  const userIdentifier =
    body.from || user.email?.split('@')[0] || user.id.substring(0, 8);
  const senderEmail = createUserEmail(userIdentifier, SENDGRID_DOMAIN);

  // Use provided email_comm_id for scheduled emails, or generate new one
  const emailCommId = body.email_comm_id || crypto.randomUUID();
  const isScheduledEmail = !!body.email_comm_id;

  try {
    // Check suppression list to prevent sending to suppressed addresses
    // Addresses are automatically added to suppression list on hard bounces
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

    // Update or insert email communication record
    try {
      if (isScheduledEmail) {
        // Update existing scheduled email record
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
        // Insert new email record
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
          console.log('Email communication record inserted successfully');
        }
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Log the error but don't fail the request since email was sent successfully
    }

    // Return success since email was sent successfully
    return new Response(
      JSON.stringify({
        id: sg.id,
        body_text: body.text ?? null,
        body_html: body.html ?? null,
        sender_email: body.from,
        recipient_email: body.to,
        status: 'sent',
      })
    );
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
}

Deno.serve(handler);
