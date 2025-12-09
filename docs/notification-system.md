# Notification System Implementation

## Overview

The notification system provides real-time in-app notifications for various events throughout the NexaSuit application. Notifications are stored in the database and displayed to users via the NotificationBell component.

## Architecture

### Components

1. **Database Table**: `notifications` table stores all notification records
2. **Helper Library**: `lib/notifications.ts` provides functions to create notifications
3. **React Hook**: `hooks/useNotifications.ts` manages notification fetching and state
4. **UI Components**:
   - `NotificationBell.tsx` - Bell icon with unread count
   - `NotificationList.tsx` - List of notifications with actions

### Notification Types

The system supports 11 notification types defined in `types/organization.ts`:

1. **organization_invite** - User invited to organization
2. **task_assigned** - Task assigned to user
3. **task_completed** - Assigned task completed
4. **task_overdue** - Task becomes overdue
5. **meeting_scheduled** - Meeting scheduled with user
6. **meeting_reminder** - Upcoming meeting reminder
7. **meeting_cancelled** - Meeting cancelled
8. **lead_assigned** - Lead assigned to user
9. **client_updated** - Client information updated
10. **comment_added** - Comment added to task
11. **mention** - User mentioned in comment

## Implementation Details

### Creating Notifications

Use the helper functions from `lib/notifications.ts`:

```typescript
import { notifyTaskAssigned } from '@/lib/notifications';

await notifyTaskAssigned({
  assigneeUserId: 'profile-id', // Note: profile.id, not auth user_id
  taskId: 'task-id',
  taskTitle: 'Task Title',
  assignedByName: 'John Doe',
});
```

### Important: User ID vs Profile ID

Notifications use `profile.id` (from the `profiles` table), NOT `auth.users.id`. Always convert auth user IDs to profile IDs before creating notifications:

```typescript
import { getProfileId } from '@/lib/notifications';

const profileId = await getProfileId(authUserId);
if (profileId) {
  await createNotification({
    userId: profileId,
    // ... other params
  });
}
```

### Real-time Updates

The notification system uses Supabase real-time subscriptions to automatically update the UI when new notifications arrive:

```typescript
// In useNotifications hook
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profileId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [profileId, queryClient]);
```

## Integration Points

### Task Management

**File**: `hooks/useTasks.ts`

- **Task Completion**: Notifies assigned users when task is marked complete
- **Status Changes**: Triggers automation system which may send notifications

**File**: `hooks/useTaskAssignments.ts`

- **Task Assignment**: Notifies user when assigned to task
- **Bulk Assignment**: Notifies multiple users

**File**: `hooks/useTaskComments.ts`

- **Comment Added**: Notifies task owner and assigned users
- **Mentions**: Detects @username patterns and sends mention notifications

### Meeting Management

**File**: `hooks/useMeetings.ts`

- **Meeting Created**: Notifies all participants
- **Meeting Cancelled**: Notifies all participants when status changes to cancelled

### Automation System

**File**: `lib/ai.ts`

- **Send Notification Action**: Automation rules can trigger notifications
- Supports recipient targeting (owner, assignees, specific user)

**File**: `supabase/functions/run-scheduled-automations/index.ts`

- **Scheduled Automations**: Edge function creates notifications for scheduled triggers
- Handles overdue tasks and due date approaching notifications

## Notification Helper Functions

### Core Functions

```typescript
// Create generic notification
createNotification({
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>,
  actionUrl?: string,
})

// Get profile ID from auth user ID
getProfileId(authUserId: string): Promise<string | null>
```

### Specific Notification Functions

```typescript
// Task notifications
notifyTaskAssigned({ assigneeUserId, taskId, taskTitle, assignedByName });
notifyTaskCompleted({ userId, taskId, taskTitle, completedByName });
notifyTaskOverdue({ userId, taskId, taskTitle });

// Comment notifications
notifyCommentAdded({
  userId,
  taskId,
  taskTitle,
  commenterName,
  commentPreview,
});
notifyMention({ userId, taskId, taskTitle, mentionedByName, commentPreview });

// Meeting notifications
notifyMeetingScheduled({
  userId,
  meetingId,
  meetingTitle,
  startTime,
  organizer,
});
notifyMeetingReminder({ userId, meetingId, meetingTitle, startTime });
notifyMeetingCancelled({ userId, meetingId, meetingTitle, cancelledBy });

// Lead/Client notifications
notifyLeadAssigned({ userId, leadId, leadName, assignedByName });
notifyClientUpdated({
  userId,
  clientId,
  clientName,
  updatedByName,
  updateType,
});
```

## Future Enhancements

### Not Yet Implemented

1. **Lead Assignment Notifications** - Requires lead assignment feature
2. **Client Update Notifications** - Requires client collaboration features
3. **Meeting Reminders** - Requires scheduled job or cron function
4. **Task Overdue Notifications** - Requires scheduled job (partially implemented in edge function)
5. **Push Notifications** - Requires Expo Notifications setup
6. **Email Notifications** - Requires email service integration
7. **Notification Preferences** - UI for managing notification settings per type

### Scheduled Notifications

Some notifications require scheduled jobs:

- **Meeting Reminders**: Check for meetings starting in 15 minutes/1 hour
- **Task Overdue**: Check for tasks that became overdue
- **Due Date Approaching**: Check for tasks due in 24 hours

These can be implemented using:

- Supabase Edge Functions with cron triggers
- External cron service (e.g., GitHub Actions, AWS EventBridge)
- Supabase pg_cron extension

## Testing

### Manual Testing

1. **Task Assignment**:

   - Create a task
   - Assign it to another user
   - Check if notification appears for assigned user

2. **Task Completion**:

   - Complete a task that has assignments
   - Check if assigned users receive notification

3. **Comments**:

   - Add comment to task
   - Check if task owner/assignees receive notification
   - Try @mentioning a user

4. **Meetings**:

   - Create a meeting with participants
   - Check if participants receive notification
   - Cancel the meeting
   - Check if cancellation notification sent

5. **Automation**:
   - Create automation rule with "Send Notification" action
   - Trigger the automation
   - Check if notification created

### Database Queries

```sql
-- Check recent notifications
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- Check unread notifications for user
SELECT * FROM notifications
WHERE user_id = 'profile-id' AND read = false;

-- Check notification counts by type
SELECT type, COUNT(*)
FROM notifications
GROUP BY type;
```

## Troubleshooting

### Notifications Not Appearing

1. **Check Profile ID**: Ensure you're using `profile.id` not `auth.users.id`
2. **Check Real-time Subscription**: Verify Supabase real-time is enabled
3. **Check RLS Policies**: Ensure user has permission to read their notifications
4. **Check Browser Console**: Look for subscription errors

### Duplicate Notifications

1. **Check for Multiple Triggers**: Ensure automation rules don't overlap
2. **Check Assignment Logic**: Verify users aren't assigned multiple times
3. **Add Deduplication**: Consider adding unique constraints or checking for existing notifications

### Performance Issues

1. **Limit Query Results**: Use pagination for notification list
2. **Add Indexes**: Ensure `user_id` and `created_at` are indexed
3. **Clean Old Notifications**: Implement periodic cleanup of old read notifications

## Best Practices

1. **Always use helper functions** instead of creating notifications directly
2. **Handle errors gracefully** - notification failures shouldn't break main flow
3. **Provide meaningful messages** - include context and action items
4. **Use actionUrl** to enable deep linking to relevant content
5. **Respect user preferences** - check notification settings before sending
6. **Avoid notification spam** - batch similar notifications when possible
7. **Test with multiple users** - ensure notifications work across user boundaries
