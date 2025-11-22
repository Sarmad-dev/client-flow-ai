import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  SubtaskRecord,
  TaskDependency,
  TimeEntry,
  TaskComment,
  TaskAssignment,
  AutomationRule,
} from '@/types/task-management';

export interface TaskRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tag: 'follow-up' | 'proposal' | 'meeting' | 'call' | 'research' | 'design';
  due_date: string | null;
  voice_recording_id: string | null;
  ai_generated: boolean;
  ai_confidence_score: number | null;
  created_at: string;
  updated_at: string;

  // New fields for enhanced task management
  parent_task_id: string | null;
  template_id: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  progress_percentage: number;
  is_template: boolean;
  automation_rules: AutomationRule[] | null;

  // Computed/joined fields (populated via joins or separate queries)
  subtasks?: SubtaskRecord[];
  dependencies?: TaskDependency[];
  time_entries?: TimeEntry[];
  comments?: TaskComment[];
  assignments?: TaskAssignment[];
  clients?: { name: string; company: string };
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

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      console.log('Profiles: ', profiles);

      const { data, error } = await supabase
        .from('tasks')
        .select('*, clients(name, company)')
        .eq('user_id', profiles?.id)
        .order('created_at', { ascending: false });

      console.log('Data: ', error);
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: profile?.id,
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
      // Get the current task to track old status
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', payload.id)
        .single();

      const oldStatus = currentTask?.status;

      const { data, error } = await supabase
        .from('tasks')
        .update({ status: payload.to })
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;

      // Trigger automations
      const { triggerStatusChanged, triggerTaskCompleted } = await import(
        '@/lib/automationEngine'
      );

      if (oldStatus && oldStatus !== payload.to) {
        await triggerStatusChanged(data as TaskRecord, oldStatus);
      }

      if (payload.to === 'completed') {
        await triggerTaskCompleted(data as TaskRecord);
      }

      return data;
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

      // Get the current task to track changes
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      console.log('Error: ', error);

      if (error) throw error;

      // Trigger automations if status changed
      if (updateData.status && currentTask?.status !== updateData.status) {
        const { triggerStatusChanged, triggerTaskCompleted } = await import(
          '@/lib/automationEngine'
        );

        await triggerStatusChanged(
          data as TaskRecord,
          currentTask.status as TaskRecord['status']
        );

        if (updateData.status === 'completed') {
          await triggerTaskCompleted(data as TaskRecord);
        }
      }

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
      const { user } = useAuth();
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', profiles?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}

// Enhanced useTasks hook with subtask management operations
export function useTasksWithSubtasks() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: [...tasksKeys.all, 'with-subtasks', userId] as const,
    queryFn: async (): Promise<TaskRecord[]> => {
      if (!userId) return [];

      // Fetch tasks with their subtasks and dependencies
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          clients(name, company),
          subtasks:tasks!parent_task_id(*),
          dependencies:task_dependencies!task_id(
            id,
            depends_on_task_id,
            depends_on_task:tasks!depends_on_task_id(id, title, status)
          ),
          time_entries(*),
          comments:task_comments(*),
          assignments:task_assignments(*, user:auth.users(id, email, raw_user_meta_data))
        `
        )
        .eq('user_id', userId)
        .is('parent_task_id', null) // Only get parent tasks, subtasks will be nested
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate progress for tasks with subtasks
      const tasksWithProgress = (data ?? []).map((task: any) => {
        if (task.subtasks && task.subtasks.length > 0) {
          const completedSubtasks = task.subtasks.filter(
            (subtask: any) => subtask.status === 'completed'
          ).length;
          const progressPercentage = Math.round(
            (completedSubtasks / task.subtasks.length) * 100
          );
          return {
            ...task,
            progress_percentage: progressPercentage,
          };
        }
        return task;
      });

      return tasksWithProgress as TaskRecord[];
    },
    enabled: !!userId,
  });
}

// Subtask management operations
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: profile?.id,
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
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SubtaskRecord;
    },
    onSuccess: (_, variables) => {
      // Invalidate both regular tasks and tasks with subtasks
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
      // Also update the parent task's progress
      updateParentTaskProgress(variables.parent_task_id, queryClient);
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
      return data as unknown as SubtaskRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
      // Update parent task progress if this is a subtask
      if (data.parent_task_id) {
        updateParentTaskProgress(data.parent_task_id, queryClient);
      }
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
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
      // Update parent task progress after subtask deletion
      updateParentTaskProgress(parentTaskId, queryClient);
    },
  });
}

// Dependency management functions
export function useCreateTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      depends_on_task_id: string;
    }): Promise<TaskDependency> => {
      // First check for circular dependencies
      const isCircular = await checkCircularDependency(
        payload.task_id,
        payload.depends_on_task_id
      );

      if (isCircular) {
        throw new Error(
          'Circular dependency detected. This dependency would create a loop.'
        );
      }

      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as TaskDependency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}

export function useDeleteTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      depends_on_task_id: string;
    }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', payload.task_id)
        .eq('depends_on_task_id', payload.depends_on_task_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
    },
  });
}

// Utility functions for progress calculation and dependency validation
async function updateParentTaskProgress(
  parentTaskId: string,
  queryClient: any
) {
  try {
    // Get all subtasks for the parent task
    const { data: subtasks, error } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('parent_task_id', parentTaskId);

    if (error || !subtasks || subtasks.length === 0) return;

    // Calculate progress percentage
    const completedSubtasks = subtasks.filter(
      (subtask) => subtask.status === 'completed'
    ).length;
    const progressPercentage = Math.round(
      (completedSubtasks / subtasks.length) * 100
    );

    // Update parent task progress
    await supabase
      .from('tasks')
      .update({ progress_percentage: progressPercentage })
      .eq('id', parentTaskId);

    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: tasksKeys.all as any });
  } catch (error) {
    console.error('Error updating parent task progress:', error);
  }
}

async function checkCircularDependency(
  taskId: string,
  dependsOnTaskId: string
): Promise<boolean> {
  try {
    // Get all dependencies for the task we want to depend on
    const { data: dependencies, error } = await supabase
      .from('task_dependencies')
      .select('depends_on_task_id')
      .eq('task_id', dependsOnTaskId);

    if (error) return false;

    // Check if any of those dependencies eventually lead back to our original task
    const visited = new Set<string>();
    const stack = [dependsOnTaskId];

    while (stack.length > 0) {
      const currentTaskId = stack.pop()!;

      if (currentTaskId === taskId) {
        return true; // Circular dependency found
      }

      if (visited.has(currentTaskId)) {
        continue;
      }

      visited.add(currentTaskId);

      // Get dependencies for current task
      const { data: currentDeps } = await supabase
        .from('task_dependencies')
        .select('depends_on_task_id')
        .eq('task_id', currentTaskId);

      if (currentDeps) {
        currentDeps.forEach((dep) => {
          if (!visited.has(dep.depends_on_task_id)) {
            stack.push(dep.depends_on_task_id);
          }
        });
      }
    }

    return false; // No circular dependency found
  } catch (error) {
    console.error('Error checking circular dependency:', error);
    return false;
  }
}
