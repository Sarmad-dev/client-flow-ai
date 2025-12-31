// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  encryptEmailData,
  isEncryptionSupported,
} from '../_shared/encryption.ts';

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

// Parse raw email content to extract text and HTML bodies
function parseRawEmailContent(rawEmail: string): {
  text: string;
  html: string;
} {
  let textBody = '';
  let htmlBody = '';

  try {
    // Split by Content-Type boundaries to find text/plain and text/html sections
    const textPlainMatch = rawEmail.match(
      /Content-Type:\s*text\/plain[^]*?(?=--|\r?\n\r?\n[^-]|$)/i
    );
    const textHtmlMatch = rawEmail.match(
      /Content-Type:\s*text\/html[^]*?(?=--|\r?\n\r?\n[^-]|$)/i
    );

    // Extract text/plain content
    if (textPlainMatch) {
      const textSection = textPlainMatch[0];
      // Find the content after the headers (after double newline)
      const contentMatch = textSection.match(
        /\r?\n\r?\n([\s\S]*?)(?=--|\r?\n--|\r?\n\r?\n--|\r?\n\r?\n[A-Z]|$)/
      );
      if (contentMatch) {
        textBody = contentMatch[1].trim();
      }
    }

    // Extract text/html content
    if (textHtmlMatch) {
      const htmlSection = textHtmlMatch[0];
      // Find the content after the headers (after double newline)
      const contentMatch = htmlSection.match(
        /\r?\n\r?\n([\s\S]*?)(?=--|\r?\n--|\r?\n\r?\n--|\r?\n\r?\n[A-Z]|$)/
      );
      if (contentMatch) {
        htmlBody = contentMatch[1].trim();
        // Decode quoted-printable if present
        if (htmlSection.includes('quoted-printable')) {
          htmlBody = htmlBody
            .replace(/=\r?\n/g, '') // Remove soft line breaks
            .replace(/=([0-9A-F]{2})/g, (match, hex) =>
              String.fromCharCode(parseInt(hex, 16))
            ); // Decode hex
        }
      }
    }

    // Fallback: try to extract from spam report content preview
    if (!textBody && !htmlBody) {
      const contentPreviewMatch = rawEmail.match(
        /Content preview:\s*([^\r\n]+)/i
      );
      if (contentPreviewMatch) {
        textBody = contentPreviewMatch[1].trim();
      }
    }

    log('info', 'Raw email parsing results', {
      foundTextPlain: !!textPlainMatch,
      foundTextHtml: !!textHtmlMatch,
      textBodyLength: textBody.length,
      htmlBodyLength: htmlBody.length,
      textPreview: textBody.substring(0, 100),
      htmlPreview: htmlBody.substring(0, 100),
    });
  } catch (error) {
    log('error', 'Error parsing raw email content', {
      error: String(error),
    });
  }

  return { text: textBody, html: htmlBody };
}

