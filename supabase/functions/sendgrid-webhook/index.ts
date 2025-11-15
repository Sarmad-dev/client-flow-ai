// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SENDGRID_WEBHOOK_VERIFY_KEY =
  Deno.env.get('SENDGRID_WEBHOOK_VERIFY_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function badRequest(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Verify SendGrid webhook signature
async function verifySendGridSignature(
  payload: string,
  signature: string,
  timestamp: string
) {
  if (!SENDGRID_WEBHOOK_VERIFY_KEY) return true; // Skip verification if no key set

  const data = new TextEncoder().encode(payload + timestamp);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SENDGRID_WEBHOOK_VERIFY_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, data);
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Server not configured', { status: 500 });
  }

  let events: any[] = [];
  const rawBody = await req.text();

  try {
    // SendGrid sends events as JSON array
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return badRequest('Invalid JSON payload');
  }

  // Verify signature if webhook verification is enabled
  if (SENDGRID_WEBHOOK_VERIFY_KEY) {
    const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
    const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

    if (!signature || !timestamp) {
      return badRequest('Missing signature headers');
    }

    const isValid = await verifySendGridSignature(
      rawBody,
      signature,
      timestamp
    );
    if (!isValid) {
      return badRequest('Invalid signature');
    }
  }

  const nowIso = new Date().toISOString();

  try {
    for (const event of events) {
      const eventType = event.event as string;
      const messageId = event.sg_message_id as string;
      const userId = event.user_id || event.unique_args?.user_id;
      const emailCommId =
        event.email_comm_id || event.unique_args?.email_comm_id;

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

          if (profileErr) throw profileErr;
          if (!profile?.user_id) {
            continue; // Skip unknown recipients
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
          if (insertErr) throw insertErr;

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

              console.log(
                JSON.stringify({
                  level: 'info',
                  message: 'Contact unenrolled from sequence due to reply',
                  enrollmentId: lastSent.sequence_enrollment_id,
                  contactEmail: sender,
                  timestamp: nowIso,
                })
              );
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
        case 'delivered':
          update.status = 'delivered';
          break;
        case 'open':
          update.opened_at = eventTimestamp;
          update.status = 'opened';
          break;
        case 'click':
          update.clicked_at = eventTimestamp;
          update.status = 'clicked';
          break;
        case 'bounce':
        case 'dropped':
          update.status = 'failed';

          // Handle hard bounces - add to suppression list and stop sequences
          if (
            event.type === 'bounce' &&
            event.bounce_classification === 'hard'
          ) {
            if (userId && event.email) {
              await supabaseAdmin.from('suppression_list').upsert({
                user_id: userId,
                email: event.email,
                reason: 'hard_bounce',
                created_at: nowIso,
              });

              // Stop all active sequences for this contact
              await supabaseAdmin
                .from('sequence_enrollments')
                .update({ status: 'cancelled' })
                .eq('user_id', userId)
                .eq('contact_email', event.email.toLowerCase())
                .eq('status', 'active');

              console.log(
                JSON.stringify({
                  level: 'info',
                  message:
                    'Hard bounce detected - contact suppressed and unenrolled',
                  userId,
                  contactEmail: event.email,
                  timestamp: nowIso,
                })
              );
            }
          }
          break;
        case 'spamreport':
          update.status = 'complained';
          break;
        case 'unsubscribe':
          // Add to suppression list
          if (userId && event.email) {
            await supabaseAdmin.from('suppression_list').upsert({
              user_id: userId,
              email: event.email,
              reason: 'unsubscribe',
              created_at: nowIso,
            });

            // Stop all active sequences for this contact
            await supabaseAdmin
              .from('sequence_enrollments')
              .update({ status: 'cancelled' })
              .eq('user_id', userId)
              .eq('contact_email', event.email.toLowerCase())
              .eq('status', 'active');

            console.log(
              JSON.stringify({
                level: 'info',
                message:
                  'Contact unsubscribed and unenrolled from all sequences',
                userId,
                contactEmail: event.email,
                timestamp: nowIso,
              })
            );
          }
          break;
        default:
          // Log unknown events for debugging
          console.log('Unknown SendGrid event:', eventType, event);
          break;
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
          // Skip update if we can't identify the record
          continue;
        }

        const { error } = await updateQuery;
        if (error) {
          console.error('Error updating email communication:', error);
        }
      }

      // Store event in email_events table for detailed tracking
      if (userId && (messageId || emailCommId)) {
        const { data: emailComm } = await supabaseAdmin
          .from('email_communications')
          .select('id')
          .or(
            messageId
              ? `sendgrid_message_id.eq.${messageId}`
              : `id.eq.${emailCommId}`
          )
          .maybeSingle();

        if (emailComm?.id) {
          await supabaseAdmin.from('email_events').insert({
            user_id: userId,
            email_communication_id: emailComm.id,
            event_type: eventType,
            occurred_at: eventTimestamp,
            metadata: {
              sg_event_id: event.sg_event_id,
              sg_message_id: messageId,
              url: event.url,
              useragent: event.useragent,
              ip: event.ip,
            },
          });
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e: any) {
    console.error('SendGrid webhook error:', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(handler);
