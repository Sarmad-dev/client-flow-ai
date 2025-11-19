// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SENDGRID_WEBHOOK_VERIFY_KEY =
  Deno.env.get('SENDGRID_WEBHOOK_VERIFY_KEY') ?? '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Spam indicators for basic filtering
const SPAM_KEYWORDS = [
  'viagra',
  'cialis',
  'lottery',
  'winner',
  'congratulations you won',
  'click here now',
  'limited time offer',
  'act now',
  'free money',
  'nigerian prince',
];

const SPAM_SUBJECT_PATTERNS = [
  /\[SPAM\]/i,
  /\*\*\*SPAM\*\*\*/i,
  /RE: RE: RE: RE:/i, // Excessive RE: chains
];

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

function badRequest(msg: string, code = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Enhanced signature verification
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

  // Verify timestamp is recent (within 10 minutes)
  const eventTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - eventTime);

  if (timeDiff > 600) {
    return {
      valid: false,
      error: `Timestamp too old: ${timeDiff}s difference`,
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

    const signatureBytes = new TextEncoder().encode(signature.toLowerCase());
    const expectedBytes = new TextEncoder().encode(expected);

    if (signatureBytes.length !== expectedBytes.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    let result = 0;
    for (let i = 0; i < signatureBytes.length; i++) {
      result |= signatureBytes[i] ^ expectedBytes[i];
    }

    return result === 0
      ? { valid: true }
      : { valid: false, error: 'Signature verification failed' };
  } catch (error) {
    log('error', 'Signature verification error', { error: String(error) });
    return { valid: false, error: 'Signature verification exception' };
  }
}

// Extract email address from various formats
function extractEmailAddress(emailString: string): string {
  if (!emailString) return '';

  // Handle formats like "Name <email@example.com>" or just "email@example.com"
  const match =
    emailString.match(/<([^>]+)>/) || emailString.match(/([^\s]+@[^\s]+)/);
  return match
    ? match[1].trim().toLowerCase()
    : emailString.trim().toLowerCase();
}

// Parse email headers into structured format
function parseHeaders(headersData: any): Record<string, string> {
  const headers: Record<string, string> = {};

  try {
    if (typeof headersData === 'string') {
      // Parse header string format
      const parsed = JSON.parse(headersData);
      if (typeof parsed === 'object') {
        return parsed;
      }
    } else if (typeof headersData === 'object') {
      return headersData;
    }
  } catch {
    // If JSON parsing fails, try to parse as raw header format
    if (typeof headersData === 'string') {
      const lines = headersData.split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
    }
  }

  return headers;
}

// Extract message IDs from headers
function extractMessageIds(headers: Record<string, string>): {
  messageId: string;
  inReplyTo: string;
  references: string[];
} {
  const messageId = (
    headers['Message-ID'] ||
    headers['message-id'] ||
    headers['Message-Id'] ||
    ''
  ).replace(/[<>]/g, '');

  const inReplyTo = (
    headers['In-Reply-To'] ||
    headers['in-reply-to'] ||
    headers['In-Reply-To'] ||
    ''
  ).replace(/[<>]/g, '');

  const referencesStr = headers['References'] || headers['references'] || '';
  const references = referencesStr
    .split(/\s+/)
    .map((t: string) => t.replace(/[<>]/g, ''))
    .filter(Boolean);

  return { messageId, inReplyTo, references };
}

// Basic spam detection
function isLikelySpam(
  subject: string,
  bodyText: string,
  sender: string
): {
  isSpam: boolean;
  reason?: string;
  score: number;
} {
  let spamScore = 0;
  const reasons: string[] = [];

  // Check subject patterns
  for (const pattern of SPAM_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      spamScore += 3;
      reasons.push('Spam pattern in subject');
      break;
    }
  }

  // Check for spam keywords
  const content = (subject + ' ' + bodyText).toLowerCase();
  let keywordMatches = 0;
  for (const keyword of SPAM_KEYWORDS) {
    if (content.includes(keyword)) {
      keywordMatches++;
    }
  }

  if (keywordMatches >= 3) {
    spamScore += 5;
    reasons.push(`Multiple spam keywords (${keywordMatches})`);
  } else if (keywordMatches >= 1) {
    spamScore += 2;
    reasons.push('Spam keywords detected');
  }

  // Check for excessive capitalization
  const capsRatio =
    (subject.match(/[A-Z]/g) || []).length / Math.max(subject.length, 1);
  if (capsRatio > 0.5 && subject.length > 10) {
    spamScore += 2;
    reasons.push('Excessive capitalization');
  }

  // Check for suspicious sender patterns
  if (sender.match(/\d{5,}/)) {
    // Many numbers in email
    spamScore += 1;
    reasons.push('Suspicious sender pattern');
  }

  const isSpam = spamScore >= 5;

  return {
    isSpam,
    reason: isSpam ? reasons.join(', ') : undefined,
    score: spamScore,
  };
}

