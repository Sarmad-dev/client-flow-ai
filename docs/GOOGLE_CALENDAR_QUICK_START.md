# Google Calendar Integration - Quick Start

## 🚀 Quick Setup (5 Minutes)

### 1. Environment Setup

```bash
# Add to .env file
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 2. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Calendar API**
3. Create **OAuth 2.0 Client ID** (Android/iOS)
4. Copy Client ID to `.env`

### 3. Test Connection

```bash
npm run dev
# Navigate to Calendar tab
# Click "Connect Google Calendar"
# Sign in with Google account
```

---

## 📱 User Features

### Calendar View

- **4 years visible** (24 months past + 24 months future)
- Scroll through multiple years
- See tasks and meetings marked on dates
- Click dates to see details

### Connect Google Account

1. Tap "Connect Google Calendar" button
2. Sign in with Google
3. Grant calendar permissions
4. See "✓ Connected" status

### Sync Tasks

1. Create new task
2. Check "Add to Google Calendar"
3. If not connected, tap "Connect Google Calendar"
4. Task appears in Google Calendar

### Sync Meetings

1. Create new meeting
2. Check "Add to Google Calendar"
3. If not connected, tap "Connect Google Calendar"
4. Meeting appears in Google Calendar with attendees

---

## 🔧 Developer Reference

### Import Hook

```typescript
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

const gc = useGoogleCalendar();
```

### Check Connection

```typescript
if (gc.isConnected) {
  // User is connected
  console.log('Connected as:', gc.user?.name);
} else {
  // Prompt to connect
  await gc.connect();
}
```

### Create Calendar Event

```typescript
const eventId = await gc.createCalendarEvent({
  summary: 'Meeting Title',
  description: 'Meeting description',
  start: {
    dateTime: startDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  end: {
    dateTime: endDate.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  attendees: [{ email: 'client@example.com' }],
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'popup', minutes: 15 },
      { method: 'email', minutes: 60 },
    ],
  },
});
```

### Update Event

```typescript
await gc.updateCalendarEvent(eventId, {
  summary: 'Updated Title',
});
```

### Delete Event

```typescript
await gc.deleteCalendarEvent(eventId);
```

### Get Events

```typescript
const events = await gc.getCalendarEvents(
  '2024-01-01T00:00:00Z',
  '2024-12-31T23:59:59Z'
);
```

---

## 🎯 Common Use Cases

### Task with Calendar Sync

```typescript
const handleCreateTask = async (taskData) => {
  // Create task in database
  const task = await createTask(taskData);

  // Sync to Google Calendar if enabled
  if (addToCalendar && gc.isConnected) {
    const eventId = await gc.createCalendarEvent({
      summary: `Task: ${task.title}`,
      description: task.description,
      start: {
        dateTime: task.due_date,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(
          new Date(task.due_date).getTime() + 3600000
        ).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    // Store event ID for future updates
    await updateTask(task.id, { google_calendar_event_id: eventId });
  }
};
```

### Meeting with Attendees

```typescript
const handleCreateMeeting = async (meetingData) => {
  // Create meeting in database
  const meeting = await createMeeting(meetingData);

  // Sync to Google Calendar if enabled
  if (addToCalendar && gc.isConnected) {
    const client = await getClient(meeting.client_id);

    const eventId = await gc.createCalendarEvent({
      summary: meeting.title,
      description: `${meeting.description}\n\nAgenda:\n${meeting.agenda}`,
      location: meeting.location,
      start: {
        dateTime: meeting.start_time,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: meeting.end_time,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: client.email ? [{ email: client.email }] : [],
    });

    // Store event ID
    await updateMeeting(meeting.id, { google_calendar_event_id: eventId });
  }
};
```

---

## 🐛 Troubleshooting

### "Failed to connect"

- ✅ Check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set
- ✅ Verify OAuth consent screen is configured
- ✅ Ensure Google Calendar API is enabled
- ✅ Check redirect URI matches app scheme

### "No valid access token"

- ✅ Clear AsyncStorage: `await AsyncStorage.clear()`
- ✅ Reconnect Google account
- ✅ Check token expiration handling

### Events not syncing

- ✅ Verify `gc.isConnected` is true
- ✅ Check timezone is set correctly
- ✅ Review error logs
- ✅ Test with fresh Google account

### Calendar only shows current year

- ✅ Verify `pastScrollRange={24}` and `futureScrollRange={24}`
- ✅ Update react-native-calendars if needed
- ✅ Check CalendarList component props

---

## 📊 API Limits

- **Queries per day**: 1,000,000
- **Queries per 100 seconds per user**: 1,000
- **Queries per 100 seconds**: 10,000

**Note**: Well within limits for typical usage

---

## 🔒 Security Checklist

- [x] OAuth 2.0 with PKCE flow
- [x] No client secret in mobile app
- [x] Tokens encrypted in AsyncStorage
- [x] Automatic token refresh
- [x] Minimal scope permissions
- [x] Secure token storage
- [x] No sensitive data in logs

---

## 📚 Documentation

- **Full Guide**: `docs/google-calendar-integration.md`
- **Updates**: `docs/GOOGLE_CALENDAR_UPDATES.md`
- **Summary**: `docs/GOOGLE_CALENDAR_SUMMARY.md`
- **Quick Start**: `docs/GOOGLE_CALENDAR_QUICK_START.md` (this file)

---

## ✅ Feature Checklist

- [x] Multi-year calendar view (4 years)
- [x] Google OAuth authentication
- [x] Task sync to Google Calendar
- [x] Meeting sync to Google Calendar
- [x] Connection status indicator
- [x] User profile display
- [x] Disconnect functionality
- [x] Timezone handling
- [x] Custom reminders
- [x] Attendee management
- [x] Success/error feedback
- [x] TypeScript type safety
- [x] Comprehensive documentation

---

## 🎉 You're Ready!

The Google Calendar integration is fully functional and ready to use. Users can:

1. ✅ View 4 years of calendar data
2. ✅ Connect their Google account securely
3. ✅ Sync tasks to Google Calendar
4. ✅ Sync meetings to Google Calendar
5. ✅ See connection status
6. ✅ Manage their connection

For detailed information, see the full documentation in `docs/google-calendar-integration.md`.
