import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import type {
  EnrichedMeeting,
  MeetingParticipant,
  MeetingSearchFilters,
} from '@/types/meeting-management';

export interface MeetingRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  meeting_type: 'video' | 'phone' | 'in-person';
  start_time: string;
  end_time: string;
  location: string | null;
  agenda: string | null;
  summary: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  voice_recording_id: string | null;
  google_calendar_event_id: string | null;
  zoom_meeting_id: string | null;
  teams_meeting_id: string | null;
  meet_link: string | null;
  template_id: string | null;
  engagement_score: number | null;
  preparation_sent: boolean;
  follow_up_sent: boolean;
  created_at: string;
  updated_at: string;
}

const meetingKeys = {
  all: ['meetings'] as const,
  list: (userId?: string, filters?: MeetingSearchFilters) =>
    [...meetingKeys.all, 'list', userId, filters] as const,
  detail: (meetingId: string) =>
    [...meetingKeys.all, 'detail', meetingId] as const,
};

/**
 * Hook for fetching enriched meetings with participants and counts
 * Supports filtering, sorting, and real-time subscriptions
 */
export function useMeetings(filters?: MeetingSearchFilters) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Set up real-time subscription for meeting updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate queries when meetings change
          queryClient.invalidateQueries({ queryKey: meetingKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: meetingKeys.list(userId, filters),
    queryFn: async (): Promise<EnrichedMeeting[]> => {
      if (!userId) return [];

      // Build the base query
      let query = supabase
        .from('meetings')
        .select(
          `
          *,
          clients(name),
          meeting_participants(
            id,
            meeting_id,
            participant_type,
            participant_id,
            participant_name,
            participant_email,
            role,
            attendance_status,
            joined_at,
            left_at,
            duration_minutes,
            created_at,
            updated_at
          )
        `
        )
        .eq('user_id', userId);

      // Apply filters
      if (filters) {
        // Status filter
        if (filters.statuses && filters.statuses.length > 0) {
          query = query.in('status', filters.statuses);
        }

        // Meeting type filter
        if (filters.meeting_types && filters.meeting_types.length > 0) {
          query = query.in('meeting_type', filters.meeting_types);
        }

        // Client filter
        if (filters.client_ids && filters.client_ids.length > 0) {
          query = query.in('client_id', filters.client_ids);
        }

        // Date range filter
        if (filters.date_range) {
          query = query
            .gte('start_time', filters.date_range.start)
            .lte('start_time', filters.date_range.end);
        }

        // Text search filter
        if (filters.query) {
          query = query.or(
            `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,summary.ilike.%${filters.query}%`
          );
        }
      }

      // Default ordering by start_time descending
      query = query.order('start_time', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Fetch counts for each meeting
      const meetingsWithCounts = await Promise.all(
        (data ?? []).map(async (meeting: any) => {
          // Get action items count
          const { count: actionItemsCount } = await supabase
            .from('meeting_action_items')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', meeting.id);

          // Get transcript segments count
          const { count: transcriptCount } = await supabase
            .from('meeting_transcripts')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', meeting.id);

          // Get notes count
          const { count: notesCount } = await supabase
            .from('meeting_notes')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', meeting.id);

          // Get decisions count
          const { count: decisionsCount } = await supabase
            .from('meeting_decisions')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', meeting.id);

          return {
            id: meeting.id,
            user_id: meeting.user_id,
            client_id: meeting.client_id,
            title: meeting.title,
            description: meeting.description,
            meeting_type: meeting.meeting_type,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            location: meeting.location,
            agenda: meeting.agenda,
            summary: meeting.summary,
            status: meeting.status,
            voice_recording_id: meeting.voice_recording_id,
            google_calendar_event_id: meeting.google_calendar_event_id,
            zoom_meeting_id: meeting.zoom_meeting_id,
            teams_meeting_id: meeting.teams_meeting_id,
            meet_link: meeting.meet_link,
            template_id: meeting.template_id,
            engagement_score: meeting.engagement_score,
            preparation_sent: meeting.preparation_sent,
            follow_up_sent: meeting.follow_up_sent,
            created_at: meeting.created_at,
            updated_at: meeting.updated_at,
            client_name: meeting.clients?.name ?? null,
            participants: (meeting.meeting_participants ??
              []) as MeetingParticipant[],
            action_items_count: actionItemsCount ?? 0,
            transcript_segments_count: transcriptCount ?? 0,
            notes_count: notesCount ?? 0,
            decisions_count: decisionsCount ?? 0,
          } as EnrichedMeeting;
        })
      );

      return meetingsWithCounts;
    },
    enabled: !!userId,
  });
}

