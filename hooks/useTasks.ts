import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  tag: 'follow-up' | 'proposal' | 'meeting' | 'call' | 'research' | 'design';
  due_date: string | null;
  voice_recording_id: string | null;
  ai_generated: boolean;
  ai_confidence_score: number | null;
  created_at: string;
  updated_at: string;
}

const tasksKeys = {
  all: ['tasks'] as const,
  list: (userId?: string) => [...tasksKeys.all, 'list', userId] as const,
};

export function useTasks() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: tasksKeys.list(userId),
    queryFn: async (): Promise<TaskRecord[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, clients(name, company)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TaskRecord[];
    },
    enabled: !!userId,
  });
}

export function useCreateTask() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<TaskRecord> & {
        title: string;
        client_id: string;
        due_date?: string | null;
      }
    ): Promise<TaskRecord> => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: payload.title,
          description: payload.description ?? null,
          client_id: payload.client_id,
          due_date: payload.due_date ?? null,
          tag: (payload.tag ?? 'follow-up') as TaskRecord['tag'],
          status: (payload.status ?? 'pending') as TaskRecord['status'],
          priority: (payload.priority ?? 'medium') as TaskRecord['priority'],
          voice_recording_id: payload.voice_recording_id ?? null,
          ai_generated: payload.ai_generated ?? false,
          ai_confidence_score: payload.ai_confidence_score ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; to: TaskRecord['status'] }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: payload.to })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: { id: string } & Partial<TaskRecord>
    ): Promise<TaskRecord> => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TaskRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}
