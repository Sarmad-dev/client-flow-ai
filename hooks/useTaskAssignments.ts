import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskAssignment } from '@/types/task-management';

const taskAssignmentsKeys = {
  all: ['task-assignments'] as const,
  byTask: (taskId: string) =>
    [...taskAssignmentsKeys.all, 'task', taskId] as const,
  byUser: (userId: string) =>
    [...taskAssignmentsKeys.all, 'user', userId] as const,
};

// Get assignments for a specific task
export function useTaskAssignments(taskId: string) {
  return useQuery({
    queryKey: taskAssignmentsKeys.byTask(taskId),
    queryFn: async (): Promise<TaskAssignment[]> => {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(
          `
          *,
          user:profiles!user_id(id, user_id, email, full_name),
          assigned_by:profiles!assigned_by(id, user_id, email, full_name)
        `
        )
        .eq('task_id', taskId);

      console.log('Error: ', error);

      if (error) throw error;

      return (data ?? []).map((assignment: any) => ({
        ...assignment,
        user: assignment.user
          ? {
              id: assignment.user.id,
              email: assignment.user.email,
              full_name: assignment.user.full_name || assignment.user.email,
            }
          : undefined,
        assigned_by_user: assignment.assigned_by_user
          ? {
              id: assignment.assigned_by_user.id,
              email: assignment.assigned_by_user.email,
              full_name:
                assignment.assigned_by_user.full_name ||
                assignment.assigned_by_user.email,
            }
          : undefined,
      })) as TaskAssignment[];
    },
    enabled: !!taskId,
  });
}

// Get tasks assigned to current user
export function useAssignedTasks() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: taskAssignmentsKeys.byUser(userId || ''),
    queryFn: async (): Promise<TaskAssignment[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('task_assignments')
        .select(
          `
          *,
          task:tasks(*),
          assigned_by_user:auth.users!assigned_by(id, email, raw_user_meta_data)
        `
        )
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((assignment: any) => ({
        ...assignment,
        assigned_by_user: assignment.assigned_by_user
          ? {
              id: assignment.assigned_by_user.id,
              email: assignment.assigned_by_user.email,
              full_name:
                assignment.assigned_by_user.raw_user_meta_data?.full_name ||
                assignment.assigned_by_user.email,
            }
          : undefined,
      })) as TaskAssignment[];
    },
    enabled: !!userId,
  });
}