// Parse attachment metadata from SendGrid Inbound Parse
function parseAttachments(parsedData: any): Array<{
  filename: string;
  contentType: string;
  size: number;
}> {
  const attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
  }> = [];

  try {
    // SendGrid sends attachment info in 'attachment-info' field
    const attachmentInfo = parsedData['attachment-info'];
    if (attachmentInfo) {
      const info =
        typeof attachmentInfo === 'string'
          ? JSON.parse(attachmentInfo)
          : attachmentInfo;

      if (Array.isArray(info)) {
        for (const att of info) {
          attachments.push({
            filename: att.filename || 'unknown',
            contentType:
              att.type || att['content-type'] || 'application/octet-stream',
            size: parseInt(att.size || '0', 10),
          });
        }
      }
    }

    // Also check for individual attachment fields (attachment1, attachment2, etc.)
    let attachmentIndex = 1;
    while (parsedData[`attachment${attachmentIndex}`]) {
      const filename =
        parsedData[`attachment${attachmentIndex}-name`] ||
        `attachment${attachmentIndex}`;
      const contentType =
        parsedData[`attachment${attachmentIndex}-type`] ||
        'application/octet-stream';

      attachments.push({
        filename,
        contentType,
        size: 0, // Size not available in this format
      });

      attachmentIndex++;
    }
  } catch (error) {
    log('warn', 'Error parsing attachments', { error: String(error) });
  }

  return attachments;
}

