// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  encryptEmailData,
  isEncryptionSupported,
} from '../_shared/encryption.ts';

type ScheduleEmailRequest = {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  client_id?: string | null;
  lead_id?: string | null;
  signature_used?: string | null;
  in_reply_to_message_id?: string | null;
  references?: string[] | null;
  scheduled_at: string; // ISO timestamp
};

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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Server not configured', { status: 500 });
  }

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

  // Get user from token
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return unauthorized('Invalid user');
  }

  let body: ScheduleEmailRequest;
  try {
    body = (await req.json()) as ScheduleEmailRequest;
  } catch {
    return badRequest('Invalid JSON');
  }

  // Validate required fields
  if (!body.to || !body.subject || (!body.html && !body.text)) {
    return badRequest('Missing required fields: to, subject, (html or text)');
  }

  if (!body.scheduled_at) {
    return badRequest('Missing required field: scheduled_at');
  }

  // Validate email format
  if (!isValidEmail(body.to)) {
    return badRequest('Invalid email format');
  }

  // Validate scheduled_at is in the future
  const scheduledDate = new Date(body.scheduled_at);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return badRequest('scheduled_at must be a valid future date');
  }

  try {
    // Generate unique email ID
    const emailCommId = crypto.randomUUID();

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Scheduling encrypted email',
        emailId: emailCommId,
        userId: user.id,
        recipient: body.to,
        scheduledAt: body.scheduled_at,
        timestamp: new Date().toISOString(),
      })
    );

    // Encrypt sensitive email data before storing
    const encryptedData = await encryptEmailData(
      {
        subject: body.subject,
        body_text: body.text || null,
        body_html: body.html || null,
      },
      user.id
    );

    // Check suppression list to prevent scheduling to suppressed addresses
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
          message: 'Email scheduling blocked - recipient is suppressed',
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

    // Insert scheduled email record with encrypted content
    const { error: insertError } = await supabaseAdmin
      .from('email_communications')
      .insert({
        id: emailCommId,
        user_id: user.id,
        client_id: body.client_id ?? null,
        lead_id: body.lead_id ?? null,
        direction: 'sent',
        subject: encryptedData.subject, // Encrypted
        body_text: encryptedData.body_text, // Encrypted
        body_html: encryptedData.body_html, // Encrypted
        recipient_email: body.to,
        sender_email: null, // Will be set when actually sent
        status: 'scheduled',
        is_scheduled: true,
        scheduled_at: body.scheduled_at,
        signature_used: body.signature_used ?? null,
        in_reply_to_message_id: body.in_reply_to_message_id ?? null,
        references: body.references ?? null,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Failed to insert scheduled email',
          error: insertError.message,
          emailId: emailCommId,
          userId: user.id,
          timestamp: new Date().toISOString(),
        })
      );
      throw insertError;
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Email scheduled successfully with encryption',
        emailId: emailCommId,
        userId: user.id,
        scheduledAt: body.scheduled_at,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        id: emailCommId,
        message: 'Email scheduled successfully',
        scheduled_at: body.scheduled_at,
        recipient_email: body.to,
        status: 'scheduled',
        encrypted: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Failed to schedule email',
        error: error?.message || String(error),
        userId: user.id,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        error: 'Failed to schedule email',
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
