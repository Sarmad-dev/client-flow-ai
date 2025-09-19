import React, { useMemo } from 'react';
import { MeetingForm } from '../MeetingForm';
import { useClients } from '@/hooks/useClients';
import { useUpdateMeeting, MeetingRecord } from '@/hooks/useMeetings';

interface MeetingEditModalProps {
  visible: boolean;
  onClose: () => void;
  meeting: MeetingRecord | null;
  onUpdated?: (meeting: MeetingRecord) => void;
}

export function MeetingEditModal({
  visible,
  onClose,
  meeting,
  onUpdated,
}: MeetingEditModalProps) {
  const clientsQuery = useClients();
  const clients = useMemo(
    () =>
      (clientsQuery.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company ?? '',
      })),
    [clientsQuery.data]
  );
  const updateMeeting = useUpdateMeeting();

  if (!meeting) return null;

  // Helper function to safely parse dates (same as in MeetingDetailModal)
  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    // Try different date parsing approaches
    let date = new Date(dateString);

    // If the first attempt fails, try parsing as ISO string
    if (isNaN(date.getTime())) {
      date = new Date(dateString + 'Z'); // Add Z for UTC if missing
    }

    // If still fails, try parsing as timestamp
    if (isNaN(date.getTime())) {
      const timestamp = parseInt(dateString);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }

    // If still fails, try parsing with different formats
    if (isNaN(date.getTime())) {
      // Try parsing as date with timezone offset
      const dateWithOffset = dateString.replace(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
        '$1Z'
      );
      date = new Date(dateWithOffset);
    }

    // If all attempts fail, return current date as fallback
    if (isNaN(date.getTime())) {
      console.warn('MeetingEditModal - Failed to parse date:', dateString);
      return new Date();
    }

    return date;
  };

  return (
    <MeetingForm
      visible={visible}
      onClose={onClose}
      clients={clients}
      initialData={{
        title: meeting.title,
        description: meeting.description ?? '',
        selectedClient: meeting.client_id ?? '',
        startDate: parseDate(meeting.start_time),
        endDate: parseDate(meeting.end_time),
        location: meeting.location ?? '',
        meetingType: meeting.meeting_type,
        agenda: meeting.agenda ?? '',
      }}
      onSubmit={async (formData) => {
        const updatedMeeting = await updateMeeting.mutateAsync({
          id: meeting.id,
          title: formData.title,
          description: formData.description,
          client_id: formData.clientId,
          meeting_type: formData.meetingType,
          start_time: formData.startDate.toISOString(),
          end_time: formData.endDate.toISOString(),
          location: formData.location,
          agenda: formData.agenda,
        });
        onUpdated?.(updatedMeeting);
      }}
    />
  );
}
