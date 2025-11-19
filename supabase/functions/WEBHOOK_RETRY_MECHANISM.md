# Webhook Retry Mechanism

## Overview

The webhook retry mechanism provides robust error handling and automatic retry capabilities for SendGrid webhook events and inbound emails. It implements exponential backoff, dead letter queue management, and comprehensive monitoring.

## Architecture

### Components

1. **Enhanced Webhook Functions**

   - `sendgrid-webhook`: Processes SendGrid delivery events with improved error handling
   - `inbound-email`: Processes inbound emails with enhanced parsing and spam filtering

2. **Retry Processor**

   - `process-webhook-retries`: Processes failed webhooks with exponential backoff
   - Runs every 2 minutes via cron job
   - Handles up to 50 retries per invocation

3. **Database Tables**
   - `webhook_retry_queue`: Stores webhooks pending retry
   - `webhook_dead_letter_queue`: Stores webhooks that failed after all retries
   - `webhook_metrics`: Tracks daily webhook processing metrics

## Retry Strategy

### Exponential Backoff

- **Initial delay**: 1 second
- **Backoff multiplier**: 2x
- **Maximum delay**: 5 minutes
- **Maximum attempts**: 5
- **Jitter**: 30% random variation to prevent thundering herd

### Retry Schedule Example

| Attempt | Delay (approx) |
| ------- | -------------- |
| 1       | 1 second       |
| 2       | 2 seconds      |
| 3       | 4 seconds      |
| 4       | 8 seconds      |
| 5       | 16 seconds     |

After 5 failed attempts, the webhook is moved to the dead letter queue.

## Features

### 1. Comprehensive Event Handling

**SendGrid Webhook Events:**

- `processed` - Email received by SendGrid
- `deferred` - Temporary delivery failure
- `delivered` - Successfully delivered
- `open` - Email opened by recipient
- `click` - Link clicked in email
- `bounce` - Email bounced (hard or soft)
- `dropped` - Email dropped by SendGrid
- `spamreport` - Spam complaint received
- `unsubscribe` - Recipient unsubscribed
- `group_unsubscribe` - Group unsubscribe
- `group_resubscribe` - Group resubscribe

### 2. Enhanced Error Logging

All webhook processing includes structured logging with:

- Request ID for tracing
- Event details (type, message ID, user ID)
- Error messages and stack traces
- Processing metrics (success, failure, skip counts)

### 3. Event Deduplication

Prevents duplicate processing of the same event using `sg_event_id`:

- Checks `email_events` table for existing events
- Skips already processed events
- Logs duplicate detection

### 4. Improved Signature Verification

Enhanced security with:

- Constant-time comparison to prevent timing attacks
- Timestamp validation (10-minute window)
- Replay attack prevention
- Detailed error logging

### 5. Inbound Email Enhancements

**Better Email Parsing:**

- Extracts email addresses from various formats
- Parses headers into structured format
- Extracts message IDs for threading
- Handles multipart form data

**Attachment Handling:**

- Parses attachment metadata
- Tracks attachment count and total size
- Stores attachment information in database

**Spam Filtering:**

- Keyword-based spam detection
- Subject pattern matching
- Excessive capitalization detection
- Suspicious sender pattern detection
- Spam score calculation

### 6. Monitoring and Metrics

**Daily Metrics Tracked:**

- Total webhooks received
- Total successfully processed
- Total failed
- Total retried
- Total moved to dead letter queue
- Average processing time

**Health Monitoring:**

- Success rate calculation
- Pending retries count
- Unreviewed dead letters count
- Overall health status

## Usage

### Accessing Webhook Metrics

```typescript
import { useWebhookHealth, useWebhookMetrics } from '@/hooks/useWebhookMetrics';

// Get overall health status
const { data: health } = useWebhookHealth();

// Get metrics for date range
const { data: metrics } = useWebhookMetrics('2025-01-01', '2025-01-31');
```

### Viewing Retry Queue

```typescript
import { useWebhookRetries } from '@/hooks/useWebhookMetrics';

// Get pending retries
const { data: retries } = useWebhookRetries('pending');
```

### Reviewing Dead Letter Queue

```typescript
import { useWebhookDeadLetters } from '@/hooks/useWebhookMetrics';

// Get unreviewed failed webhooks
const { data: deadLetters } = useWebhookDeadLetters(false);
```

## Database Functions

### enqueue_webhook_retry

Adds a failed webhook to the retry queue:

```sql
SELECT enqueue_webhook_retry(
  'sendgrid',
  '{"event": "delivered", ...}'::jsonb,
  'Database connection timeout'
);
```

### update_webhook_metrics

Updates daily webhook metrics:

```sql
SELECT update_webhook_metrics(
  'sendgrid',
  CURRENT_DATE,
  p_received := 100,
  p_processed := 95,
  p_failed := 5
);
```

### cleanup_old_webhook_retries

Removes completed retries older than 7 days:

```sql
SELECT cleanup_old_webhook_retries();
```

## Cron Jobs

### process-webhook-retries

- **Schedule**: Every 2 minutes (`*/2 * * * *`)
- **Purpose**: Process pending webhook retries
- **Batch size**: 50 webhooks per run

### cleanup-webhook-retries

- **Schedule**: Daily at 3 AM (`0 3 * * *`)
- **Purpose**: Clean up old completed retries
- **Retention**: 7 days

## Error Handling

### Webhook Function Errors

When a webhook function encounters an error:

1. Error is logged with full context
2. Webhook is enqueued for retry
3. Function returns 200 OK to prevent SendGrid retry
4. Metrics are updated

### Retry Processing Errors

When retry processing fails:

1. Attempt count is incremented
2. Next retry time is calculated with exponential backoff
3. Error is logged
4. After max attempts, moved to dead letter queue

### Dead Letter Queue

Webhooks in the dead letter queue:

- Require manual review
- Include all error details
- Can be marked as reviewed
- Support resolution notes

## Monitoring Alerts

Consider setting up alerts for:

- Success rate below 95%
- More than 10 unreviewed dead letters
- Pending retries exceeding 100
- Dead letter queue growing rapidly

## Best Practices

1. **Regular Monitoring**: Check webhook health dashboard daily
2. **Review Dead Letters**: Investigate failed webhooks weekly
3. **Metric Analysis**: Analyze trends to identify issues early
4. **Error Investigation**: Review error logs for patterns
5. **Cleanup**: Ensure old retries are cleaned up regularly

## Troubleshooting

### High Failure Rate

1. Check database connectivity
2. Verify SendGrid API configuration
3. Review error logs for patterns
4. Check for schema changes

### Retries Not Processing

1. Verify cron job is running
2. Check `process-webhook-retries` function logs
3. Ensure `next_retry_at` timestamps are correct
4. Verify database permissions

### Dead Letter Queue Growing

1. Review common error patterns
2. Check for systematic issues
3. Verify webhook payload format
4. Consider adjusting retry strategy

## Future Enhancements

Potential improvements:

- Webhook replay functionality
- Advanced analytics and reporting
- Configurable retry strategies per webhook type
- Automatic error pattern detection
- Integration with alerting systems
- Webhook testing utilities