// Assign user to task
export function useAssignTask() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      user_email?: string; // For assigning by email if user not found
    }): Promise<TaskAssignment> => {
      if (!userId) throw new Error('Not authenticated');

      let assigneeUserId;

      // If user_email is provided and user_id is not found, try to find user by email
      if (payload.user_email) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', payload.user_email)
          .single();

        console.log('User Data: ', userData);

        if (userError || !userData) {
          throw new Error(`User with email ${payload.user_email} not found`);
        }

        assigneeUserId = userData.id;
      }

      // Check if assignment already exists
      const { data: existingAssignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', payload.task_id)
        .eq('user_id', assigneeUserId)
        .single();

      if (existingAssignment) {
        throw new Error('User is already assigned to this task');
      }

      const { data: currentUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Create new assignment
      const { data, error } = await supabase
        .from('task_assignments')
        .insert({
          task_id: payload.task_id,
          user_id: assigneeUserId,
          assigned_by: currentUser?.id,
        })
        .select(
          `
          *,
          user:profiles!user_id(id, user_id, email, full_name),
          assigned_by_user:profiles!assigned_by(id, user_id, email, full_name)
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from assignment creation');

      return {
        ...data,
        user: data.user
          ? {
              id: data.user.user_id,
              email: data.user.email,
              full_name: data.user.full_name || data.user.email,
            }
          : undefined,
        assigned_by_user: data.assigned_by_user
          ? {
              id: data.assigned_by_user.user_id,
              email: data.assigned_by_user.email,
              full_name:
                data.assigned_by_user.full_name || data.assigned_by_user.email,
            }
          : undefined,
      } as TaskAssignment;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byTask(data.task_id),
      });
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byUser(data.user_id),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // Send notification to assigned user (this would be handled by a background job in production)
      sendAssignmentNotification(data);
    },
  });
}

// Remove user assignment from task
export function useUnassignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { task_id: string; user_id: string }) => {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', payload.task_id)
        .eq('user_id', payload.user_id);

      if (error) throw error;
      return payload;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byTask(data.task_id),
      });
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byUser(data.user_id),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Get available users for assignment from user's organizations
export function useAvailableUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      // Get all organizations where user is a member or owner
      const { data: userOrgs, error: orgsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', profile.id)
        .eq('status', 'active');

      if (orgsError) {
        console.warn('Could not fetch user organizations:', orgsError);
        return [];
      }

      // Also get organizations where user is the owner
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', profile.id);

      if (ownedError) {
        console.warn('Could not fetch owned organizations:', ownedError);
      }

      // Combine organization IDs
      const orgIds = [
        ...(userOrgs?.map((o) => o.organization_id) || []),
        ...(ownedOrgs?.map((o) => o.id) || []),
      ];

      if (orgIds.length === 0) return [];

      // Get all members from these organizations
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(
          `
          user_id,
          role,
          organization_id,
          user:profiles!user_id(id, email, full_name, avatar_url)
        `
        )
        .in('organization_id', orgIds)
        .eq('status', 'active');

      if (membersError) {
        console.warn('Could not fetch organization members:', membersError);
        return [];
      }

      // Get organization owners
      const { data: owners, error: ownersError } = await supabase
        .from('organizations')
        .select(
          `
          id,
          owner:profiles!owner_id(id, email, full_name, avatar_url)
        `
        )
        .in('id', orgIds);

      if (ownersError) {
        console.warn('Could not fetch organization owners:', ownersError);
      }

      // Combine and deduplicate users
      const allUsers = new Map();

      // Add members
      members?.forEach((member: any) => {
        if (member.user) {
          allUsers.set(member.user.id, {
            id: member.user.id,
            email: member.user.email,
            full_name: member.user.full_name || member.user.email,
            avatar_url: member.user.avatar_url,
            role: member.role,
          });
        }
      });

      // Add owners
      owners?.forEach((org: any) => {
        if (org.owner) {
          allUsers.set(org.owner.id, {
            id: org.owner.id,
            email: org.owner.email,
            full_name: org.owner.full_name || org.owner.email,
            avatar_url: org.owner.avatar_url,
            role: 'owner',
          });
        }
      });

      return Array.from(allUsers.values());
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user?.id,
  });
}

// Bulk assign multiple users to a task
export function useBulkAssignTask() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      user_ids: string[];
    }): Promise<TaskAssignment[]> => {
      if (!userId) throw new Error('Not authenticated');

      // Filter out users who are already assigned
      const { data: existingAssignments } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', payload.task_id)
        .in('user_id', payload.user_ids);

      const existingUserIds = existingAssignments?.map((a) => a.user_id) || [];
      const newUserIds = payload.user_ids.filter(
        (id) => !existingUserIds.includes(id)
      );

      if (newUserIds.length === 0) {
        throw new Error('All selected users are already assigned to this task');
      }

      // Create assignments for new users
      const assignments = newUserIds.map((user_id) => ({
        task_id: payload.task_id,
        user_id,
        assigned_by: userId,
      }));

      const { data, error } = await supabase
        .from('task_assignments')
        .insert(assignments).select(`
          *,
          user:auth.users!user_id(id, email, raw_user_meta_data),
          assigned_by_user:auth.users!assigned_by(id, email, raw_user_meta_data)
        `);

      if (error) throw error;
      if (!data)
        throw new Error('No data returned from bulk assignment creation');

      return data.map((assignment: any) => ({
        ...assignment,
        user: assignment.user
          ? {
              id: assignment.user.id,
              email: assignment.user.email,
              full_name:
                assignment.user.raw_user_meta_data?.full_name ||
                assignment.user.email,
            }
          : undefined,
        assigned_by_user: assignment.assigned_by_user
          ? {
              id: assignment.assigned_by_user.id,
              email: assignment.assigned_by_user.email,
              full_name:
                assignment.assigned_by_user.raw_user_meta_data?.full_name ||
                assignment.assigned_by_user.email,
            }
          : undefined,
      })) as TaskAssignment[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        const taskId = data[0].task_id;
        queryClient.invalidateQueries({
          queryKey: taskAssignmentsKeys.byTask(taskId),
        });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });

        // Send notifications to all assigned users
        data.forEach((assignment) => sendAssignmentNotification(assignment));
      }
    },
  });
}

// Helper function to send assignment notifications
async function sendAssignmentNotification(assignment: TaskAssignment) {
  try {
    const { notifyTaskAssigned } = await import('@/lib/notifications');
    const { supabase } = await import('@/lib/supabase');

    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', assignment.task_id)
      .single();

    if (!task) return;

    // Get assigner name
    const assignerName =
      assignment.assigned_by_user?.full_name ||
      assignment.assigned_by_user?.email ||
      'Someone';

    // Send notification
    await notifyTaskAssigned({
      assigneeUserId: assignment.user_id,
      taskId: assignment.task_id,
      taskTitle: task.title,
      assignedByName: assignerName,
    });
  } catch (error) {
    console.error('Error sending assignment notification:', error);
  }
}
