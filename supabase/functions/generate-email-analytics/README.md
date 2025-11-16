# Generate Email Analytics Edge Function

This Edge Function generates and caches email analytics data for improved performance.

## Purpose

The function pre-calculates analytics metrics and stores them in the `email_analytics_cache` table to reduce query load and improve dashboard performance.

## Features

- **Daily Statistics**: Calculates sent, delivered, opened, clicked, replied, and bounced metrics
- **Template Performance**: Analyzes usage and engagement rates for email templates
- **Recipient Engagement**: Ranks recipients by engagement score
- **Multiple Time Ranges**: Caches data for 7, 30, and 90-day periods
- **Automatic Expiration**: Cache entries expire after 24 hours

## Usage

### Generate for Specific User

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-email-analytics?user_id=USER_ID" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Generate for All Active Users

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/generate-email-analytics" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Cron Schedule

This function should be scheduled to run daily at 2 AM:

```sql
-- In Supabase Dashboard > Database > Cron Jobs
SELECT cron.schedule(
  'generate-email-analytics-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-email-analytics',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## Cache Structure

The function creates cache entries with the following structure:

```typescript
{
  user_id: string;
  metric_type: 'daily_stats_last_7_days' |
    'template_performance_last_30_days' |
    'recipient_engagement_last_90_days';
  date_range_start: string; // ISO date
  date_range_end: string; // ISO date
  data: any; // Calculated metrics
  expires_at: string; // ISO timestamp
}
```

## Metric Types

### Daily Stats

- `total_sent`: Total emails sent
- `delivered`: Successfully delivered emails
- `opened`: Emails opened
- `clicked`: Emails with clicks
- `replied`: Emails with replies
- `bounced`: Failed emails
- `delivery_rate`: Percentage delivered
- `open_rate`: Percentage opened
- `click_rate`: Percentage clicked
- `reply_rate`: Percentage replied
- `bounce_rate`: Percentage bounced

### Template Performance

- `template_id`: Template identifier
- `template_name`: Template name
- `usage_count`: Number of times used
- `opens`: Total opens
- `clicks`: Total clicks
- `replies`: Total replies
- `open_rate`: Percentage opened
- `click_rate`: Percentage clicked
- `reply_rate`: Percentage replied

### Recipient Engagement

- `email`: Recipient email address
- `total_emails`: Emails sent to recipient
- `opens`: Total opens
- `clicks`: Total clicks
- `replies`: Total replies
- `engagement_score`: Weighted score (opens×1 + clicks×2 + replies×3)
- `last_interaction`: Most recent interaction timestamp

## Performance Considerations

- Processes up to 1000 active users per run
- Caches data for 7, 30, and 90-day periods
- Cache expires after 24 hours
- Top 50 recipients per user are cached

## Error Handling

- Logs errors for individual users without stopping batch processing
- Returns detailed error information in response
- Continues processing remaining users if one fails

## Monitoring

Check function logs in Supabase Dashboard > Edge Functions > Logs for:

- Processing duration
- Number of users processed
- Cache generation success/failure
- Individual user errors
