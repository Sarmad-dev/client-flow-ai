import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CollaborationMetrics } from '@/types/task-management';

const taskActivityKeys = {
  all: ['task-activity'] as const,
  byTask: (taskId: string) =>
    [...taskActivityKeys.all, 'task', taskId] as const,
  collaboration: (userId: string, days: number) =>
    [...taskActivityKeys.all, 'collaboration', userId, days] as const,
  sharedTasks: (userId: string) =>
    [...taskActivityKeys.all, 'shared-tasks', userId] as const,
};

// Activity item interface
export interface TaskActivityItem {
  activity_type: 'status_change' | 'comment' | 'assignment' | 'time_entry';
  activity_data: Record<string, any>;
  user_id: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

// Shared task interface
export interface SharedTask {
  task_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  owner_id: string;
  owner_email: string;
  owner_name: string;
  assigned_at: string;
  progress_percentage: number;
}

// Get activity timeline for a specific task
export function useTaskActivity(taskId: string, limit: number = 50) {
  return useQuery({
    queryKey: taskActivityKeys.byTask(taskId),
    queryFn: async (): Promise<TaskActivityItem[]> => {
      const { data, error } = await supabase.rpc('get_task_activity', {
        p_task_id: taskId,
        limit_count: limit,
      });

      if (error) {
        console.log('RPC Error: ', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!taskId,
  });
}

// Get collaboration metrics for current user
export function useCollaborationMetrics(dateRangeDays: number = 30) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: taskActivityKeys.collaboration(userId || '', dateRangeDays),
    queryFn: async (): Promise<CollaborationMetrics> => {
      if (!userId) {
        return {
          sharedTasks: 0,
          assignedTasks: 0,
          commentsCount: 0,
          activeCollaborators: 0,
          averageResponseTime: 0,
        };
      }

      const { data, error } = await supabase.rpc('get_collaboration_metrics', {
        user_id: userId,
        date_range_days: dateRangeDays,
      });

      if (error) throw error;

      const metrics = data || {};
      return {
        sharedTasks: metrics.owned_tasks || 0,
        assignedTasks: metrics.assigned_tasks || 0,
        commentsCount: metrics.comments_made || 0,
        activeCollaborators: metrics.active_collaborators || 0,
        averageResponseTime: metrics.avg_response_time_hours || 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get tasks shared with current user (tasks they don't own but are assigned to)
export function useSharedTasks() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: taskActivityKeys.sharedTasks(userId || ''),
    queryFn: async (): Promise<SharedTask[]> => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_shared_tasks', {
        user_id: userId,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Get recent activity across all tasks user has access to
export function useRecentTaskActivity(limit: number = 20) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...taskActivityKeys.all, 'recent', userId, limit],
    queryFn: async (): Promise<TaskActivityItem[]> => {
      if (!userId) return [];

      // Get all tasks the user has access to
      const { data: accessibleTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .or(`user_id.eq.${userId},assignments.user_id.eq.${userId}`);

      if (tasksError || !accessibleTasks) return [];

      const taskIds = accessibleTasks.map((task) => task.id);
      if (taskIds.length === 0) return [];

      // Get recent activity from all accessible tasks
      const activities: TaskActivityItem[] = [];

      // Get recent comments
      const { data: comments } = await supabase
        .from('task_comments')
        .select(
          `
          *,
          user:profile!user_id(id, email, raw_user_meta_data),
          task:tasks(id, title)
        `
        )
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (comments) {
        comments.forEach((comment: any) => {
          activities.push({
            activity_type: 'comment',
            activity_data: {
              content: comment.content,
              comment_id: comment.id,
              task_title: comment.task?.title,
              task_id: comment.task_id,
            },
            user_id: comment.user_id,
            user_email: comment.user?.email || '',
            user_name:
              comment.user?.raw_user_meta_data?.full_name ||
              comment.user?.email ||
              '',
            created_at: comment.created_at,
          });
        });
      }

      // Get recent assignments
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select(
          `
          *,
          assigned_by_user:profile!assigned_by(id, email, raw_user_meta_data),
          assigned_user:profile!user_id(id, email, raw_user_meta_data),
          task:tasks(id, title)
        `
        )
        .in('task_id', taskIds)
        .order('assigned_at', { ascending: false })
        .limit(limit);

      if (assignments) {
        assignments.forEach((assignment: any) => {
          activities.push({
            activity_type: 'assignment',
            activity_data: {
              assigned_user_id: assignment.user_id,
              assigned_user_email: assignment.assigned_user?.email,
              assigned_user_name:
                assignment.assigned_user?.raw_user_meta_data?.full_name ||
                assignment.assigned_user?.email,
              assignment_id: assignment.id,
              task_title: assignment.task?.title,
              task_id: assignment.task_id,
            },
            user_id: assignment.assigned_by || assignment.user_id,
            user_email: assignment.assigned_by_user?.email || '',
            user_name:
              assignment.assigned_by_user?.raw_user_meta_data?.full_name ||
              assignment.assigned_by_user?.email ||
              '',
            created_at: assignment.assigned_at,
          });
        });
      }

      // Sort all activities by date and limit
      return activities
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, limit);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Real-time subscription for task activity updates
export function useTaskActivitySubscription(taskId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...taskActivityKeys.byTask(taskId), 'subscription'],
    queryFn: () => {
      // Set up real-time subscriptions for all activity types
      const subscriptions = [
        // Comments subscription
        supabase
          .channel(`task-comments-${taskId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_comments',
              filter: `task_id=eq.${taskId}`,
            },
            () => {
              queryClient.invalidateQueries({
                queryKey: taskActivityKeys.byTask(taskId),
              });
            }
          )
          .subscribe(),

        // Assignments subscription
        supabase
          .channel(`task-assignments-${taskId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_assignments',
              filter: `task_id=eq.${taskId}`,
            },
            () => {
              queryClient.invalidateQueries({
                queryKey: taskActivityKeys.byTask(taskId),
              });
            }
          )
          .subscribe(),

        // Time entries subscription
        supabase
          .channel(`time-entries-${taskId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'time_entries',
              filter: `task_id=eq.${taskId}`,
            },
            () => {
              queryClient.invalidateQueries({
                queryKey: taskActivityKeys.byTask(taskId),
              });
            }
          )
          .subscribe(),

        // Task updates subscription
        supabase
          .channel(`task-updates-${taskId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tasks',
              filter: `id=eq.${taskId}`,
            },
            () => {
              queryClient.invalidateQueries({
                queryKey: taskActivityKeys.byTask(taskId),
              });
            }
          )
          .subscribe(),
      ];

      return subscriptions;
    },
    enabled: !!taskId,
    staleTime: Infinity, // Keep subscriptions active
  });
}

// Helper function to format activity items for display
export function formatActivityItem(activity: TaskActivityItem): {
  title: string;
  description: string;
  icon: string;
  timestamp: string;
} {
  const timestamp = new Date(activity.created_at).toLocaleString();

  switch (activity.activity_type) {
    case 'comment':
      return {
        title: 'New Comment',
        description: `${
          activity.user_name
        } commented: "${activity.activity_data.content?.substring(0, 100)}${
          activity.activity_data.content?.length > 100 ? '...' : ''
        }"`,
        icon: 'MessageCircle',
        timestamp,
      };

    case 'assignment':
      return {
        title: 'Task Assignment',
        description: `${activity.user_name} assigned ${activity.activity_data.assigned_user_name} to this task`,
        icon: 'UserPlus',
        timestamp,
      };

    case 'status_change':
      return {
        title: 'Status Changed',
        description: `${activity.user_name} changed status from ${activity.activity_data.old_status} to ${activity.activity_data.new_status}`,
        icon: 'Activity',
        timestamp,
      };

    case 'time_entry':
      const duration = activity.activity_data.duration_minutes;
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      return {
        title: 'Time Logged',
        description: `${activity.user_name} logged ${durationText}${
          activity.activity_data.description
            ? `: ${activity.activity_data.description}`
            : ''
        }`,
        icon: 'Clock',
        timestamp,
      };

    default:
      return {
        title: 'Activity',
        description: `${activity.user_name} performed an action`,
        icon: 'Activity',
        timestamp,
      };
  }
}
