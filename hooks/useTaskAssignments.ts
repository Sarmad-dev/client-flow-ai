import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { TaskAssignment } from '@/types/task-management';
import type { OrganizationMember } from '@/types/organization';

const taskAssignmentsKeys = {
  all: ['task-assignments'] as const,
  byTask: (taskId?: string) =>
    [...taskAssignmentsKeys.all, 'by-task', taskId] as const,
  byUser: (userId?: string) =>
    [...taskAssignmentsKeys.all, 'by-user', userId] as const,
};

export function useTaskAssignments(taskId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: taskAssignmentsKeys.byTask(taskId),
    queryFn: async (): Promise<TaskAssignment[]> => {
      if (!taskId || !user) return [];

      const { data, error } = await supabase
        .from('task_assignments')
        .select(
          `
          *,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          ),
          assigned_by_user:profiles!assigned_by(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskAssignment[];
    },
    enabled: !!taskId && !!user,
  });
}

export function useAssignTask() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      taskId: string;
      userId: string; // This should be a profile ID, not auth user ID
      projectId?: string;
    }): Promise<TaskAssignment> => {
      if (!user || !currentOrganization) {
        throw new Error('Not authenticated or no organization selected');
      }

      // Get the current user's profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) throw new Error('Current user profile not found');

      // Verify the task belongs to a project in the current organization
      if (payload.projectId) {
        const { data: project } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', payload.projectId)
          .single();

        if (!project || project.organization_id !== currentOrganization.id) {
          throw new Error('Task does not belong to the current organization');
        }
      }

      // Verify the user being assigned is a member of the current organization
      const { data: memberCheck } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', payload.userId)
        .eq('status', 'active')
        .single();

      if (!memberCheck) {
        throw new Error('User is not an active member of this organization');
      }

      // Check if assignment already exists
      const { data: existingAssignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', payload.taskId)
        .eq('user_id', payload.userId)
        .single();

      if (existingAssignment) {
        throw new Error('User is already assigned to this task');
      }

      // Create the assignment
      const { data, error } = await supabase
        .from('task_assignments')
        .insert({
          task_id: payload.taskId,
          user_id: payload.userId,
          assigned_by: currentProfile.id,
        })
        .select(
          `
          *,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          ),
          assigned_by_user:profiles!assigned_by(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      // Get task title for notification
      const { data: task } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', payload.taskId)
        .single();

      // Send notification to the assigned user
      const { notifyTaskAssigned } = await import('@/lib/notifications');
      await notifyTaskAssigned({
        assigneeUserId: payload.userId,
        taskId: payload.taskId,
        taskTitle: task?.title || 'Untitled Task',
        assignedByName:
          currentProfile.full_name || currentProfile.email || 'Someone',
      });

      return data as TaskAssignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byTask(variables.taskId),
      });
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byUser(variables.userId),
      });
      // Also invalidate tasks to update assignment counts
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUnassignTask() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { taskId: string; userId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', payload.taskId)
        .eq('user_id', payload.userId);

      if (error) throw error;
      return payload;
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byTask(variables.taskId),
      });
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byUser(variables.userId),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUserTaskAssignments(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: taskAssignmentsKeys.byUser(targetUserId),
    queryFn: async (): Promise<TaskAssignment[]> => {
      if (!targetUserId) return [];

      // Get the profile ID for the user
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('task_assignments')
        .select(
          `
          *,
          task:tasks(
            id,
            title,
            description,
            status,
            priority,
            due_date,
            project:projects(
              id,
              name,
              organization_id
            )
          ),
          assigned_by_user:profiles!assigned_by(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskAssignment[];
    },
    enabled: !!targetUserId,
  });
}

// Hook to get assignable members for a specific task/project
export function useAssignableMembersForTask(
  taskId: string,
  projectId?: string
) {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: ['assignable-members', 'task', taskId, currentOrganization?.id],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!currentOrganization || !taskId) return [];

      // Get organization members
      const { data: members, error } = await supabase
        .from('organization_members')
        .select(
          `
          *,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active');

      if (error) throw error;

      // Get current task assignments to filter out already assigned users
      const { data: currentAssignments } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', taskId);

      const assignedUserIds = new Set(
        currentAssignments?.map((a) => a.user_id) || []
      );

      // Filter out already assigned members
      const assignableMembers = (members || []).filter(
        (member) => !assignedUserIds.has(member.user_id)
      );

      return assignableMembers as OrganizationMember[];
    },
    enabled: !!currentOrganization && !!taskId,
  });
}

// Bulk assignment operations
export function useBulkAssignTasks() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      taskIds: string[];
      userId: string;
    }): Promise<TaskAssignment[]> => {
      if (!user || !currentOrganization) {
        throw new Error('Not authenticated or no organization selected');
      }

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) throw new Error('Current user profile not found');

      // Verify the user being assigned is a member of the current organization
      const { data: memberCheck } = await supabase
        .from('organization_members')
        .select('id, status')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', payload.userId)
        .eq('status', 'active')
        .single();

      if (!memberCheck) {
        throw new Error('User is not an active member of this organization');
      }

      // Create assignments for all tasks
      const assignments = payload.taskIds.map((taskId) => ({
        task_id: taskId,
        user_id: payload.userId,
        assigned_by: currentProfile.id,
      }));

      const { data, error } = await supabase
        .from('task_assignments')
        .insert(assignments).select(`
          *,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          ),
          assigned_by_user:profiles!assigned_by(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `);

      if (error) throw error;
      return data as TaskAssignment[];
    },
    onSuccess: (_, variables) => {
      // Invalidate all relevant queries
      variables.taskIds.forEach((taskId) => {
        queryClient.invalidateQueries({
          queryKey: taskAssignmentsKeys.byTask(taskId),
        });
      });
      queryClient.invalidateQueries({
        queryKey: taskAssignmentsKeys.byUser(variables.userId),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
