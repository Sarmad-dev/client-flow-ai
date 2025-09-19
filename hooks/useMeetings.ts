import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  status: 'scheduled' | 'completed' | 'cancelled';
  voice_recording_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedMeeting extends MeetingRecord {
  client_name: string | null;
}

const meetingKeys = {
  all: ['meetings'] as const,
  list: (userId?: string) => [...meetingKeys.all, 'list', userId] as const,
};

export function useMeetings() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: meetingKeys.list(userId),
    queryFn: async (): Promise<EnrichedMeeting[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('meetings')
        .select('*, clients(name)')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...(m as MeetingRecord),
        client_name: m.clients?.name ?? null,
      }));
    },
    enabled: !!userId,
  });
}

export function useCreateMeeting() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<
        MeetingRecord,
        'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'
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
      };
      const { data, error } = await supabase
        .from('meetings')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MeetingRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all as any });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: { id: string } & Partial<MeetingRecord>
    ): Promise<MeetingRecord> => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MeetingRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all as any });
    },
  });
}