async function handler(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  log('info', 'Inbound email request received', {
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
    return badRequest('Server not configured', 500);
  }

  const rawBody = await req.text();

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
    });
    return badRequest(verificationResult.error || 'Invalid signature');
  }

  // SendGrid Inbound Parse sends form-data or JSON
  let parsedData: any = {};
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      parsedData = JSON.parse(rawBody);
      log('info', 'Parsed JSON payload', { requestId });
    } else if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with attachments)
      const boundary = contentType.split('boundary=')[1];
      if (boundary) {
        // For now, we'll use URLSearchParams for simple fields
        // Full multipart parsing would require additional library
        log('info', 'Received multipart form data', { requestId });
      }

      const body = new URLSearchParams(rawBody);
      parsedData = {};
      for (const [key, value] of body.entries()) {
        parsedData[key] = value;
      }
    } else {
      // Parse as URL-encoded form data
      const body = new URLSearchParams(rawBody);
      parsedData = {};
      for (const [key, value] of body.entries()) {
        parsedData[key] = value;
      }
      log('info', 'Parsed form-encoded payload', { requestId });
    }
  } catch (error) {
    log('error', 'Invalid payload format', {
      requestId,
      error: String(error),
      contentType,
    });
    return badRequest('Invalid payload format');
  }

  // Extract and normalize email addresses
  const senderRaw = parsedData.from || '';
  const recipientRaw = parsedData.to || '';
  const sender = extractEmailAddress(senderRaw);
  const recipient = extractEmailAddress(recipientRaw);

  const subject = parsedData.subject || '';
  const bodyText = parsedData.text || '';
  const bodyHtml = parsedData.html || '';

  log('info', 'Email details extracted', {
    requestId,
    sender,
    recipient,
    subject,
    hasText: !!bodyText,
    hasHtml: !!bodyHtml,
  });

  // Parse headers with enhanced extraction
  const headers = parseHeaders(parsedData.headers || '{}');
  const { messageId, inReplyTo, references } = extractMessageIds(headers);

  // Parse envelope information
  let envelope: any = {};
  try {
    envelope =
      typeof parsedData.envelope === 'string'
        ? JSON.parse(parsedData.envelope)
        : parsedData.envelope || {};
  } catch {
    log('warn', 'Failed to parse envelope', { requestId });
  }

  // Parse attachments
  const attachments = parseAttachments(parsedData);
  if (attachments.length > 0) {
    log('info', 'Attachments detected', {
      requestId,
      count: attachments.length,
      files: attachments.map((a) => a.filename),
    });
  }

  // Spam filtering
  const spamCheck = isLikelySpam(subject, bodyText, sender);
  if (spamCheck.isSpam) {
    log('warn', 'Potential spam detected', {
      requestId,
      sender,
      subject,
      spamScore: spamCheck.score,
      reason: spamCheck.reason,
    });
    // Still process but mark as potential spam
  }

  const nowIso = new Date().toISOString();

  try {
    // Find the user based on recipient email
    if (!recipient) {
      log('error', 'No recipient email provided', { requestId });
      return badRequest('No recipient email', 400);
    }

    const local = recipient.split('@')[0]?.toLowerCase();

    // Map alias local-part to a user via profiles.email
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .ilike('email', `${local}@%`)
      .maybeSingle();

    if (profileErr) {
      log('error', 'Error fetching profile', {
        requestId,
        recipient,
        error: profileErr.message,
      });
      throw profileErr;
    }

    if (!profile?.user_id) {
      log('warn', 'Unknown recipient', { requestId, recipient });
      return badRequest('Unknown recipient', 404);
    }

    log('info', 'Profile found for recipient', {
      requestId,
      userId: profile.user_id,
      recipient,
    });

    // Check if sender is in suppression list (shouldn't happen but good to check)
    const { data: suppressed } = await supabaseAdmin
      .from('suppression_list')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('email', sender)
      .maybeSingle();

    if (suppressed) {
      log('warn', 'Received email from suppressed sender', {
        requestId,
        sender,
        userId: profile.user_id,
      });
    }

    // Build insert payload with enhanced metadata
    const insertPayload: Record<string, any> = {
      user_id: profile.user_id,
      direction: 'received',
      subject: subject || null,
      body_text: bodyText || null,
      body_html: bodyHtml || null,
      sender_email: sender || null,
      recipient_email: recipient || null,
      status: spamCheck.isSpam ? 'spam' : 'received',
      sendgrid_message_id: messageId || null,
      in_reply_to_message_id: inReplyTo || null,
      references: references.length ? references : null,
      attachment_count: attachments.length,
      total_attachment_size: attachments.reduce((sum, a) => sum + a.size, 0),
      created_at: nowIso,
    };

    // Add spam metadata if detected
    if (spamCheck.isSpam) {
      insertPayload.metadata = {
        spam_score: spamCheck.score,
        spam_reason: spamCheck.reason,
      };
    }

    // Add attachment metadata
    if (attachments.length > 0) {
      insertPayload.metadata = {
        ...insertPayload.metadata,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          size: a.size,
        })),
      };
    }

    const { data: insertedEmail, error: insErr } = await supabaseAdmin
      .from('email_communications')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insErr) {
      log('error', 'Error inserting email communication', {
        requestId,
        error: insErr.message,
      });
      throw insErr;
    }

    log('info', 'Inbound email inserted', {
      requestId,
      emailId: insertedEmail.id,
      isSpam: spamCheck.isSpam,
    });

    // Correlate with original sent email via In-Reply-To or References
    let correlateId: string | null = null;
    if (inReplyTo) correlateId = inReplyTo;
    if (!correlateId && references.length) {
      correlateId = references[references.length - 1];
    }

    if (correlateId) {
      log('info', 'Attempting to correlate with sent email', {
        requestId,
        correlateId,
      });

      const { data: orig, error: selErr } = await supabaseAdmin
        .from('email_communications')
        .select('id, sequence_enrollment_id')
        .eq('user_id', profile.user_id)
        .eq('sendgrid_message_id', correlateId)
        .eq('direction', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selErr) {
        log('error', 'Error finding original email', {
          requestId,
          error: selErr.message,
        });
      } else if (orig?.id) {
        const { error: updErr } = await supabaseAdmin
          .from('email_communications')
          .update({ replied_at: nowIso, status: 'replied' })
          .eq('id', orig.id);

        if (updErr) {
          log('error', 'Error updating original email', {
            requestId,
            originalEmailId: orig.id,
            error: updErr.message,
          });
        } else {
          log('info', 'Original email marked as replied', {
            requestId,
            originalEmailId: orig.id,
          });

          // If this was part of a sequence, unenroll the contact
          if (orig.sequence_enrollment_id) {
            const { error: unenrollErr } = await supabaseAdmin
              .from('sequence_enrollments')
              .update({ status: 'cancelled' })
              .eq('id', orig.sequence_enrollment_id)
              .eq('status', 'active');

            if (unenrollErr) {
              log('error', 'Error unenrolling from sequence', {
                requestId,
                enrollmentId: orig.sequence_enrollment_id,
                error: unenrollErr.message,
              });
            } else {
              log('info', 'Contact unenrolled from sequence due to reply', {
                requestId,
                enrollmentId: orig.sequence_enrollment_id,
                sender,
              });
            }
          }
        }
      } else {
        log('info', 'No matching sent email found for correlation', {
          requestId,
          correlateId,
        });
      }
    }

    // Also unenroll from any other active sequences for this contact
    const { error: bulkUnenrollErr } = await supabaseAdmin
      .from('sequence_enrollments')
      .update({ status: 'cancelled' })
      .eq('user_id', profile.user_id)
      .eq('contact_email', sender)
      .eq('status', 'active');

    if (bulkUnenrollErr) {
      log('error', 'Error bulk unenrolling from sequences', {
        requestId,
        sender,
        error: bulkUnenrollErr.message,
      });
    }

    log('info', 'Inbound email processing completed successfully', {
      requestId,
      emailId: insertedEmail.id,
      sender,
      recipient,
    });

    // Update metrics
    await supabaseAdmin.rpc('update_webhook_metrics', {
      p_webhook_type: 'inbound',
      p_metric_date: new Date().toISOString().split('T')[0],
      p_received: 1,
      p_processed: 1,
      p_failed: 0,
    });

    return new Response('OK', { status: 200 });
  } catch (e: any) {
    log('error', 'Inbound email processing exception', {
      requestId,
      error: String(e?.message ?? e),
      stack: e?.stack,
    });

    // Update metrics
    await supabaseAdmin.rpc('update_webhook_metrics', {
      p_webhook_type: 'inbound',
      p_metric_date: new Date().toISOString().split('T')[0],
      p_received: 1,
      p_processed: 0,
      p_failed: 1,
    });

    // Enqueue for retry on failures
    try {
      const { data: retryId } = await supabaseAdmin.rpc(
        'enqueue_webhook_retry',
        {
          p_webhook_type: 'inbound',
          p_payload: parsedData,
          p_error: String(e?.message ?? e),
        }
      );

      log('info', 'Inbound email enqueued for retry', {
        requestId,
        retryId,
      });
    } catch (retryErr) {
      log('error', 'Failed to enqueue inbound email for retry', {
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
