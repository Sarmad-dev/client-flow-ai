# Google Calendar Integration Guide

## Overview

NexaSuit integrates with Google Calendar to sync tasks and meetings, providing seamless calendar management across platforms. The integration uses OAuth 2.0 with PKCE flow for secure authentication.

## Features

### ✅ Implemented Features

1. **OAuth 2.0 Authentication**

   - Secure Google Sign-In with PKCE flow
   - Token refresh mechanism
   - Persistent session storage
   - Proper token expiration handling

2. **Multi-Year Calendar View**

   - Shows 24 months in the past
   - Shows 24 months in the future
   - Total: 4 years of calendar data visible

3. **Task Sync to Google Calendar**

   - Tasks automatically create calendar events
   - Due date becomes event time
   - Task description included in event notes
   - Reminders set (30 minutes before, 1 day before)

4. **Meeting Sync to Google Calendar**

   - Meetings create calendar events with proper time slots
   - Attendees automatically added (client email)
   - Meeting location/link included
   - Agenda added to event description
   - Reminders set (15 minutes before, 1 hour before)

5. **Connection Management**

   - Visual connection status indicator
   - User profile display when connected
   - Easy disconnect option
   - Reconnection flow

6. **Event Management**
   - Create calendar events
   - Update existing events
   - Delete events
   - Fetch events by date range

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable APIs:
   - Google Calendar API
   - Google Tasks API
4. Create OAuth 2.0 credentials:
   - Application type: Android/iOS
   - Package name: Your app's bundle ID
   - SHA-1 certificate fingerprint (for Android)

### 2. Environment Configuration

Add to your `.env` file:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. App Configuration

Update `app.json`:

```json
{
  "expo": {
    "scheme": "nexasuit",
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.yourcompany.nexasuit"
    }
  }
}
```

## Usage

### Connecting Google Calendar

```typescript
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

function MyComponent() {
  const google = useGoogleCalendar();

  const handleConnect = async () => {
    await google.connect();
  };

  return (
    <View>
      {google.isConnected ? (
        <Text>Connected as {google.user?.name}</Text>
      ) : (
        <Button title="Connect Google Calendar" onPress={handleConnect} />
      )}
    </View>
  );
}
```

### Creating Calendar Events

```typescript
// For Tasks
const eventId = await google.createCalendarEvent({
  summary: `Task: ${task.title}`,
  description: task.description,
  start: {
    dateTime: dueDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  end: {
    dateTime: new Date(dueDate.getTime() + 3600000).toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'popup', minutes: 30 },
      { method: 'email', minutes: 1440 },
    ],
  },
});

// For Meetings
const eventId = await google.createCalendarEvent({
  summary: meeting.title,
  description: `${meeting.description}\n\nAgenda:\n${meeting.agenda}`,
  location: meeting.location,
  start: {
    dateTime: meeting.startDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  end: {
    dateTime: meeting.endDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  attendees: [{ email: client.email, responseStatus: 'needsAction' }],
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'popup', minutes: 15 },
      { method: 'email', minutes: 60 },
    ],
  },
});
```

### Updating Events

```typescript
const success = await google.updateCalendarEvent(eventId, {
  summary: 'Updated Title',
  start: {
    dateTime: newStartDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});
```

### Deleting Events

```typescript
const success = await google.deleteCalendarEvent(eventId);
```

### Fetching Events

```typescript
const events = await google.getCalendarEvents(
  new Date('2024-01-01').toISOString(),
  new Date('2024-12-31').toISOString()
);
```

## API Reference

### `useGoogleCalendar()` Hook

Returns an object with the following properties and methods:

#### Properties

- `user: any | null` - Google user profile information
- `isConnected: boolean` - Whether user is authenticated
- `loading: boolean` - Loading state for async operations
- `error: Error | null` - Last error that occurred

#### Methods

##### `connect(): Promise<void>`

Initiates Google OAuth flow to connect user's account.

##### `disconnect(): Promise<void>`

Disconnects user's Google account and clears stored tokens.

##### `getAccessToken(): Promise<string | null>`

Gets current access token, refreshing if expired.

##### `createCalendarEvent(event: CalendarEvent): Promise<string | null>`

Creates a new calendar event. Returns event ID on success.

**Parameters:**

```typescript
interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative';
  }>;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}
```

##### `updateCalendarEvent(eventId: string, event: Partial<CalendarEvent>): Promise<boolean>`

Updates an existing calendar event. Returns true on success.

##### `deleteCalendarEvent(eventId: string): Promise<boolean>`

Deletes a calendar event. Returns true on success.

##### `getCalendarEvents(timeMin: string, timeMax: string): Promise<any[]>`

Fetches calendar events within a date range.

##### `createTask(task: Task): Promise<string | null>`

Creates a Google Task. Returns task ID on success.

##### `refreshToken(): Promise<boolean>`

Manually refreshes the access token. Returns true on success.

## UI Components

### Calendar Screen

**Location**: `app/(tabs)/calendar.tsx`

