import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  SubtaskRecord,
  BulkTaskOperation,
  BulkOperationResult,
} from '@/types/task-management';

const subtasksKeys = {
  all: ['subtasks'] as const,
  byParent: (parentTaskId: string) =>
    [...subtasksKeys.all, 'parent', parentTaskId] as const,
  list: (userId?: string) => [...subtasksKeys.all, 'list', userId] as const,
};

// Hook to get subtasks for a specific parent task
export function useSubtasks(parentTaskId: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: subtasksKeys.byParent(parentTaskId),
    queryFn: async (): Promise<SubtaskRecord[]> => {
      if (!userId || !parentTaskId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          time_entries(*),
          comments:task_comments(*),
          assignments:task_assignments(*)
        `
        )
        .eq('parent_task_id', parentTaskId)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as SubtaskRecord[];
    },
    enabled: !!userId && !!parentTaskId,
  });
}

// Hook to get all subtasks for the current user
export function useAllSubtasks() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: subtasksKeys.list(userId),
    queryFn: async (): Promise<SubtaskRecord[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          parent_task:tasks!parent_task_id(id, title, status),
          time_entries(*),
          comments:task_comments(*),
          assignments:task_assignments(*)
        `
        )
        .eq('user_id', userId)
        .not('parent_task_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SubtaskRecord[];
    },
    enabled: !!userId,
  });
}

// CRUD operations for subtasks
export function useCreateSubtask() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Partial<SubtaskRecord> & {
        title: string;
        parent_task_id: string;
      }
    ): Promise<SubtaskRecord> => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          parent_task_id: payload.parent_task_id,
          title: payload.title,
          description: payload.description ?? null,
          client_id: payload.client_id ?? null,
          due_date: payload.due_date ?? null,
          tag: (payload.tag ?? 'follow-up') as SubtaskRecord['tag'],
          status: (payload.status ?? 'pending') as SubtaskRecord['status'],
          priority: (payload.priority ?? 'medium') as SubtaskRecord['priority'],
          estimated_hours: payload.estimated_hours ?? null,
          actual_hours: payload.actual_hours ?? 0,
          progress_percentage: payload.progress_percentage ?? 0,
          voice_recording_id: payload.voice_recording_id ?? null,
          ai_generated: payload.ai_generated ?? false,
          ai_confidence_score: payload.ai_confidence_score ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SubtaskRecord;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: subtasksKeys.byParent(data.parent_task_id!),
      });
      queryClient.invalidateQueries({ queryKey: subtasksKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Update parent task progress
      updateParentTaskProgress(data.parent_task_id!, queryClient);
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: { id: string } & Partial<SubtaskRecord>
    ): Promise<SubtaskRecord> => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SubtaskRecord;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (data.parent_task_id) {
        queryClient.invalidateQueries({
          queryKey: subtasksKeys.byParent(data.parent_task_id),
        });
        updateParentTaskProgress(data.parent_task_id, queryClient);
      }
      queryClient.invalidateQueries({ queryKey: subtasksKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; parent_task_id: string }) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', payload.id);

      if (error) throw error;
      return payload.parent_task_id;
    },
    onSuccess: (parentTaskId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: subtasksKeys.byParent(parentTaskId),
      });
      queryClient.invalidateQueries({ queryKey: subtasksKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Update parent task progress
      updateParentTaskProgress(parentTaskId, queryClient);
    },
  });
}

