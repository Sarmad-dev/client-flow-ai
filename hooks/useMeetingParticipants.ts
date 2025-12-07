import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import type {
  MeetingParticipant,
  ParticipantInput,
  AttendanceStatus,
} from '@/types/meeting-management';

const participantKeys = {
  all: ['meeting-participants'] as const,
  byMeeting: (meetingId: string) =>
    [...participantKeys.all, 'meeting', meetingId] as const,
};

/**
 * Hook for managing meeting participants
 * Provides functions to add, remove, and update participant attendance
 * Includes real-time subscriptions for participant updates
 */
export function useMeetingParticipants(meetingId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Set up real-time subscription for participant updates
  useEffect(() => {
    if (!userId || !meetingId) return;

    const channel = supabase
      .channel(`meeting-participants-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          // Invalidate queries when participants change
          queryClient.invalidateQueries({
            queryKey: participantKeys.byMeeting(meetingId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, meetingId, queryClient]);

  // Query to fetch participants for a meeting
  const participantsQuery = useQuery({
    queryKey: participantKeys.byMeeting(meetingId),
    queryFn: async (): Promise<MeetingParticipant[]> => {
      if (!userId || !meetingId) return [];

      const { data, error } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as MeetingParticipant[];
    },
    enabled: !!userId && !!meetingId,
  });

  // Mutation to add a participant
  const addParticipantMutation = useMutation({
    mutationFn: async (
      participant: ParticipantInput
    ): Promise<MeetingParticipant> => {
      if (!userId || !meetingId) throw new Error('Not authenticated');

      const insertPayload = {
        meeting_id: meetingId,
        participant_type: participant.participant_type,
        participant_id: participant.participant_id ?? null,
        participant_name: participant.participant_name,
        participant_email: participant.participant_email ?? null,
        role: participant.role,
        attendance_status: 'pending' as AttendanceStatus,
      };

      const { data, error } = await supabase
        .from('meeting_participants')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data as MeetingParticipant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byMeeting(meetingId),
      });
      // Also invalidate the meeting detail query to update participant counts
      queryClient.invalidateQueries({
        queryKey: ['meetings', 'detail', meetingId],
      });
    },
  });

  // Mutation to remove a participant
  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string): Promise<void> => {
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('id', participantId)
        .eq('meeting_id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byMeeting(meetingId),
      });
      // Also invalidate the meeting detail query to update participant counts
      queryClient.invalidateQueries({
        queryKey: ['meetings', 'detail', meetingId],
      });
    },
  });

  // Mutation to update attendance status and track join/leave times
  const updateAttendanceMutation = useMutation({
    mutationFn: async ({
      participantId,
      status,
    }: {
      participantId: string;
      status: AttendanceStatus;
    }): Promise<MeetingParticipant> => {
      if (!userId) throw new Error('Not authenticated');

      // Fetch current participant data
      const { data: currentParticipant, error: fetchError } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('id', participantId)
        .eq('meeting_id', meetingId)
        .single();

      if (fetchError) throw fetchError;

      const now = new Date().toISOString();
      const updateData: Partial<MeetingParticipant> = {
        attendance_status: status,
        updated_at: now,
      };

      // Track join time when status changes to 'attended'
      if (status === 'attended' && !currentParticipant.joined_at) {
        updateData.joined_at = now;
      }

      // Track leave time and calculate duration when participant leaves
      // This happens when we update from 'attended' to another status
      if (
        currentParticipant.attendance_status === 'attended' &&
        status !== 'attended' &&
        currentParticipant.joined_at
      ) {
        updateData.left_at = now;

        // Calculate duration in minutes
        const joinedTime = new Date(currentParticipant.joined_at).getTime();
        const leftTime = new Date(now).getTime();
        const durationMinutes = Math.round((leftTime - joinedTime) / 60000);
        updateData.duration_minutes = durationMinutes;
      }

      const { data, error } = await supabase
        .from('meeting_participants')
        .update(updateData)
        .eq('id', participantId)
        .eq('meeting_id', meetingId)
        .select()
        .single();

      if (error) throw error;
      return data as MeetingParticipant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byMeeting(meetingId),
      });
      // Also invalidate the meeting detail query
      queryClient.invalidateQueries({
        queryKey: ['meetings', 'detail', meetingId],
      });
    },
  });

  // Function to send invitations to all participants
  const sendInvitationsMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!userId || !meetingId) throw new Error('Not authenticated');

      // Fetch meeting details
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      // Fetch all participants
      const { data: participants, error: participantsError } = await supabase
        .from('meeting_participants')
        .select('*')
        .eq('meeting_id', meetingId);

      if (participantsError) throw participantsError;

      // Create notifications for each participant
      const notifications = participants
        .filter((p) => p.participant_email) // Only send to participants with email
        .map((participant) => ({
          user_id: participant.participant_id ?? userId, // Use participant_id if available, otherwise meeting owner
          meeting_id: meetingId,
          type: 'confirmation' as const,
          title: `Meeting Invitation: ${meeting.title}`,
          message: `You have been invited to "${meeting.title}" on ${new Date(
            meeting.start_time
          ).toLocaleString()}`,
          is_read: false,
        }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) throw notificationError;
      }

      // TODO: In a production environment, this would also trigger email sending
      // via a Supabase Edge Function or external email service
    },
    onSuccess: () => {
      // Invalidate notifications query if it exists
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    participants: participantsQuery.data ?? [],
    isLoading: participantsQuery.isLoading,
    error: participantsQuery.error,
    addParticipant: addParticipantMutation.mutateAsync,
    removeParticipant: removeParticipantMutation.mutateAsync,
    updateAttendance: updateAttendanceMutation.mutateAsync,
    sendInvitations: sendInvitationsMutation.mutateAsync,
    isAddingParticipant: addParticipantMutation.isPending,
    isRemovingParticipant: removeParticipantMutation.isPending,
    isUpdatingAttendance: updateAttendanceMutation.isPending,
    isSendingInvitations: sendInvitationsMutation.isPending,
  };
}

/**
 * Return type for useMeetingParticipants hook
 */
export interface UseMeetingParticipantsReturn {
  participants: MeetingParticipant[];
  isLoading: boolean;
  error: Error | null;
  addParticipant: (
    participant: ParticipantInput
  ) => Promise<MeetingParticipant>;
  removeParticipant: (participantId: string) => Promise<void>;
  updateAttendance: (params: {
    participantId: string;
    status: AttendanceStatus;
  }) => Promise<MeetingParticipant>;
  sendInvitations: () => Promise<void>;
  isAddingParticipant: boolean;
  isRemovingParticipant: boolean;
  isUpdatingAttendance: boolean;
  isSendingInvitations: boolean;
}
