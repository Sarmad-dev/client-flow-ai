# Schedule Email Encrypted Function

This Supabase Edge Function handles scheduling emails with server-side encryption for enhanced security.

## Overview

The `schedule-email-encrypted` function allows users to schedule emails for future delivery while encrypting sensitive content (subject, body text, and HTML) before storing in the database.

## Features

- **Server-side encryption**: Email content is encrypted using AES-GCM before database storage
- **User-specific keys**: Each user has a unique encryption key derived from their user ID
- **Scheduled delivery**: Emails are stored with a future timestamp for cron-based processing
- **Suppression list checking**: Prevents scheduling emails to suppressed recipients
- **Comprehensive logging**: Detailed logs for debugging and monitoring

## API Endpoint

```
POST /functions/v1/schedule-email-encrypted
```

### Headers

```
Authorization: Bearer <user_access_token>
Content-Type: application/json
```

### Request Body

```typescript
{
  to: string;                           // Recipient email address
  subject: string;                      // Email subject
  html?: string;                        // HTML email body (optional)
  text?: string;                        // Plain text email body (optional)
  scheduled_at: string;                 // ISO timestamp for delivery
  from?: string;                        // Sender identifier (optional)
  client_id?: string | null;            // Associated client ID (optional)
  lead_id?: string | null;              // Associated lead ID (optional)
  signature_used?: string | null;       // Email signature (optional)
  in_reply_to_message_id?: string | null; // Reply threading (optional)
  references?: string[] | null;         // Email threading references (optional)
}
```

### Response

```typescript
{
  id: string; // Unique email ID
  message: string; // Success message
  scheduled_at: string; // Scheduled delivery time
  recipient_email: string; // Recipient address
  status: 'scheduled'; // Email status
  encrypted: true; // Encryption confirmation
}
```

## Security

- Content is encrypted using AES-GCM with 256-bit keys
- User-specific keys derived using PBKDF2 with 100,000 iterations
- Encrypted data prefixed with `srv_enc:` for identification
- Master encryption key stored as environment variable

## Integration

This function works with:

- `send-email` function (handles decryption during delivery)
- `send-scheduled-emails` function (cron job for processing scheduled emails)
- Email communications database table

## Environment Variables

- `EMAIL_ENCRYPTION_MASTER_KEY` or `EMAIL_ENCRYPTION_KEY`: Master key for encryption
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Error Handling

- Validates email format and required fields
- Checks scheduled time is in the future
- Verifies recipient is not on suppression list
- Handles encryption failures gracefully
- Comprehensive error logging
