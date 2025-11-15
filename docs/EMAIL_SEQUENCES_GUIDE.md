# Email Sequences Guide

Complete guide for using the automated email sequences feature in NexaSuit.

## Overview

Email sequences allow you to automate follow-up emails to leads and clients. Create multi-step campaigns that send emails automatically based on time delays.

## Features

- **Multi-step sequences**: Create sequences with unlimited steps
- **Template integration**: Use existing email templates or custom content
- **Flexible scheduling**: Set custom delays between emails (in hours)
- **Smart unenrollment**: Automatically stop sequences when contacts reply or unsubscribe
- **Bulk enrollment**: Enroll multiple contacts at once
- **Analytics**: Track open rates, click rates, and reply rates
- **Pause/Resume**: Control enrollment status at any time

## Getting Started

### 1. Create a Sequence

1. Navigate to **Emails > Sequences**
2. Click **New Sequence**
3. Enter a name and description
4. Click **Save**

### 2. Add Steps

1. Click on your sequence to open the step builder
2. Click **Add Step** (+ button)
3. Configure each step:

   - **Delay (hours)**: Time to wait before sending (e.g., 24 for 1 day)
   - **Template**: Select an existing template (optional)
   - **Custom Subject**: Override template subject or add custom
   - **Custom Content**: Override template body or add custom

4. Reorder steps using the Up/Down buttons
5. Click **Save** for each step

### 3. Activate the Sequence

1. Return to the sequences list
2. Click **Activate** on your sequence
3. The system validates that all steps have valid content
4. Once active, you can enroll contacts

### 4. Enroll Contacts

#### Single Enrollment

1. Click **Enrollments** on your sequence
2. Click the **+** button
3. Enter the contact's email address
4. Click **Enroll**

#### Bulk Enrollment

1. Click **Enrollments** on your sequence
2. Click **Bulk**
3. Search and select contacts from your clients/leads
4. Click **Enroll**

The system automatically:

- Skips contacts already enrolled
- Skips suppressed/unsubscribed emails
- Links enrollments to existing clients/leads

## Sequence Behavior

### Automatic Processing

The `process-email-sequences` Edge Function runs every 10 minutes and:

1. Finds enrollments due for sending
2. Sends the next email in the sequence
3. Advances the enrollment to the next step
4. Schedules the next email based on delay
5. Marks as completed when all steps are done

### Auto-Unenrollment

Contacts are automatically unenrolled when they:

- **Reply** to any sequence email
- **Unsubscribe** from emails
- **Hard bounce** (invalid email address)

This prevents annoying contacts who have already engaged.

### Enrollment States

- **Active**: Currently progressing through the sequence
- **Paused**: Temporarily stopped (can be resumed)
- **Completed**: Finished all steps successfully
- **Cancelled**: Manually stopped or auto-unenrolled

## Best Practices

### Sequence Design

1. **Start with value**: First email should provide immediate value
2. **Gradual engagement**: Increase ask/commitment with each step
3. **Reasonable delays**: 24-48 hours between emails is typical
4. **Clear CTAs**: Each email should have one clear call-to-action
5. **Limit length**: 3-5 steps is usually optimal

### Content Tips

1. **Personalization**: Use contact names when possible
2. **Mobile-friendly**: Keep emails concise and scannable
3. **Test templates**: Send test emails before activating
4. **A/B testing**: Create variations to test performance
5. **Compliance**: Include unsubscribe links (handled automatically)

### Timing

- **B2B**: Send during business hours (9 AM - 5 PM)
- **First email**: 1-2 hours after trigger event
- **Follow-ups**: 24-72 hours apart
- **Final email**: 5-7 days after previous

## Analytics

### Sequence Performance

View analytics at **Emails > Sequence Analytics**:

- **Enrollment Count**: Total contacts enrolled
- **Active Count**: Currently in progress
- **Completion Rate**: % who completed all steps
- **Open Rate**: % of emails opened
- **Click Rate**: % of emails clicked
- **Reply Rate**: % who replied

### Per-Enrollment Tracking

In the Enrollments view, see:

- Current step progress
- Last email sent date
- Next scheduled email
- Enrollment status

## Troubleshooting

### Emails Not Sending

1. **Check sequence is active**: Must be activated
2. **Verify Edge Function**: Ensure `process-email-sequences` is deployed
3. **Check scheduling**: Confirm cron job is running
4. **Review logs**: Check Supabase function logs for errors
5. **Validate content**: Ensure all steps have subject and body

### Contacts Not Enrolling

1. **Already enrolled**: Can't enroll twice in same sequence
2. **Suppressed**: Check suppression list
3. **Invalid email**: Verify email format
4. **Sequence inactive**: Must activate before enrolling

### Low Engagement

1. **Subject lines**: Test different approaches
2. **Timing**: Adjust delays between emails
3. **Content**: Make more valuable/relevant
4. **Audience**: Ensure targeting right contacts
5. **Sender reputation**: Check email deliverability

## API Integration

### Enroll via API

```typescript
import { useCreateSequenceEnrollment } from '@/hooks/useSequenceEnrollments';

const enrollContact = useCreateSequenceEnrollment();

await enrollContact.mutateAsync({
  sequence_id: 'sequence-uuid',
  contact_email: 'contact@example.com',
  client_id: 'client-uuid', // optional
  lead_id: null,
  current_step: 0,
  status: 'active',
  last_email_sent_at: null,
  next_email_scheduled_at: null,
});
```

### Bulk Enroll

```typescript
import { useBulkEnrollContacts } from '@/hooks/useSequenceEnrollments';

const bulkEnroll = useBulkEnrollContacts();

await bulkEnroll.mutateAsync({
  sequenceId: 'sequence-uuid',
  contacts: [
    { email: 'contact1@example.com', client_id: 'client-1' },
    { email: 'contact2@example.com', lead_id: 'lead-1' },
  ],
});
```

## Database Schema

### email_sequences

- `id`: UUID primary key
- `user_id`: UUID foreign key
- `name`: Sequence name
- `description`: Optional description
- `active`: Boolean (must be true to enroll)

### sequence_steps

- `id`: UUID primary key
- `sequence_id`: UUID foreign key
- `step_order`: Integer (0-based)
- `delay_hours`: Integer (hours to wait)
- `template_id`: UUID foreign key (optional)
- `subject`: Text (optional, overrides template)
- `body_html`: Text (optional, overrides template)
- `body_text`: Text (optional, overrides template)

### sequence_enrollments

- `id`: UUID primary key
- `user_id`: UUID foreign key
- `sequence_id`: UUID foreign key
- `contact_email`: Text
- `client_id`: UUID foreign key (optional)
- `lead_id`: UUID foreign key (optional)
- `current_step`: Integer (0-based)
- `status`: Enum (active, completed, paused, cancelled)
- `enrolled_at`: Timestamp
- `completed_at`: Timestamp (nullable)
- `last_email_sent_at`: Timestamp (nullable)
- `next_email_scheduled_at`: Timestamp (nullable)

## Support

For issues or questions:

1. Check function logs in Supabase Dashboard
2. Review enrollment status in app
3. Verify sequence configuration
4. Test with a single contact first
5. Contact support with error details
