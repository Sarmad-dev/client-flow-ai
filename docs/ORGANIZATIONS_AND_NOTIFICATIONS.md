# Organizations & Notifications System

## Overview

The Organizations and Notifications system enables team collaboration within NexaSuit CRM. Users can create organizations, invite team members, and receive real-time notifications for important events.

## Features

### Organizations

- **Create Organizations**: Users can create workspaces for team collaboration
- **Member Management**: Invite members via email with role-based access
- **Role-Based Access**: Three roles with different permissions:
  - **Owner**: Full control, can delete organization
  - **Admin**: Can manage members and settings
  - **Member**: Standard access to organization resources
- **Organization Scoping**: Tasks, clients, leads, and meetings can be scoped to organizations

### Notifications

- **Real-Time Updates**: Instant notifications via Supabase real-time subscriptions
- **Multiple Notification Types**:
  - Organization invites
  - Task assignments
  - Task completions and overdue alerts
  - Meeting scheduling and reminders
  - Lead assignments
  - Comments and mentions
- **Notification Preferences**: Granular control over notification channels (email, push, in-app)
- **Unread Badge**: Visual indicator for unread notifications

## Database Schema

### Tables

1. **organizations**

   - Organization details and settings
   - Owner relationship

2. **organization_members**

   - Member-organization relationships
   - Role and status tracking
   - Invitation metadata

3. **notifications**

   - Notification content and metadata
   - Read/unread status
   - Action URLs for navigation

4. **notification_preferences**
   - User-specific notification settings
   - Per-type channel preferences

### Row Level Security (RLS)

All tables have RLS policies ensuring:

- Users can only view organizations they belong to
- Only owners/admins can manage members
- Users can only see their own notifications
- Proper access control for all operations

## API Usage

### Organizations

```typescript
import { useOrganizations } from '@/hooks/useOrganizations';

function MyComponent() {
  const {
    organizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  } = useOrganizations();

  // Create organization
  await createOrganization.mutateAsync({
    name: 'My Team',
    description: 'Our workspace',
  });
}
```

### Organization Members

```typescript
import { useOrganizationMembers } from '@/hooks/useOrganizations';

function MembersComponent({ organizationId }) {
  const { members, inviteMember, removeMember, acceptInvite, rejectInvite } =
    useOrganizationMembers(organizationId);

  // Invite member
  await inviteMember.mutateAsync({
    organization_id: organizationId,
    user_email: 'user@example.com',
    role: 'member',
  });

  // Accept invite
  await acceptInvite.mutateAsync(membershipId);
}
```

### Notifications

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationsComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Mark as read
  await markAsRead.mutateAsync(notificationId);
}
```

### Creating Notifications

```typescript
import {
  notifyTaskAssigned,
  notifyMeetingScheduled,
} from '@/lib/notifications';

// Notify task assignment
await notifyTaskAssigned(
  assigneeId,
  'Complete project proposal',
  taskId,
  currentUserId
);

// Notify meeting scheduled
await notifyMeetingScheduled(
  attendeeId,
  'Q1 Planning Meeting',
  meetingId,
  currentUserId
);
```

## UI Components

### NotificationBell

Displays notification icon with unread count badge. Place in app header.

```typescript
<NotificationBell onPress={() => router.push('/notifications')} />
```

### NotificationList

Full notification feed with read/unread status and actions.

```typescript
<NotificationList />
```

### OrganizationCard

Display organization with member count.

```typescript
<OrganizationCard
  organization={org}
  memberCount={5}
  onPress={() => navigate(org.id)}
/>
```

### OrganizationInviteCard

Special card for organization invites with accept/reject actions.

```typescript
<OrganizationInviteCard notification={notification} />
```

## Navigation

### Screens

- `/organizations` - List of user's organizations
- `/organization-detail?id={id}` - Organization details and member management
- `/notifications` - Notification feed

### Integration

The notification bell is integrated into the sidebar header. Organizations menu item is in the main navigation section.

## Workflow

### Inviting Members

1. Owner/Admin opens organization detail
2. Clicks invite button
3. Enters member email and selects role
4. System creates pending membership
5. Notification sent to invited user
6. User receives notification with accept/reject actions
7. On accept, membership status changes to 'active'
8. On reject, membership is deleted

### Task Assignment with Organizations

When creating a task:

1. Select organization (optional)
2. Assign to organization member
3. System sends notification to assignee
4. Task appears in assignee's task list
5. Task is scoped to organization

## Best Practices

1. **Always check organization membership** before showing organization-scoped data
2. **Use notification helpers** from `lib/notifications.ts` for consistency
3. **Handle notification preferences** - respect user settings
4. **Clean up old notifications** - implement expiration logic
5. **Test RLS policies** - ensure proper access control

## Future Enhancements

- Push notifications via Expo Notifications
- Email notifications via Supabase Edge Functions
- Notification grouping and threading
- Organization settings and customization
- Team analytics and insights
- Bulk member operations
- Organization templates