**Features**:

- Multi-year calendar view (4 years total)
- Visual indicators for tasks and meetings
- Connection status display
- Quick connect/disconnect
- Date selection with item list

### Task Form

**Location**: `components/TaskForm.tsx`

**Features**:

- "Add to Google Calendar" toggle
- Automatic connection prompt
- Success/error feedback
- Timezone-aware event creation

### Meeting Form

**Location**: `components/MeetingForm.tsx`

**Features**:

- "Add to Google Calendar" toggle
- Automatic connection prompt
- Attendee management
- Location/link inclusion
- Success/error feedback

## Data Flow

### Task Creation Flow

1. User creates task in TaskForm
2. If "Add to Google Calendar" is checked:
   - Check if Google is connected
   - If not connected, prompt user to connect
   - Create calendar event with task details
   - Store event ID in task record (for future updates)
3. Task saved to Supabase
4. Calendar UI updates automatically

### Meeting Creation Flow

1. User creates meeting in MeetingForm
2. If "Add to Google Calendar" is checked:
   - Check if Google is connected
   - If not connected, prompt user to connect
   - Create calendar event with meeting details
   - Add client as attendee if email available
   - Store event ID in meeting record
3. Meeting saved to Supabase
4. Calendar UI updates automatically

## Storage

### AsyncStorage Keys

- `google_calendar_token` - OAuth token data
- `google_calendar_user` - User profile information
- `google_calendar_refresh_token` - Refresh token for token renewal

### Database Fields

Tasks and meetings should store:

- `google_calendar_event_id: string | null` - Link to Google Calendar event

## Error Handling

### Common Errors

1. **Token Expired**

   - Automatically refreshed using refresh token
   - User re-prompted to connect if refresh fails

2. **Network Errors**

   - Graceful fallback with error message
   - Retry mechanism for critical operations

3. **Permission Denied**

   - Clear error message to user
   - Option to reconnect with proper permissions

4. **API Rate Limits**
   - Exponential backoff for retries
   - User notification if persistent

## Security Considerations

1. **Token Storage**

   - Tokens stored in AsyncStorage (encrypted on device)
   - Never exposed in logs or error messages
   - Cleared on logout/disconnect

2. **OAuth Flow**

   - Uses PKCE (Proof Key for Code Exchange)
   - No client secret required for mobile apps
   - Redirect URI validated by Google

3. **Permissions**
   - Only requests necessary scopes:
     - `calendar` - Read/write calendar events
     - `calendar.events` - Manage calendar events
     - `tasks` - Manage Google Tasks

## Testing

### Manual Testing Checklist

- [ ] Connect Google account successfully
- [ ] Create task with calendar sync
- [ ] Create meeting with calendar sync
- [ ] Verify events appear in Google Calendar
- [ ] Update task/meeting and verify calendar update
- [ ] Delete task/meeting and verify calendar deletion
- [ ] Disconnect and reconnect account
- [ ] Test token refresh after expiration
- [ ] Test with no internet connection
- [ ] Test calendar view scrolling (multiple years)

### Test Accounts

Use test Google accounts for development:

- Create dedicated test accounts
- Don't use personal accounts
- Clear test data regularly

## Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to Google"
**Solutions**:

- Verify `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is correct
- Check OAuth consent screen is configured
- Ensure redirect URI matches app scheme
- Verify Google Calendar API is enabled

### Token Issues

**Problem**: "No valid access token"
**Solutions**:

- Clear AsyncStorage and reconnect
- Check token expiration handling
- Verify refresh token is stored
- Re-authenticate user

### Calendar Not Syncing

**Problem**: Events not appearing in Google Calendar
**Solutions**:

- Check event creation response for errors
- Verify timezone is set correctly
- Ensure user has calendar write permissions
- Check API quota limits

### Multi-Year View Not Working

**Problem**: Calendar only shows current year
**Solutions**:

- Verify `pastScrollRange={24}` and `futureScrollRange={24}` are set
- Check CalendarList component props
- Update react-native-calendars if needed

## Future Enhancements

### Planned Features

1. **Two-Way Sync**

   - Import events from Google Calendar
   - Real-time sync with webhooks
   - Conflict resolution

2. **Multiple Calendars**

   - Support for multiple Google calendars
   - Calendar selection per task/meeting
   - Color coding by calendar

3. **Recurring Events**

   - Support for recurring tasks
   - Recurring meeting patterns
   - Exception handling

4. **Offline Support**

   - Queue sync operations when offline
   - Sync when connection restored
   - Conflict resolution

5. **Advanced Reminders**

   - Custom reminder times
   - Multiple reminder methods
   - Smart reminder suggestions

6. **Calendar Sharing**
   - Share calendar with team members
   - Permission management
   - Collaborative scheduling

## Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [React Native Calendars](https://github.com/wix/react-native-calendars)

## Support

For issues or questions:

1. Check this documentation
2. Review error logs
3. Test with fresh Google account
4. Contact development team
