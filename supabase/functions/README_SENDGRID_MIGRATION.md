# SendGrid Migration Guide

This document outlines the migration from Mailgun to SendGrid for email functionality in NexaSuit.

## Overview

All Supabase Edge Functions have been updated to use SendGrid API instead of Mailgun. The migration maintains the same database structure and functionality while improving performance and reliability.

## Updated Functions

### 1. `send-email`

- **Purpose**: Send transactional emails via SendGrid
- **Changes**:
  - Replaced Mailgun API calls with SendGrid v3 API
  - Added comprehensive tracking settings
  - Improved error handling and logging
  - Uses `sendgrid_message_id` for tracking

### 2. `sendgrid-webhook` (formerly `mailgun-webhook`)

- **Purpose**: Handle SendGrid webhook events for delivery tracking
- **Changes**:
  - Processes SendGrid event format (JSON array)
  - Handles multiple event types: delivered, open, click, bounce, etc.
  - Supports inbound email processing
  - Improved signature verification

### 3. `inbound-email`

- **Purpose**: Process inbound emails via SendGrid Inbound Parse
- **Changes**:
  - Updated to handle SendGrid Inbound Parse format
  - Supports both JSON and form-data payloads
  - Enhanced header parsing and message correlation

### 4. `link-redirect`

- **Purpose**: Track email link clicks and redirect users
- **Changes**: Updated to use `sendgrid_message_id` for tracking

### 5. `send-scheduled-emails`

- **Purpose**: Process scheduled email queue
- **Changes**: Enhanced error handling and user context management

## Environment Variables

Update your environment variables in Supabase:

### Required

```bash
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_DOMAIN=yourdomain.com
SENDGRID_DEFAULT_NAME=NexaSuit
```

### Optional

```bash
SENDGRID_WEBHOOK_VERIFY_KEY=your_webhook_verification_key
```

### Remove (Legacy)

```bash
# These can be removed after migration
MAILGUN_API_KEY
MAILGUN_DOMAIN
MAILGUN_BASE_URL
MAILGUN_SIGNING_KEY
```

## Dynamic Sender Addresses

This implementation uses **dynamic sender addresses** to give each user their own email identity:

### How It Works

- Each user gets a unique sender address: `{user-identifier}@yourdomain.com`
- User identifier is derived from their username, email prefix, or user ID
- Display name is extracted from user profile or email
- All emails appear to come from the individual user, not a generic address

### Examples

- User "john.doe@company.com" → Sends from "johndoe@yourdomain.com" as "John Doe"
- User "sarah_smith@gmail.com" → Sends from "sarahsmith@yourdomain.com" as "Sarah Smith"
- User with display name "Mike Johnson" → Sends as "Mike Johnson" from "mike@yourdomain.com"

### Benefits

- **Personalized Communication**: Recipients see emails from individual users
- **Better Deliverability**: Unique sender addresses improve reputation
- **Professional Appearance**: Branded domain with personal touch
- **Reply Management**: Replies can be routed back to specific users

## SendGrid Setup

### 1. API Key

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with "Mail Send" permissions
3. Add the API key to your environment variables

### 2. Domain Authentication

1. Set up domain authentication in SendGrid dashboard
2. Add DNS records to verify your sending domain
3. Update `SENDGRID_DOMAIN` to use your verified domain
4. Configure wildcard subdomain authentication to allow dynamic sender addresses

### 3. Webhook Configuration

1. Go to Settings > Mail Settings > Event Webhook
2. Set the webhook URL to: `https://your-project.supabase.co/functions/v1/sendgrid-webhook`
3. Enable events: Delivered, Opened, Clicked, Bounced, Dropped, Spam Report, Unsubscribe
4. (Optional) Set up webhook signature verification

### 4. Inbound Parse (Optional)

1. Go to Settings > Inbound Parse
2. Add your subdomain (e.g., `mail.yourdomain.com`)
3. Set destination URL to: `https://your-project.supabase.co/functions/v1/inbound-email`
4. Configure DNS MX records for your subdomain

## Database Migration

Run the migration to update the database schema:

```sql
-- Apply the migration
\i supabase/migrations/20250111000000_migrate_to_sendgrid.sql
```

This migration:

- Adds `sendgrid_message_id` column
- Copies existing Mailgun IDs for compatibility
- Creates performance indexes
- Adds documentation comments

## Testing

### 1. Send Test Email

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "from": "sender",
    "subject": "Test Email",
    "html": "<h1>Hello from SendGrid!</h1>",
    "text": "Hello from SendGrid!"
  }'
```

### 2. Test Webhook

Send a test webhook from SendGrid dashboard to verify event processing.

### 3. Test Inbound Email

Send an email to your configured inbound address to test parsing.

## Performance Improvements

### SendGrid Advantages

- **Higher Deliverability**: Better reputation and inbox placement
- **Advanced Analytics**: Detailed engagement metrics
- **Global Infrastructure**: Faster email delivery worldwide
- **Better API**: More reliable and feature-rich API
- **Compliance**: Built-in CAN-SPAM and GDPR compliance tools

### Code Optimizations

- **Batch Processing**: Webhook handler processes multiple events efficiently
- **Error Handling**: Comprehensive error logging and recovery
- **Caching**: Improved database query patterns
- **Monitoring**: Better observability and debugging capabilities

## Monitoring and Debugging

### Logs

Check Supabase function logs for:

- SendGrid API responses
- Webhook event processing
- Database operation results
- Error messages and stack traces

### SendGrid Dashboard

Monitor email performance in SendGrid:

- Delivery rates and bounce rates
- Open and click rates
- Spam reports and unsubscribes
- API usage and rate limits

## Rollback Plan

If issues arise, you can temporarily rollback:

1. **Revert Environment Variables**: Switch back to Mailgun credentials
2. **Update Function Code**: Deploy previous Mailgun-based functions
3. **Database**: The migration preserves `mailgun_message_id` for compatibility

## Support

For issues related to:

- **SendGrid API**: Check SendGrid documentation and support
- **Function Errors**: Review Supabase function logs
- **Database Issues**: Check Supabase dashboard and logs
- **DNS/Domain**: Verify domain authentication and DNS records

## Next Steps

After successful migration:

1. **Monitor Performance**: Track delivery rates and engagement
2. **Clean Up**: Remove legacy Mailgun environment variables
3. **Optimize**: Fine-tune SendGrid settings based on usage patterns
4. **Scale**: Configure rate limits and sending quotas as needed

## Security Considerations

- **API Keys**: Store SendGrid API key securely in Supabase secrets
- **Webhook Security**: Enable signature verification for production
- **Domain Security**: Use SPF, DKIM, and DMARC records
- **Rate Limiting**: Implement appropriate sending limits
- **Data Privacy**: Ensure compliance with data protection regulations
