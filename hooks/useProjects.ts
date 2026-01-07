import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { ProjectRecord } from '@/types/task-management';

const projectsKeys = {
  all: ['projects'] as const,
  list: (userId?: string) => [...projectsKeys.all, 'list', userId] as const,
  detail: (id: string) => [...projectsKeys.all, 'detail', id] as const,
};

export function useProjects() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: projectsKeys.list(userId),
    queryFn: async (): Promise<ProjectRecord[]> => {
      if (!userId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          client:clients(name, company),
          lead:leads(name, company),
          tasks:tasks!project_id(id, status)
        `
        )
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate task counts for each project
      const projectsWithCounts = (data ?? []).map((project: any) => ({
        ...project,
        task_count: project.tasks?.length || 0,
        completed_task_count:
          project.tasks?.filter((task: any) => task.status === 'completed')
            .length || 0,
      }));

      return projectsWithCounts as ProjectRecord[];
    },
    enabled: !!userId,
  });
}

export function useProject(projectId: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: projectsKeys.detail(projectId),
    queryFn: async (): Promise<ProjectRecord | null> => {
      if (!userId || !projectId) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return null;

      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          client:clients(name, company),
          lead:leads(name, company),
          tasks:tasks!project_id(
            *,
            subtasks:tasks!parent_task_id(*)
          )
        `
        )
        .eq('id', projectId)
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      return data as ProjectRecord;
    },
    enabled: !!userId && !!projectId,
  });
}

export function useCreateProject() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { incrementUsage } = useSubscription();

  return useMutation({
    mutationFn: async (
      payload: Partial<ProjectRecord> & {
        name: string;
        client_id?: string | null;
        lead_id?: string | null;
      }
    ): Promise<ProjectRecord> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: profile.id,
          name: payload.name,
          description: payload.description ?? null,
          client_id: payload.client_id ?? null,
          lead_id: payload.lead_id ?? null,
          status: payload.status ?? 'planning',
          priority: payload.priority ?? 'medium',
          start_date: payload.start_date ?? null,
          due_date: payload.due_date ?? null,
          estimated_hours: payload.estimated_hours ?? null,
          budget: payload.budget ?? null,
          tags: payload.tags ?? null,
          notes: payload.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProjectRecord;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
      await incrementUsage('projects');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (
      payload: { id: string } & Partial<ProjectRecord>
    ): Promise<ProjectRecord> => {
      const { id, ...updateData } = payload;

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectRecord;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: projectsKeys.list(userId) });

      const previousProjects = queryClient.getQueryData<ProjectRecord[]>(
        projectsKeys.list(userId)
      );

      if (previousProjects) {
        queryClient.setQueryData<ProjectRecord[]>(
          projectsKeys.list(userId),
          (old) => {
            if (!old) return old;
            return old.map((project) =>
              project.id === payload.id ? { ...project, ...payload } : project
            );
          }
        );
      }

      return { previousProjects };
    },
    onError: (err, payload, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData<ProjectRecord[]>(
          projectsKeys.list(userId),
          context.previousProjects
        );
      }
      console.error('Failed to update project:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useProjectsByClient(clientId: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...projectsKeys.all, 'by-client', clientId],
    queryFn: async (): Promise<ProjectRecord[]> => {
      if (!userId || !clientId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          client:clients(name, company),
          tasks:tasks!project_id(id, status)
        `
        )
        .eq('user_id', profile.id)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithCounts = (data ?? []).map((project: any) => ({
        ...project,
        task_count: project.tasks?.length || 0,
        completed_task_count:
          project.tasks?.filter((task: any) => task.status === 'completed')
            .length || 0,
      }));

      return projectsWithCounts as ProjectRecord[];
    },
    enabled: !!userId && !!clientId,
  });
}

export function useProjectsByLead(leadId: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...projectsKeys.all, 'by-lead', leadId],
    queryFn: async (): Promise<ProjectRecord[]> => {
      if (!userId || !leadId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          lead:leads(name, company),
          tasks:tasks!project_id(id, status)
        `
        )
        .eq('user_id', profile.id)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithCounts = (data ?? []).map((project: any) => ({
        ...project,
        task_count: project.tasks?.length || 0,
        completed_task_count:
          project.tasks?.filter((task: any) => task.status === 'completed')
            .length || 0,
      }));

      return projectsWithCounts as ProjectRecord[];
    },
    enabled: !!userId && !!leadId,
  });
}
