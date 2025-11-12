// Example usage of the updated useGoogleCalendar hook

import { useGoogleCalendar } from './useGoogleCalendar';

export function GoogleCalendarExample() {
  const {
    user,
    isConnected,
    loading,
    error,
    connect,
    disconnect,
    createCalendarEvent,
    createTask,
  } = useGoogleCalendar();

  const handleCreateMeeting = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    // Create a calendar event
    const eventId = await createCalendarEvent({
      summary: 'Team Meeting',
      description: 'Weekly team sync meeting',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(
          Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000
        ).toISOString(), // Tomorrow + 1 hour
        timeZone: 'America/New_York',
      },
      attendees: [{ email: 'team@example.com' }],
      location: 'Conference Room A',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 60 },
        ],
      },
    });

    if (eventId) {
      console.log('Meeting created with ID:', eventId);
    }
  };

  const handleCreateTask = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    // Create a task
    const taskId = await createTask({
      title: 'Review project proposal',
      notes: 'Review the Q4 project proposal and provide feedback',
      due: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      status: 'needsAction',
    });

    if (taskId) {
      console.log('Task created with ID:', taskId);
    }
  };

  return {
    user,
    isConnected,
    loading,
    error,
    connect,
    disconnect,
    handleCreateMeeting,
    handleCreateTask,
  };
}

// Usage in a React component:
/*
import React from 'react';
import { View, Button, Text } from 'react-native';
import { GoogleCalendarExample } from './hooks/useGoogleCalendar.example';

export default function CalendarScreen() {
  const {
    user,
    isConnected,
    loading,
    error,
    connect,
    disconnect,
    handleCreateMeeting,
    handleCreateTask,
  } = GoogleCalendarExample();

  return (
    <View style={{ padding: 20 }}>
      {isConnected ? (
        <>
          <Text>Connected as: {user?.email}</Text>
          <Button title="Create Meeting" onPress={handleCreateMeeting} />
          <Button title="Create Task" onPress={handleCreateTask} />
          <Button title="Disconnect" onPress={disconnect} />
        </>
      ) : (
        <Button title="Connect to Google Calendar" onPress={connect} />
      )}
      
      {loading && <Text>Loading...</Text>}
      {error && <Text>Error: {error.message}</Text>}
    </View>
  );
}
*/