/**
 * Hook for fetching a single enriched meeting with all related data
 */
export function useMeeting(meetingId: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Set up real-time subscription for this specific meeting
  useEffect(() => {
    if (!userId || !meetingId) return;

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: meetingKeys.detail(meetingId),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: meetingKeys.detail(meetingId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, meetingId, queryClient]);

  return useQuery({
    queryKey: meetingKeys.detail(meetingId),
    queryFn: async (): Promise<EnrichedMeeting | null> => {
      if (!userId || !meetingId) return null;

      const { data: meeting, error } = await supabase
        .from('meetings')
        .select(
          `
          *,
          clients(name),
          meeting_participants(
            id,
            meeting_id,
            participant_type,
            participant_id,
            participant_name,
            participant_email,
            role,
            attendance_status,
            joined_at,
            left_at,
            duration_minutes,
            created_at,
            updated_at
          )
        `
        )
        .eq('id', meetingId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!meeting) return null;

      // Get counts
      const { count: actionItemsCount } = await supabase
        .from('meeting_action_items')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', meeting.id);

      const { count: transcriptCount } = await supabase
        .from('meeting_transcripts')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', meeting.id);

      const { count: notesCount } = await supabase
        .from('meeting_notes')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', meeting.id);

      const { count: decisionsCount } = await supabase
        .from('meeting_decisions')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_id', meeting.id);

      return {
        id: meeting.id,
        user_id: meeting.user_id,
        client_id: meeting.client_id,
        title: meeting.title,
        description: meeting.description,
        meeting_type: meeting.meeting_type,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        location: meeting.location,
        agenda: meeting.agenda,
        summary: meeting.summary,
        status: meeting.status,
        voice_recording_id: meeting.voice_recording_id,
        google_calendar_event_id: meeting.google_calendar_event_id,
        zoom_meeting_id: meeting.zoom_meeting_id,
        teams_meeting_id: meeting.teams_meeting_id,
        meet_link: meeting.meet_link,
        template_id: meeting.template_id,
        engagement_score: meeting.engagement_score,
        preparation_sent: meeting.preparation_sent,
        follow_up_sent: meeting.follow_up_sent,
        created_at: meeting.created_at,
        updated_at: meeting.updated_at,
        client_name: meeting.clients?.name ?? null,
        participants: (meeting.meeting_participants ??
          []) as MeetingParticipant[],
        action_items_count: actionItemsCount ?? 0,
        transcript_segments_count: transcriptCount ?? 0,
        notes_count: notesCount ?? 0,
        decisions_count: decisionsCount ?? 0,
      } as EnrichedMeeting;
    },
    enabled: !!userId && !!meetingId,
  });
}

/**
 * Hook for creating a new meeting with enhanced fields
 */
export function useCreateMeeting() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<
        MeetingRecord,
        'id' | 'user_id' | 'created_at' | 'updated_at'
      > & {
        status?: MeetingRecord['status'];
      }
    ): Promise<MeetingRecord> => {
      if (!userId) throw new Error('Not authenticated');
      const insertPayload = {
        user_id: userId,
        client_id: payload.client_id ?? null,
        title: payload.title,
        description: payload.description ?? null,
        meeting_type: payload.meeting_type,
        start_time: payload.start_time,
        end_time: payload.end_time,
        location: payload.location ?? null,
        agenda: payload.agenda ?? null,
        summary: payload.summary ?? null,
        status: payload.status ?? 'scheduled',
        voice_recording_id: payload.voice_recording_id ?? null,
        google_calendar_event_id: payload.google_calendar_event_id ?? null,
        zoom_meeting_id: payload.zoom_meeting_id ?? null,
        teams_meeting_id: payload.teams_meeting_id ?? null,
        meet_link: payload.meet_link ?? null,
        template_id: payload.template_id ?? null,
        engagement_score: payload.engagement_score ?? null,
        preparation_sent: payload.preparation_sent ?? false,
        follow_up_sent: payload.follow_up_sent ?? false,
      };
      const { data, error } = await supabase
        .from('meetings')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MeetingRecord;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all as any });

      // Send notifications to participants
      const { notifyMeetingScheduled } = await import('@/lib/notifications');

      // Get organizer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', userId)
        .single();

      const organizerName = profile?.full_name || profile?.email || 'Someone';

      // Get participants
      const { data: participants } = await supabase
        .from('meeting_participants')
        .select('participant_id, participant_type')
        .eq('meeting_id', data.id);

      if (participants) {
        for (const participant of participants) {
          // Only notify if participant is a user (not external)
          if (
            participant.participant_type === 'user' &&
            participant.participant_id !== profile?.id
          ) {
            await notifyMeetingScheduled({
              userId: participant.participant_id,
              meetingId: data.id,
              meetingTitle: data.title,
              startTime: data.start_time,
              organizer: organizerName,
            });
          }
        }
      }
    },
  });
}

