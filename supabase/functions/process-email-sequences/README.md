# Process Email Sequences Edge Function

This Edge Function processes active email sequence enrollments and sends scheduled emails automatically.

## Overview

The function:

- Fetches active enrollments that are due for sending
- Retrieves sequence steps and email content (from templates or custom)
- Sends emails via the `send-email` function
- Advances enrollments to the next step
- Marks sequences as completed when all steps are done

## Deployment

Deploy the function to Supabase:

```bash
# From the project root
supabase functions deploy process-email-sequences
```

## Scheduling

This function should be run on a schedule (e.g., every 5-15 minutes) using a cron job or Supabase's pg_cron extension.

### Option 1: Using pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 10 minutes
SELECT cron.schedule(
  'process-email-sequences',
  '*/10 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-sequences',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

Replace:

- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

### Option 2: External Cron Service

Use a service like:

- GitHub Actions
- Vercel Cron
- Render Cron Jobs
- AWS EventBridge

Example GitHub Actions workflow:

```yaml
name: Process Email Sequences
on:
  schedule:
    - cron: '*/10 * * * *' # Every 10 minutes
  workflow_dispatch:

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-sequences \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## Monitoring

The function logs detailed information about:

- Number of enrollments processed
- Emails sent successfully
- Errors encountered
- Processing duration

View logs in the Supabase Dashboard under Functions > process-email-sequences > Logs.

## Testing

Test the function manually:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email-sequences \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Response Format

```json
{
  "message": "Processing completed",
  "result": {
    "total": 10,
    "sent": 9,
    "completed": 2,
    "failed": 1,
    "errors": [
      {
        "id": "enrollment-id",
        "error": "Error message"
      }
    ]
  },
  "durationMs": 1234
}
```

## Error Handling

The function handles errors gracefully:

- Failed enrollments are logged but don't stop processing
- Each enrollment is processed independently
- Detailed error messages are returned for debugging

## Performance

- Processes up to 50 enrollments per run (configurable via `BATCH_SIZE`)
- Typical processing time: 1-5 seconds for 10 enrollments
- Scales horizontally with multiple invocations
