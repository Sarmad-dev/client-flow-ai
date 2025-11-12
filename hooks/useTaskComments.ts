import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskComment } from '@/types/task-management';

const taskCommentsKeys = {
  all: ['task-comments'] as const,
  byTask: (taskId: string) =>
    [...taskCommentsKeys.all, 'task', taskId] as const,
};

// Get comments for a specific task
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: taskCommentsKeys.byTask(taskId),
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from('task_comments')
        .select(
          `
          *,
          user:profiles!user_id(id, user_id, email, full_name)
        `
        )
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((comment: any) => ({
        ...comment,
        user: comment.user
          ? {
              id: comment.user.id,
              email: comment.user.email,
              full_name: comment.user?.full_name || comment.user.email,
            }
          : undefined,
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });
}

// Add a comment to a task
export function useAddTaskComment() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      content: string;
    }): Promise<TaskComment> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Validate that user has access to this task (either owns it or is assigned to it)
      // const { data: taskAccess, error: accessError } = await supabase.rpc(
      //   'check_task_access',
      //   {
      //     task_id: payload.task_id,
      //     user_id: profile?.id,
      //   }
      // );

      // if (accessError || !taskAccess) {
      //   throw new Error('You do not have permission to comment on this task');
      // }

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: payload.task_id,
          user_id: profile?.id,
          content: payload.content.trim(),
        })
        .select(
          `
          *,
          user:profiles!user_id(id, user_id, email, full_name)
        `
        )
        .single();

      if (error) {
        console.error(error);
        throw error;
      }
      if (!data) throw new Error('No data returned from comment creation');

      const result: TaskComment = {
        id: data.id,
        task_id: data.task_id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              full_name: data.user?.full_name || data.user.email,
            }
          : undefined,
      };

      return result;
    },
    onSuccess: (data) => {
      // Invalidate comments for this task
      queryClient.invalidateQueries({
        queryKey: taskCommentsKeys.byTask(data.task_id),
      });

      // Send notifications to task owner and other assigned users
      sendCommentNotification(data);
    },
  });
}

// Update a comment (only by the comment author)
export function useUpdateTaskComment() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      content: string;
      task_id: string;
    }): Promise<TaskComment> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('task_comments')
        .update({
          content: payload.content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .eq('user_id', profile?.id) // Ensure user can only update their own comments
        .select(
          `
          *,
          user:profiles!user_id(id, email, full_name)
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from comment update');

      const result: TaskComment = {
        id: data.id,
        task_id: data.task_id,
        user_id: data.user_id,
        content: data.content,
        created_at: data.created_at,
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email,
              full_name: data.user?.full_name || data.user.email,
            }
          : undefined,
      };

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: taskCommentsKeys.byTask(data.task_id),
      });
    },
  });
}

// Delete a comment (only by the comment author)
export function useDeleteTaskComment() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; task_id: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', payload.id)
        .eq('user_id', profile?.id); // Ensure user can only delete their own comments

      if (error) throw error;
      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: taskCommentsKeys.byTask(data.task_id),
      });
    },
  });
}

// Get recent comments across all tasks for activity feed
export function useRecentTaskComments(limit: number = 10) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...taskCommentsKeys.all, 'recent', userId, limit],
    queryFn: async (): Promise<TaskComment[]> => {
      if (!userId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Get comments from tasks the user owns or is assigned to
      const { data, error } = await supabase
        .from('task_comments')
        .select(
          `
          *,
          user:profiles!user_id(id, email, full_name),
          task:tasks(id, title, user_id)
        `
        )
        .or(
          `task.user_id.eq.${profile?.id},task.assignments.user_id.eq.${profile?.id}`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data ?? []).map((comment: any) => ({
        ...comment,
        user: comment.user
          ? {
              id: comment.user.id,
              email: comment.user.email,
              full_name: comment.user?.full_name || comment.user.email,
            }
          : undefined,
      })) as TaskComment[];
    },
    enabled: !!userId,
  });
}

// Search comments across tasks
export function useSearchTaskComments(query: string, taskIds?: string[]) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...taskCommentsKeys.all, 'search', query, taskIds, userId],
    queryFn: async (): Promise<TaskComment[]> => {
      if (!userId || !query.trim()) return [];

      let queryBuilder = supabase
        .from('task_comments')
        .select(
          `
          *,
          user:profiles!user_id(id, email, full_name),
          task:tasks(id, title, user_id)
        `
        )
        .textSearch('content', query.trim())
        .order('created_at', { ascending: false });

      // Filter by specific tasks if provided
      if (taskIds && taskIds.length > 0) {
        queryBuilder = queryBuilder.in('task_id', taskIds);
      }

      // Only show comments from tasks the user has access to
      queryBuilder = queryBuilder.or(
        `task.user_id.eq.${userId},task.assignments.user_id.eq.${userId}`
      );

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return (data ?? []).map((comment: any) => ({
        ...comment,
        user: comment.user
          ? {
              id: comment.user.id,
              email: comment.user.email,
              full_name: comment.user?.full_name || comment.user.email,
            }
          : undefined,
      })) as TaskComment[];
    },
    enabled: !!userId && !!query.trim(),
  });
}

// Helper function to send comment notifications
async function sendCommentNotification(comment: TaskComment) {
  try {
    // Get task details and all assigned users
    const { data: taskData, error } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        user_id,
        assignments:task_assignments(user_id)
      `
      )
      .eq('id', comment.task_id)
      .single();

    if (error || !taskData) return;

    // Collect all users who should be notified (task owner + assigned users, excluding comment author)
    const notifyUserIds = new Set<string>();

    // Add task owner
    if (taskData.user_id !== comment.user_id) {
      notifyUserIds.add(taskData.user_id);
    }

    // Add assigned users
    taskData.assignments?.forEach((assignment: any) => {
      if (assignment.user_id !== comment.user_id) {
        notifyUserIds.add(assignment.user_id);
      }
    });

    // Send notifications to all relevant users
    for (const userId of notifyUserIds) {
      // This is a placeholder for notification logic
      console.log(
        `Comment notification: New comment on task "${taskData.title}" by ${comment.user?.email}`
      );

      // Example: Create in-app notification
      // await supabase.from('notifications').insert({
      //   user_id: userId,
      //   type: 'task_comment',
      //   title: 'New Task Comment',
      //   message: `${comment.user?.full_name || comment.user?.email} commented on "${taskData.title}"`,
      //   data: {
      //     task_id: comment.task_id,
      //     comment_id: comment.id,
      //     comment_preview: comment.content.substring(0, 100)
      //   },
      // });
    }
  } catch (error) {
    console.error('Error sending comment notification:', error);
  }
}

// Real-time subscription for task comments
export function useTaskCommentsSubscription(taskId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...taskCommentsKeys.byTask(taskId), 'subscription'],
    queryFn: () => {
      // Set up real-time subscription
      const subscription = supabase
        .channel(`task-comments-${taskId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${taskId}`,
          },
          (payload) => {
            // Invalidate and refetch comments when changes occur
            queryClient.invalidateQueries({
              queryKey: taskCommentsKeys.byTask(taskId),
            });
          }
        )
        .subscribe();

      return subscription;
    },
    enabled: !!taskId,
    staleTime: Infinity, // Keep subscription active
  });
}
