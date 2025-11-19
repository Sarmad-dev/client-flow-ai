// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SENDGRID_WEBHOOK_VERIFY_KEY =
  Deno.env.get('SENDGRID_WEBHOOK_VERIFY_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Supported SendGrid event types
const SUPPORTED_EVENT_TYPES = [
  'processed',
  'deferred',
  'delivered',
  'open',
  'click',
  'bounce',
  'dropped',
  'spamreport',
  'unsubscribe',
  'group_unsubscribe',
  'group_resubscribe',
] as const;

type SendGridEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

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

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Enhanced signature verification with timing attack protection
async function verifySendGridSignature(
  payload: string,
  signature: string,
  timestamp: string
): Promise<{ valid: boolean; error?: string }> {
  if (!SENDGRID_WEBHOOK_VERIFY_KEY) {
    log(
      'warn',
      'Webhook verification key not configured - skipping validation'
    );
    return { valid: true };
  }

  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing signature or timestamp' };
  }

  // Verify timestamp is recent (within 10 minutes) to prevent replay attacks
  const eventTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - eventTime);

  if (timeDiff > 600) {
    // 10 minutes
    return {
      valid: false,
      error: `Timestamp too old or invalid: ${timeDiff}s difference`,
    };
  }

  try {
    const data = new TextEncoder().encode(timestamp + payload);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SENDGRID_WEBHOOK_VERIFY_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const sig = await crypto.subtle.sign('HMAC', key, data);
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Use constant-time comparison to prevent timing attacks
    const signatureBytes = new TextEncoder().encode(signature.toLowerCase());
    const expectedBytes = new TextEncoder().encode(expected);

    if (signatureBytes.length !== expectedBytes.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    let result = 0;
    for (let i = 0; i < signatureBytes.length; i++) {
      result |= signatureBytes[i] ^ expectedBytes[i];
    }

    if (result !== 0) {
      return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
  } catch (error) {
    log('error', 'Signature verification error', {
      error: String(error),
    });
    return { valid: false, error: 'Signature verification exception' };
  }
}

// Check if event has already been processed (deduplication)
async function isEventProcessed(
  sgEventId: string,
  sgMessageId: string
): Promise<boolean> {
  if (!sgEventId) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from('email_events')
      .select('id')
      .eq('metadata->>sg_event_id', sgEventId)
      .maybeSingle();

    if (error) {
      log('warn', 'Error checking event deduplication', {
        sgEventId,
        error: error.message,
      });
      return false;
    }

    return !!data;
  } catch (error) {
    log('error', 'Exception in event deduplication check', {
      sgEventId,
      error: String(error),
    });
    return false;
  }
}

