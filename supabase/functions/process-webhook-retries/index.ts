// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Retry configuration
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 1000; // 1 second
const MAX_BACKOFF_MS = 300000; // 5 minutes
const BACKOFF_MULTIPLIER = 2;

// Structured logging helper
function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, any>
) {
  console.log(
    JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    })
  );
}

// Calculate exponential backoff delay
function calculateBackoffDelay(attemptNumber: number): number {
  const delay = Math.min(
    INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attemptNumber - 1),
    MAX_BACKOFF_MS
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

// Process a single webhook retry
async function processWebhookRetry(retry: any): Promise<{
  success: boolean;
  shouldRetry: boolean;
  error?: string;
}> {
  const { id, webhook_type, payload, attempt_count, original_error } = retry;

  log('info', 'Processing webhook retry', {
    retryId: id,
    webhookType: webhook_type,
    attemptCount: attempt_count,
  });

  try {
    // Determine which webhook function to call based on type
    let functionName: string;
    switch (webhook_type) {
      case 'sendgrid':
        functionName = 'sendgrid-webhook';
        break;
      case 'inbound':
        functionName = 'inbound-email';
        break;
      default:
        log('error', 'Unknown webhook type', {
          retryId: id,
          webhookType: webhook_type,
        });
        return {
          success: false,
          shouldRetry: false,
          error: 'Unknown webhook type',
        };
    }

    // Call the webhook function
    const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      log('warn', 'Webhook retry failed', {
        retryId: id,
        functionName,
        attemptCount: attempt_count,
        error: error.message,
      });

      // Determine if we should retry based on error type
      const shouldRetry = attempt_count < MAX_RETRY_ATTEMPTS;

      return {
        success: false,
        shouldRetry,
        error: error.message,
      };
    }

    log('info', 'Webhook retry succeeded', {
      retryId: id,
      functionName,
      attemptCount: attempt_count,
    });

    return { success: true, shouldRetry: false };
  } catch (error) {
    log('error', 'Exception during webhook retry', {
      retryId: id,
      attemptCount: attempt_count,
      error: String(error),
    });

    return {
      success: false,
      shouldRetry: attempt_count < MAX_RETRY_ATTEMPTS,
      error: String(error),
    };
  }
}

// Main handler
async function handler(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  log('info', 'Webhook retry processor started', { requestId });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log('error', 'Server not configured', { requestId });
    return new Response('Server not configured', { status: 500 });
  }

  const nowIso = new Date().toISOString();

  try {
    // Fetch pending retries that are due for processing
    const { data: pendingRetries, error: fetchErr } = await supabaseAdmin
      .from('webhook_retry_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', nowIso)
      .order('next_retry_at', { ascending: true })
      .limit(50); // Process up to 50 retries per invocation

    if (fetchErr) {
      log('error', 'Error fetching pending retries', {
        requestId,
        error: fetchErr.message,
      });
      throw fetchErr;
    }

    if (!pendingRetries || pendingRetries.length === 0) {
      log('info', 'No pending retries to process', { requestId });
      return new Response(
        JSON.stringify({ message: 'No pending retries', processed: 0 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    log('info', 'Processing pending retries', {
      requestId,
      count: pendingRetries.length,
    });

    let successCount = 0;
    let failureCount = 0;
    let deadLetterCount = 0;

    for (const retry of pendingRetries) {
      const result = await processWebhookRetry(retry);

      if (result.success) {
        // Mark as completed
        await supabaseAdmin
          .from('webhook_retry_queue')
          .update({
            status: 'completed',
            completed_at: nowIso,
            last_error: null,
          })
          .eq('id', retry.id);

        successCount++;
      } else if (result.shouldRetry) {
        // Schedule next retry with exponential backoff
        const nextAttempt = retry.attempt_count + 1;
        const backoffMs = calculateBackoffDelay(nextAttempt);
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

        await supabaseAdmin
          .from('webhook_retry_queue')
          .update({
            attempt_count: nextAttempt,
            next_retry_at: nextRetryAt,
            last_error: result.error || null,
            updated_at: nowIso,
          })
          .eq('id', retry.id);

        log('info', 'Retry scheduled', {
          requestId,
          retryId: retry.id,
          nextAttempt,
          nextRetryAt,
          backoffMs,
        });

        failureCount++;
      } else {
        // Move to dead letter queue
        await supabaseAdmin
          .from('webhook_retry_queue')
          .update({
            status: 'failed',
            completed_at: nowIso,
            last_error: result.error || 'Max retries exceeded',
          })
          .eq('id', retry.id);

        // Insert into dead letter queue for manual review
        await supabaseAdmin.from('webhook_dead_letter_queue').insert({
          webhook_type: retry.webhook_type,
          payload: retry.payload,
          original_error: retry.original_error,
          last_error: result.error || 'Max retries exceeded',
          attempt_count: retry.attempt_count,
          created_at: retry.created_at,
          failed_at: nowIso,
        });

        log('warn', 'Webhook moved to dead letter queue', {
          requestId,
          retryId: retry.id,
          attemptCount: retry.attempt_count,
          error: result.error,
        });

        deadLetterCount++;
      }
    }

    log('info', 'Webhook retry processing completed', {
      requestId,
      total: pendingRetries.length,
      success: successCount,
      failures: failureCount,
      deadLetter: deadLetterCount,
    });

    return new Response(
      JSON.stringify({
        message: 'Webhook retries processed',
        processed: pendingRetries.length,
        success: successCount,
        failures: failureCount,
        deadLetter: deadLetterCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    log('error', 'Webhook retry processor exception', {
      requestId,
      error: String(e?.message ?? e),
      stack: e?.stack,
    });

    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Set up cron job to run every 2 minutes
Deno.cron('process-webhook-retries', '*/2 * * * *', async () => {
  log('info', 'Cron job triggered for webhook retry processing');
  try {
    const response = await handler(new Request('http://localhost'));
    const result = await response.json();
    log('info', 'Cron job completed', result);
  } catch (error) {
    log('error', 'Cron job failed', { error: String(error) });
  }
});

// Also set up cron job to clean up old completed retries daily at 3 AM
Deno.cron('cleanup-webhook-retries', '0 3 * * *', async () => {
  log('info', 'Cron job triggered for webhook retry cleanup');
  try {
    const { data: deletedCount, error } = await supabaseAdmin.rpc(
      'cleanup_old_webhook_retries'
    );

    if (error) {
      log('error', 'Cleanup failed', { error: error.message });
    } else {
      log('info', 'Cleanup completed', { deletedCount });
    }
  } catch (error) {
    log('error', 'Cleanup cron job failed', { error: String(error) });
  }
});

Deno.serve(handler);