// Parse multipart form data manually
function parseMultipartFormData(
  body: string,
  boundary: string
): Record<string, string> {
  const data: Record<string, string> = {};

  if (!boundary) {
    log('warn', 'No boundary found for multipart parsing');
    return data;
  }

  try {
    // Split by boundary
    const parts = body.split(`--${boundary}`);

    for (const part of parts) {
      if (!part.trim() || part.trim() === '--') continue;

      // Find the double newline that separates headers from content
      const headerEndIndex = part.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) continue;

      const headers = part.substring(0, headerEndIndex);
      const content = part.substring(headerEndIndex + 4).trim();

      // Extract field name from Content-Disposition header
      const nameMatch = headers.match(/name="([^"]+)"/);
      if (nameMatch && nameMatch[1]) {
        const fieldName = nameMatch[1];
        // Remove trailing boundary markers and whitespace
        const cleanContent = content.replace(/\r?\n?--$/, '').trim();
        data[fieldName] = cleanContent;
      }
    }

    log('info', 'Multipart parsing completed', {
      partsFound: parts.length,
      fieldsExtracted: Object.keys(data).length,
      fields: Object.keys(data),
    });
  } catch (error) {
    log('error', 'Error parsing multipart data', {
      error: String(error),
      boundaryLength: boundary.length,
    });
  }

  return data;
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

  log('info', 'Raw Email Body', { rawBody });

  // SendGrid Inbound Parse sends form-data or JSON
  let parsedData: any = {};
  const contentType = req.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      parsedData = JSON.parse(rawBody);
      log('info', 'Parsed JSON payload', {
        requestId,
        keys: Object.keys(parsedData),
      });
    } else if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with attachments)
      const boundary = contentType.split('boundary=')[1];
      log('info', 'Received multipart form data', {
        requestId,
        boundary: boundary?.substring(0, 20) + '...',
        contentType,
      });

      // Parse multipart form data manually
      parsedData = parseMultipartFormData(rawBody, boundary);
      log('info', 'Parsed multipart data', {
        requestId,
        keys: Object.keys(parsedData),
        fieldCount: Object.keys(parsedData).length,
      });
    } else {
      // Parse as URL-encoded form data
      try {
        const body = new URLSearchParams(rawBody);
        parsedData = {};
        for (const [key, value] of body.entries()) {
          parsedData[key] = value;
        }
        log('info', 'Parsed form-encoded payload', {
          requestId,
          keys: Object.keys(parsedData),
          fieldCount: Object.keys(parsedData).length,
        });
      } catch (urlError) {
        // If URLSearchParams fails, try to parse as raw text
        log('warn', 'URLSearchParams failed, trying raw parsing', {
          requestId,
          error: String(urlError),
        });

        // Simple key=value parsing for basic form data
        const lines = rawBody.split(/[&\n]/);
        for (const line of lines) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            try {
              parsedData[decodeURIComponent(key)] = decodeURIComponent(value);
            } catch {
              parsedData[key] = value;
            }
          }
        }
        log('info', 'Parsed raw form data', {
          requestId,
          keys: Object.keys(parsedData),
        });
      }
    }
  } catch (error) {
    log('error', 'Invalid payload format', {
      requestId,
      error: String(error),
      contentType,
      bodyPreview: rawBody.substring(0, 200),
    });
    return badRequest('Invalid payload format');
  }

  // Extract and normalize email addresses - try multiple field names
  const senderRaw = parsedData.from || parsedData.sender || '';
  const recipientRaw =
    parsedData.to ||
    parsedData.recipient ||
    parsedData.email ||
    parsedData.envelope_to ||
    parsedData['envelope[to]'] ||
    '';

  const sender = extractEmailAddress(senderRaw);
  const recipient = extractEmailAddress(recipientRaw);

  const subject = parsedData.subject || '';

  // Try multiple field names for body content
  let bodyText =
    parsedData.text ||
    parsedData.body ||
    parsedData.plain ||
    parsedData['text/plain'] ||
    parsedData.body_text ||
    '';

  let bodyHtml =
    parsedData.html ||
    parsedData.body_html ||
    parsedData['text/html'] ||
    parsedData.html_body ||
    '';

  // If no body content found in standard fields, try parsing raw email content
  if (!bodyText && !bodyHtml && parsedData.email) {
    log('info', 'No body content in standard fields, parsing raw email', {
      requestId,
      rawEmailLength: parsedData.email.length,
    });

    const parsedContent = parseRawEmailContent(parsedData.email);
    bodyText = parsedContent.text;
    bodyHtml = parsedContent.html;
  }
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

    log('info', 'Envelope parsed', {
      requestId,
      envelope,
      envelopeTo: envelope.to,
      envelopeFrom: envelope.from,
    });
  } catch (error) {
    log('warn', 'Failed to parse envelope', {
      requestId,
      error: String(error),
      rawEnvelope: parsedData.envelope,
    });
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
    // Try to get recipient from envelope if main extraction failed
    let finalRecipient = recipient;
    if (!finalRecipient && envelope.to) {
      if (Array.isArray(envelope.to)) {
        finalRecipient = extractEmailAddress(envelope.to[0] || '');
      } else {
        finalRecipient = extractEmailAddress(envelope.to);
      }
      log('info', 'Using envelope recipient', {
        requestId,
        envelopeRecipient: finalRecipient,
      });
    }

    // Find the user based on recipient email
    if (!finalRecipient) {
      log('error', 'No recipient email provided', {
        requestId,
        originalRecipient: recipient,
        envelopeTo: envelope.to,
        allFields: Object.keys(parsedData),
      });
      return badRequest('No recipient email', 400);
    }

    const local = finalRecipient.split('@')[0]?.toLowerCase();

    // Map alias local-part to a user via profiles.email
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .ilike('email', `${local}@%`)
      .maybeSingle();

    if (profileErr) {
      log('error', 'Error fetching profile', {
        requestId,
        recipient: finalRecipient,
        error: profileErr.message,
      });
      throw profileErr;
    }

    if (!profile?.user_id) {
      log('warn', 'Unknown recipient', {
        requestId,
        recipient: finalRecipient,
      });
      return badRequest('Unknown recipient', 404);
    }

    log('info', 'Profile found for recipient', {
      requestId,
      userId: profile.user_id,
      recipient: finalRecipient,
    });

    // Check for duplicate emails to prevent double insertion
    // Use a combination of sender, recipient, subject, and timestamp for deduplication
    const deduplicationKey = `${sender}_${finalRecipient}_${subject}_${Math.floor(
      Date.now() / 60000
    )}`; // 1-minute window
    const messageIdForDedup = messageId || `generated_${crypto.randomUUID()}`;

    // Check if this email already exists
    const { data: existingEmail, error: duplicateCheckErr } =
      await supabaseAdmin
        .from('email_communications')
        .select('id, created_at')
        .eq('user_id', profile.user_id)
        .eq('sender_email', sender)
        .eq('recipient_email', finalRecipient)
        .eq('subject', subject)
        .eq('direction', 'received')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes
        .maybeSingle();

    if (duplicateCheckErr) {
      log('warn', 'Error checking for duplicates', {
        requestId,
        error: duplicateCheckErr.message,
      });
    }

    if (existingEmail) {
      log('warn', 'Duplicate email detected - skipping insertion', {
        requestId,
        existingEmailId: existingEmail.id,
        existingCreatedAt: existingEmail.created_at,
        sender,
        recipient: finalRecipient,
        subject,
      });
      return new Response('Duplicate email - already processed', {
        status: 200,
      });
    }

    // Also check by message ID if available
    if (messageId) {
      const { data: existingByMessageId } = await supabaseAdmin
        .from('email_communications')
        .select('id')
        .eq('sendgrid_message_id', messageId)
        .maybeSingle();

      if (existingByMessageId) {
        log(
          'warn',
          'Duplicate email detected by message ID - skipping insertion',
          {
            requestId,
            existingEmailId: existingByMessageId.id,
            messageId,
            sender,
            recipient: finalRecipient,
          }
        );
        return new Response(
          'Duplicate email by message ID - already processed',
          { status: 200 }
        );
      }
    }

    log('info', 'No duplicate found, proceeding with insertion', {
      requestId,
      deduplicationKey,
      messageId: messageIdForDedup,
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
    // NOTE: Inbound emails are now encrypted server-side before storage
    let insertPayload: Record<string, any> = {
      user_id: profile.user_id,
      direction: 'received',
      subject: subject || null,
      body_text: bodyText || null,
      body_html: bodyHtml || null,
      sender_email: sender || null,
      recipient_email: finalRecipient || null,
      status: spamCheck.isSpam ? 'spam' : 'received',
      sendgrid_message_id: messageId || null,
      in_reply_to_message_id: inReplyTo || null,
      references: references.length ? references : null,
      attachment_count: attachments.length,
      total_attachment_size: attachments.reduce((sum, a) => sum + a.size, 0),
      created_at: nowIso,
      // Mark as server-side encrypted
      needs_encryption: false,
    };

    // Encrypt sensitive email data before storage
    if (isEncryptionSupported()) {
      try {
        log('info', 'Encrypting email data before storage', {
          requestId,
          hasSubject: !!subject,
          hasBodyText: !!bodyText,
          hasBodyHtml: !!bodyHtml,
        });

        const encryptedData = await encryptEmailData(
          {
            subject: subject || null,
            body_text: bodyText || null,
            body_html: bodyHtml || null,
          },
          profile.user_id
        );

        // Update payload with encrypted data
        insertPayload.subject = encryptedData.subject;
        insertPayload.body_text = encryptedData.body_text;
        insertPayload.body_html = encryptedData.body_html;

        log('info', 'Email data encrypted successfully', {
          requestId,
          encryptedSubject: !!encryptedData.subject,
          encryptedBodyText: !!encryptedData.body_text,
          encryptedBodyHtml: !!encryptedData.body_html,
        });
      } catch (encryptionError) {
        log('error', 'Failed to encrypt email data', {
          requestId,
          error: String(encryptionError),
        });

        // Fall back to storing unencrypted with needs_encryption flag
        insertPayload.needs_encryption = true;

        log(
          'warn',
          'Storing unencrypted email data due to encryption failure',
          {
            requestId,
          }
        );
      }
    } else {
      log('warn', 'Encryption not supported, storing unencrypted', {
        requestId,
      });
      insertPayload.needs_encryption = true;
    }

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
      recipient: finalRecipient,
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