async function handler(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  log('info', 'Webhook request received', {
    requestId,
    method: req.method,
    contentType: req.headers.get('content-type'),
  });

  if (req.method !== 'POST') {
    log('warn', 'Invalid method', { requestId, method: req.method });
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log('error', 'Server not configured', { requestId });
    return new Response('Server not configured', { status: 500 });
  }

  let events: any[] = [];
  const rawBody = await req.text();

  try {
    // SendGrid sends events as JSON array
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : [parsed];
    log('info', 'Parsed webhook payload', {
      requestId,
      eventCount: events.length,
    });
  } catch (error) {
    log('error', 'Invalid JSON payload', {
      requestId,
      error: String(error),
      bodyPreview: rawBody.substring(0, 200),
    });
    return badRequest('Invalid JSON payload');
  }

  // Enhanced signature verification
  const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
  const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

  const verificationResult = await verifySendGridSignature(
    rawBody,
    signature || '',
    timestamp || ''
  );

  if (!verificationResult.valid) {
    log('error', 'Signature verification failed', {
      requestId,
      error: verificationResult.error,
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
    });
    return badRequest(verificationResult.error || 'Invalid signature');
  }

  const nowIso = new Date().toISOString();
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    for (const event of events) {
      const eventType = event.event as string;
      const messageId = event.sg_message_id as string;
      const sgEventId = event.sg_event_id as string;
      const userId = event.user_id || event.unique_args?.user_id;
      const emailCommId =
        event.email_comm_id || event.unique_args?.email_comm_id;

      // Validate event type
      if (!SUPPORTED_EVENT_TYPES.includes(eventType as SendGridEventType)) {
        log('warn', 'Unsupported event type received', {
          requestId,
          eventType,
          sgEventId,
          sgMessageId: messageId,
        });
        skippedCount++;
        continue;
      }

      // Check for duplicate events
      if (sgEventId && (await isEventProcessed(sgEventId, messageId))) {
        log('info', 'Duplicate event detected - skipping', {
          requestId,
          eventType,
          sgEventId,
          sgMessageId: messageId,
        });
        skippedCount++;
        continue;
      }

      log('info', 'Processing event', {
        requestId,
        eventType,
        sgEventId,
        sgMessageId: messageId,
        userId,
        emailCommId,
      });

      // Handle inbound email events (if using SendGrid Inbound Parse)
      if (eventType === 'inbound' || event.to) {
        const recipient = event.to || event.email;
        const sender = event.from;
        const subject = event.subject || '';
        const bodyText = event.text || '';
        const bodyHtml = event.html || '';

        if (sender && recipient) {
          const local = recipient.split('@')[0]?.toLowerCase();

          // Map alias local-part to a user via profiles.email
          const { data: profile, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('user_id, email')
            .ilike('email', `${local}@%`)
            .maybeSingle();

          if (profileErr) {
            log('error', 'Error fetching profile for inbound email', {
              requestId,
              recipient,
              error: profileErr.message,
            });
            errorCount++;
            continue;
          }

          if (!profile?.user_id) {
            log('warn', 'Unknown recipient for inbound email', {
              requestId,
              recipient,
            });
            skippedCount++;
            continue;
          }

          const { error: insertErr } = await supabaseAdmin
            .from('email_communications')
            .insert({
              user_id: profile.user_id,
              sendgrid_message_id: messageId || null,
              direction: 'received',
              subject: subject || null,
              body_text: bodyText || null,
              body_html: bodyHtml || null,
              lead_id: null,
              client_id: null,
              sender_email: sender,
              recipient_email: recipient,
              status: 'received',
              created_at: nowIso,
            });

          if (insertErr) {
            log('error', 'Error inserting inbound email', {
              requestId,
              sender,
              recipient,
              error: insertErr.message,
            });
            errorCount++;
            continue;
          }

          processedCount++;
          log('info', 'Inbound email processed', {
            requestId,
            sender,
            recipient,
            userId: profile.user_id,
          });

          // Mark the latest sent email to this sender as replied
          const { data: lastSent, error: fetchErr } = await supabaseAdmin
            .from('email_communications')
            .select('id, sequence_enrollment_id')
            .eq('user_id', profile.user_id)
            .eq('direction', 'sent')
            .eq('recipient_email', sender)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!fetchErr && lastSent?.id) {
            await supabaseAdmin
              .from('email_communications')
              .update({ replied_at: nowIso })
              .eq('id', lastSent.id);

            // If this was part of a sequence, unenroll the contact
            if (lastSent.sequence_enrollment_id) {
              await supabaseAdmin
                .from('sequence_enrollments')
                .update({ status: 'cancelled' })
                .eq('id', lastSent.sequence_enrollment_id)
                .eq('status', 'active');

              log('info', 'Contact unenrolled from sequence due to reply', {
                requestId,
                enrollmentId: lastSent.sequence_enrollment_id,
                contactEmail: sender,
              });
            }
          }

          // Also unenroll from any other active sequences for this contact
          await supabaseAdmin
            .from('sequence_enrollments')
            .update({ status: 'cancelled' })
            .eq('user_id', profile.user_id)
            .eq('contact_email', sender.toLowerCase())
            .eq('status', 'active');
        }
        continue;
      }

      // Handle delivery events
      const update: Record<string, any> = {};
      const eventTimestamp = event.timestamp
        ? new Date(event.timestamp * 1000).toISOString()
        : nowIso;

      switch (eventType) {
        case 'processed':
          // Email has been received and is ready to be delivered
          update.status = 'processed';
          log('info', 'Email processed by SendGrid', {
            requestId,
            sgMessageId: messageId,
            eventType,
          });
          break;

        case 'deferred':
          // Recipient server temporarily rejected the message
          update.status = 'deferred';
          log('warn', 'Email delivery deferred', {
            requestId,
            sgMessageId: messageId,
            reason: event.response || 'Unknown',
          });
          break;

        case 'delivered':
          update.status = 'delivered';
          log('info', 'Email delivered', {
            requestId,
            sgMessageId: messageId,
          });
          break;

        case 'open':
          update.opened_at = eventTimestamp;
          update.status = 'opened';
          log('info', 'Email opened', {
            requestId,
            sgMessageId: messageId,
            userAgent: event.useragent,
          });
          break;

        case 'click':
          update.clicked_at = eventTimestamp;
          update.status = 'clicked';
          log('info', 'Email link clicked', {
            requestId,
            sgMessageId: messageId,
            url: event.url,
          });
          break;

        case 'bounce':
        case 'dropped':
          update.status = 'failed';

          // Determine bounce type and reason
          const bounceType = event.bounce_classification || 'soft';
          const bounceReason =
            event.reason || event.response || 'Unknown bounce reason';

          log('warn', 'Email bounced or dropped', {
            requestId,
            sgMessageId: messageId,
            bounceType,
            bounceReason,
            email: event.email,
          });

          // Handle hard bounces - add to suppression list and stop sequences
          if (bounceType === 'hard') {
            if (userId && event.email) {
              const { error: suppressErr } = await supabaseAdmin
                .from('suppression_list')
                .upsert({
                  user_id: userId,
                  email: event.email.toLowerCase(),
                  reason: 'hard_bounce',
                  created_at: nowIso,
                });

              if (suppressErr) {
                log('error', 'Error adding to suppression list', {
                  requestId,
                  email: event.email,
                  error: suppressErr.message,
                });
              }

              // Stop all active sequences for this contact
              const { error: unenrollErr } = await supabaseAdmin
                .from('sequence_enrollments')
                .update({ status: 'cancelled' })
                .eq('user_id', userId)
                .eq('contact_email', event.email.toLowerCase())
                .eq('status', 'active');

              if (unenrollErr) {
                log('error', 'Error unenrolling from sequences', {
                  requestId,
                  email: event.email,
                  error: unenrollErr.message,
                });
              } else {
                log('info', 'Hard bounce - contact suppressed and unenrolled', {
                  requestId,
                  userId,
                  contactEmail: event.email,
                  bounceReason,
                });
              }
            }
          }
          break;

        case 'spamreport':
          update.status = 'complained';
          log('warn', 'Spam complaint received', {
            requestId,
            sgMessageId: messageId,
            email: event.email,
          });

          // Add to suppression list
          if (userId && event.email) {
            await supabaseAdmin.from('suppression_list').upsert({
              user_id: userId,
              email: event.email.toLowerCase(),
              reason: 'spam_complaint',
              created_at: nowIso,
            });

            // Stop all active sequences
            await supabaseAdmin
              .from('sequence_enrollments')
              .update({ status: 'cancelled' })
              .eq('user_id', userId)
              .eq('contact_email', event.email.toLowerCase())
              .eq('status', 'active');
          }
          break;

        case 'unsubscribe':
        case 'group_unsubscribe':
          update.status = 'unsubscribed';
          log('info', 'Contact unsubscribed', {
            requestId,
            sgMessageId: messageId,
            email: event.email,
            eventType,
          });

          // Add to suppression list
          if (userId && event.email) {
            const { error: suppressErr } = await supabaseAdmin
              .from('suppression_list')
              .upsert({
                user_id: userId,
                email: event.email.toLowerCase(),
                reason: 'unsubscribe',
                created_at: nowIso,
              });

            if (suppressErr) {
              log('error', 'Error adding to suppression list', {
                requestId,
                email: event.email,
                error: suppressErr.message,
              });
            }

            // Stop all active sequences for this contact
            const { error: unenrollErr } = await supabaseAdmin
              .from('sequence_enrollments')
              .update({ status: 'cancelled' })
              .eq('user_id', userId)
              .eq('contact_email', event.email.toLowerCase())
              .eq('status', 'active');

            if (unenrollErr) {
              log('error', 'Error unenrolling from sequences', {
                requestId,
                email: event.email,
                error: unenrollErr.message,
              });
            } else {
              log('info', 'Contact unenrolled from all sequences', {
                requestId,
                userId,
                contactEmail: event.email,
              });
            }
          }
          break;

        case 'group_resubscribe':
          log('info', 'Contact resubscribed to group', {
            requestId,
            sgMessageId: messageId,
            email: event.email,
            groupId: event.asm_group_id,
          });
          // No status update needed for resubscribe
          break;

        default:
          log('warn', 'Unhandled event type', {
            requestId,
            eventType,
            sgMessageId: messageId,
          });
          skippedCount++;
          continue;
      }

      // Update email communication record if we have updates
      if (Object.keys(update).length > 0) {
        let updateQuery = supabaseAdmin
          .from('email_communications')
          .update(update);

        // Try to find the record by SendGrid message ID first
        if (messageId) {
          updateQuery = updateQuery.eq('sendgrid_message_id', messageId);
        } else if (emailCommId) {
          // Fallback to our custom email communication ID
          updateQuery = updateQuery.eq('id', emailCommId);
        } else {
          log('warn', 'Cannot identify email record - skipping update', {
            requestId,
            eventType,
            sgEventId,
          });
          skippedCount++;
          continue;
        }

        const { error: updateErr } = await updateQuery;
        if (updateErr) {
          log('error', 'Error updating email communication', {
            requestId,
            eventType,
            sgMessageId: messageId,
            emailCommId,
            error: updateErr.message,
          });
          errorCount++;
        } else {
          processedCount++;
        }
      }

      // Store event in email_events table for detailed tracking
      if (userId && (messageId || emailCommId)) {
        const { data: emailComm, error: fetchErr } = await supabaseAdmin
          .from('email_communications')
          .select('id')
          .or(
            messageId
              ? `sendgrid_message_id.eq.${messageId}`
              : `id.eq.${emailCommId}`
          )
          .maybeSingle();

        if (fetchErr) {
          log('error', 'Error fetching email communication for event', {
            requestId,
            eventType,
            sgMessageId: messageId,
            error: fetchErr.message,
          });
        } else if (emailComm?.id) {
          // Build metadata object with comprehensive event information
          const eventMetadata: any = {
            sg_event_id: sgEventId,
            sg_message_id: messageId,
            url: event.url || null,
            useragent: event.useragent || null,
            ip: event.ip || null,
            timestamp: event.timestamp || null,
          };

          // Add bounce-specific metadata
          if (eventType === 'bounce' || eventType === 'dropped') {
            eventMetadata.bounce_classification =
              event.bounce_classification || 'soft';
            eventMetadata.reason = event.reason || null;
            eventMetadata.response = event.response || null;
            eventMetadata.status = event.status || null;
            eventMetadata.type = event.type || null;
            eventMetadata.smtp_id = event.smtp_id || null;
          }

          // Add spam complaint metadata
          if (eventType === 'spamreport') {
            eventMetadata.asm_group_id = event.asm_group_id || null;
          }

          // Add unsubscribe metadata
          if (
            eventType === 'unsubscribe' ||
            eventType === 'group_unsubscribe'
          ) {
            eventMetadata.asm_group_id = event.asm_group_id || null;
          }

          // Add deferred metadata
          if (eventType === 'deferred') {
            eventMetadata.response = event.response || null;
            eventMetadata.attempt = event.attempt || null;
          }

          const { error: eventErr } = await supabaseAdmin
            .from('email_events')
            .insert({
              user_id: userId,
              email_communication_id: emailComm.id,
              event_type: eventType,
              occurred_at: eventTimestamp,
              metadata: eventMetadata,
            });

          if (eventErr) {
            log('error', 'Error inserting email event', {
              requestId,
              eventType,
              emailCommId: emailComm.id,
              error: eventErr.message,
            });
            errorCount++;
          }
        } else {
          log('warn', 'Email communication not found for event', {
            requestId,
            eventType,
            sgMessageId: messageId,
            emailCommId,
          });
        }
      }
    }

    log('info', 'Webhook processing completed', {
      requestId,
      totalEvents: events.length,
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount,
    });

    // Update metrics
    await supabaseAdmin.rpc('update_webhook_metrics', {
      p_webhook_type: 'sendgrid',
      p_metric_date: new Date().toISOString().split('T')[0],
      p_received: events.length,
      p_processed: processedCount,
      p_failed: errorCount,
    });

    // If there were errors but not a complete failure, still return 200
    // SendGrid will not retry if we return 200
    return new Response('OK', { status: 200 });
  } catch (e: any) {
    log('error', 'Webhook processing exception', {
      requestId,
      error: String(e?.message ?? e),
      stack: e?.stack,
    });

    // Enqueue for retry on critical failures
    try {
      const { data: retryId } = await supabaseAdmin.rpc(
        'enqueue_webhook_retry',
        {
          p_webhook_type: 'sendgrid',
          p_payload: events,
          p_error: String(e?.message ?? e),
        }
      );

      log('info', 'Webhook enqueued for retry', {
        requestId,
        retryId,
      });
    } catch (retryErr) {
      log('error', 'Failed to enqueue webhook for retry', {
        requestId,
        error: String(retryErr),
      });
    }

    // Return 200 to prevent SendGrid from retrying immediately
    // Our retry mechanism will handle it with exponential backoff
    return new Response('OK', { status: 200 });
  }
}

Deno.serve(handler);