/**
 * Hook for updating an existing meeting
 */
export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: { id: string } & Partial<MeetingRecord>
    ): Promise<MeetingRecord> => {
      const { id, ...updateData } = payload;

      // Set updated_at timestamp
      const dataToUpdate = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('meetings')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MeetingRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all as any });
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(data.id) as any,
      });
    },
  });
}

/**
 * Hook for transitioning meeting status
 * Supports: scheduled -> in_progress -> completed
 * Also supports: scheduled/in_progress -> cancelled
 */
export function useUpdateMeetingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      newStatus,
    }: {
      meetingId: string;
      newStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    }): Promise<MeetingRecord> => {
      // Validate status transition
      const { data: currentMeeting, error: fetchError } = await supabase
        .from('meetings')
        .select('status')
        .eq('id', meetingId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = currentMeeting.status;

      // Define valid transitions
      const validTransitions: Record<string, string[]> = {
        scheduled: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: [], // Cannot transition from completed
        cancelled: [], // Cannot transition from cancelled
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${newStatus}`
        );
      }

      // Update the status
      const { data, error } = await supabase
        .from('meetings')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as MeetingRecord;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all as any });
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(data.id) as any,
      });

      // Send cancellation notifications if meeting was cancelled
      if (variables.newStatus === 'cancelled') {
        const { notifyMeetingCancelled } = await import('@/lib/notifications');

        // Get meeting details
        const { data: meeting } = await supabase
          .from('meetings')
          .select('title, user_id')
          .eq('id', data.id)
          .single();

        if (!meeting) return;

        // Get organizer profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('user_id', meeting.user_id)
          .single();

        const cancelledByName =
          profile?.full_name || profile?.email || 'Someone';

        // Get participants
        const { data: participants } = await supabase
          .from('meeting_participants')
          .select('participant_id, participant_type')
          .eq('meeting_id', data.id);

        if (participants) {
          for (const participant of participants) {
            // Only notify if participant is a user (not external)
            if (
              participant.participant_type === 'user' &&
              participant.participant_id !== profile?.id
            ) {
              await notifyMeetingCancelled({
                userId: participant.participant_id,
                meetingId: data.id,
                meetingTitle: meeting.title,
                cancelledBy: cancelledByName,
              });
            }
          }
        }
      }
    },
  });
}
