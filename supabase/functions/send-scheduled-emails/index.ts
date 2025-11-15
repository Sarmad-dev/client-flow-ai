// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Maximum number of retry attempts for failed emails
const MAX_RETRY_ATTEMPTS = 3;

// Batch size for processing scheduled emails
const BATCH_SIZE = 50;

interface ScheduledEmailRecord {
  id: string;
  user_id: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  recipient_email: string | null;
  client_id: string | null;
  lead_id: string | null;
  signature_used: string | null;
  retry_count?: number;
}

interface ProcessingResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Process a single scheduled email
 */
async function processScheduledEmail(
  email: ScheduledEmailRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Processing scheduled email',
        emailId: email.id,
        userId: email.user_id,
        recipient: email.recipient_email,
        timestamp: new Date().toISOString(),
      })
    );

    // Get user for the scheduled email
    const { data: user, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(email.user_id);

    if (userErr || !user) {
      const errorMsg = `Failed to get user: ${
        userErr?.message || 'User not found'
      }`;
      console.error(
        JSON.stringify({
          level: 'error',
          message: errorMsg,
          emailId: email.id,
          userId: email.user_id,
          timestamp: new Date().toISOString(),
        })
      );
      return { success: false, error: errorMsg };
    }

    // Invoke send-email function with service role key
    // The send-email function will handle authentication and updating the record
    const { data: sendResult, error: funcErr } =
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: email.recipient_email,
          subject: email.subject || '(no subject)',
          html: email.body_html,
          text: email.body_text,
          client_id: email.client_id,
          lead_id: email.lead_id,
          signature_used: email.signature_used,
          from: user.user?.email?.split('@')[0] || 'scheduled',
          user_id: email.user_id, // Pass user_id for proper attribution
          email_comm_id: email.id, // Pass email ID to update existing record
        },
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

    if (funcErr) {
      const errorMsg = `Send function error: ${
        funcErr.message || 'Unknown error'
      }`;
      console.error(
        JSON.stringify({
          level: 'error',
          message: errorMsg,
          emailId: email.id,
          userId: email.user_id,
          timestamp: new Date().toISOString(),
        })
      );
      return { success: false, error: errorMsg };
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Scheduled email sent successfully',
        emailId: email.id,
        userId: email.user_id,
        sendGridMessageId: sendResult?.messageId,
        timestamp: new Date().toISOString(),
      })
    );

    return { success: true };
  } catch (e) {
    const errorMsg = `Unexpected error: ${
      e instanceof Error ? e.message : String(e)
    }`;
    console.error(
      JSON.stringify({
        level: 'error',
        message: errorMsg,
        emailId: email.id,
        userId: email.user_id,
        timestamp: new Date().toISOString(),
      })
    );
    return { success: false, error: errorMsg };
  }
}

/**
 * Handle failed email with retry logic
 */
async function handleFailedEmail(
  emailId: string,
  retryCount: number,
  error?: string
): Promise<void> {
  try {
    // Check if we should retry or mark as failed
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      // Max retries reached, mark as failed
      await supabaseAdmin
        .from('email_communications')
        .update({
          status: 'failed',
          is_scheduled: false,
          scheduled_at: null,
        })
        .eq('id', emailId);

      console.log(
        JSON.stringify({
          level: 'warn',
          message: 'Email marked as failed after max retries',
          emailId,
          retryCount,
          error,
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      // Schedule for retry with exponential backoff
      const retryDelayMinutes = Math.pow(2, retryCount) * 5; // 5, 10, 20 minutes
      const nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);

      await supabaseAdmin
        .from('email_communications')
        .update({
          scheduled_at: nextRetryAt.toISOString(),
        })
        .eq('id', emailId);

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Email scheduled for retry',
          emailId,
          retryCount: retryCount + 1,
          nextRetryAt: nextRetryAt.toISOString(),
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (e) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Failed to handle failed email',
        emailId,
        error: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * Main handler function
 */
async function handler(): Promise<Response> {
  const startTime = Date.now();
  const now = new Date().toISOString();

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Starting scheduled email processing',
      timestamp: now,
    })
  );

  const result: ProcessingResult = {
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Fetch scheduled emails that are due
    const { data: scheduledEmails, error: fetchError } = await supabaseAdmin
      .from('email_communications')
      .select(
        'id, user_id, subject, body_html, body_text, recipient_email, client_id, lead_id, signature_used'
      )
      .lte('scheduled_at', now)
      .eq('is_scheduled', true)
      .eq('status', 'scheduled')
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Failed to fetch scheduled emails',
          error: fetchError.message,
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(
        JSON.stringify({ error: fetchError.message, result }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    result.total = scheduledEmails?.length || 0;

    if (result.total === 0) {
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'No scheduled emails to process',
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(
        JSON.stringify({ message: 'No emails to process', result }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Processing ${result.total} scheduled emails`,
        timestamp: new Date().toISOString(),
      })
    );

    // Process each scheduled email
    for (const email of scheduledEmails || []) {
      const retryCount = (email as any).retry_count || 0;
      const processResult = await processScheduledEmail(email);

      if (processResult.success) {
        result.sent++;
        // Email status is updated by send-email function
      } else {
        result.failed++;
        result.errors.push({
          id: email.id,
          error: processResult.error || 'Unknown error',
        });

        // Handle retry logic for failed emails
        await handleFailedEmail(email.id, retryCount, processResult.error);
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Scheduled email processing completed',
        result,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Processing completed',
        result,
        durationMs: duration,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Unexpected error in handler',
        error,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error,
        result,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