// Bulk operations for subtask management
export function useBulkUpdateSubtasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      operation: BulkTaskOperation
    ): Promise<BulkOperationResult> => {
      const results: BulkOperationResult = {
        success_count: 0,
        error_count: 0,
        errors: [],
      };

      for (const taskId of operation.task_ids) {
        try {
          let updateData: any = {};

          switch (operation.operation) {
            case 'update_status':
              updateData.status = operation.parameters.status;
              break;
            case 'update_priority':
              updateData.priority = operation.parameters.priority;
              break;
            case 'set_due_date':
              updateData.due_date = operation.parameters.due_date;
              break;
            case 'add_tag':
              updateData.tag = operation.parameters.tag;
              break;
            case 'delete':
              const { error: deleteError } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

              if (deleteError) throw deleteError;
              results.success_count++;
              continue;
            default:
              throw new Error(`Unsupported operation: ${operation.operation}`);
          }

          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
              .from('tasks')
              .update(updateData)
              .eq('id', taskId);

            if (error) throw error;
          }

          results.success_count++;
        } catch (error) {
          results.error_count++;
          results.errors.push({
            task_id: taskId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    },
    onSuccess: () => {
      // Invalidate all subtask queries
      queryClient.invalidateQueries({ queryKey: subtasksKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Reorder subtasks within a parent task
export function useReorderSubtasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      parent_task_id: string;
      subtask_orders: Array<{ id: string; order: number }>;
    }) => {
      // Update each subtask with its new order
      const updates = payload.subtask_orders.map(({ id, order }) =>
        supabase.from('tasks').update({ order_index: order }).eq('id', id)
      );

      const results = await Promise.allSettled(updates);

      // Check if any updates failed
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to reorder ${failures.length} subtasks`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: subtasksKeys.byParent(variables.parent_task_id),
      });
    },
  });
}

// Progress calculation and status propagation logic
export function useSubtaskProgress(parentTaskId: string) {
  const { data: subtasks } = useSubtasks(parentTaskId);

  const progress = React.useMemo(() => {
    if (!subtasks || subtasks.length === 0) {
      return {
        total: 0,
        completed: 0,
        percentage: 0,
        inProgress: 0,
        pending: 0,
        blocked: 0,
      };
    }

    const completed = subtasks.filter(
      (task) => task.status === 'completed'
    ).length;
    const inProgress = subtasks.filter(
      (task) => task.status === 'in_progress'
    ).length;
    const pending = subtasks.filter((task) => task.status === 'pending').length;
    const blocked = subtasks.filter((task) => task.status === 'blocked').length;
    const percentage = Math.round((completed / subtasks.length) * 100);

    return {
      total: subtasks.length,
      completed,
      percentage,
      inProgress,
      pending,
      blocked,
    };
  }, [subtasks]);

  return progress;
}

// Toggle subtask completion with parent task status propagation
export function useToggleSubtaskCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      subtaskId: string;
      parentTaskId: string;
      currentStatus: SubtaskRecord['status'];
    }) => {
      const newStatus =
        payload.currentStatus === 'completed' ? 'pending' : 'completed';

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', payload.subtaskId);

      if (error) throw error;

      return {
        subtaskId: payload.subtaskId,
        parentTaskId: payload.parentTaskId,
        newStatus,
      };
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: subtasksKeys.byParent(data.parentTaskId),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Update parent task progress and potentially its status
      updateParentTaskProgressAndStatus(data.parentTaskId, queryClient);
    },
  });
}

// Utility functions
async function updateParentTaskProgress(
  parentTaskId: string,
  queryClient: any
) {
  try {
    const { data: subtasks, error } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('parent_task_id', parentTaskId);

    if (error || !subtasks || subtasks.length === 0) return;

    const completedSubtasks = subtasks.filter(
      (subtask) => subtask.status === 'completed'
    ).length;
    const progressPercentage = Math.round(
      (completedSubtasks / subtasks.length) * 100
    );

    await supabase
      .from('tasks')
      .update({ progress_percentage: progressPercentage })
      .eq('id', parentTaskId);

    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  } catch (error) {
    console.error('Error updating parent task progress:', error);
  }
}

async function updateParentTaskProgressAndStatus(
  parentTaskId: string,
  queryClient: any
) {
  try {
    const { data: subtasks, error } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('parent_task_id', parentTaskId);

    if (error || !subtasks || subtasks.length === 0) return;

    const completedSubtasks = subtasks.filter(
      (subtask) => subtask.status === 'completed'
    ).length;
    const progressPercentage = Math.round(
      (completedSubtasks / subtasks.length) * 100
    );

    // Determine if parent task status should be updated
    let parentStatus: string | undefined;
    if (completedSubtasks === subtasks.length) {
      // All subtasks completed - mark parent as eligible for completion
      parentStatus = 'completed';
    } else if (completedSubtasks > 0) {
      // Some subtasks completed - mark parent as in progress if it's still pending
      const { data: parentTask } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', parentTaskId)
        .single();

      if (parentTask?.status === 'pending') {
        parentStatus = 'in_progress';
      }
    }

    const updateData: any = { progress_percentage: progressPercentage };
    if (parentStatus) {
      updateData.status = parentStatus;
    }

    await supabase.from('tasks').update(updateData).eq('id', parentTaskId);

    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  } catch (error) {
    console.error('Error updating parent task progress and status:', error);
  }
}
