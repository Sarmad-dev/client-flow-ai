import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TaskTemplate,
  TaskRecord,
  SubtaskRecord,
} from '@/types/task-management';

const templatesKeys = {
  all: ['task-templates'] as const,
  list: (userId?: string) => [...templatesKeys.all, 'list', userId] as const,
  public: () => [...templatesKeys.all, 'public'] as const,
  byId: (id: string) => [...templatesKeys.all, 'detail', id] as const,
  categories: (userId?: string) =>
    [...templatesKeys.all, 'categories', userId] as const,
};

// Hook to get all templates for the current user
export function useTaskTemplates() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: templatesKeys.list(userId),
    queryFn: async (): Promise<TaskTemplate[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data ?? []) as TaskTemplate[];
    },
    enabled: !!userId,
  });
}

// Hook to get public templates
export function usePublicTemplates() {
  return useQuery({
    queryKey: templatesKeys.public(),
    queryFn: async (): Promise<TaskTemplate[]> => {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return (data ?? []) as TaskTemplate[];
    },
  });
}

// Hook to get a specific template by ID
export function useTaskTemplate(templateId: string) {
  return useQuery({
    queryKey: templatesKeys.byId(templateId),
    queryFn: async (): Promise<TaskTemplate | null> => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as TaskTemplate;
    },
    enabled: !!templateId,
  });
}

// Create a new template from an existing task
export function useCreateTemplateFromTask() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      name: string;
      description?: string;
      is_public?: boolean;
      include_subtasks?: boolean;
      include_dependencies?: boolean;
    }): Promise<TaskTemplate> => {
      if (!userId) throw new Error('Not authenticated');

      // Get the source task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', payload.task_id)
        .single();

      if (taskError || !task) throw new Error('Task not found');

      // Get subtasks if requested
      let subtasks: SubtaskRecord[] = [];
      if (payload.include_subtasks) {
        const { data: subtaskData, error: subtaskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('parent_task_id', payload.task_id);

        if (subtaskError) throw subtaskError;
        subtasks = (subtaskData ?? []) as SubtaskRecord[];
      }

      // Get dependencies if requested
      let dependencies: { from: number; to: number }[] = [];
      if (payload.include_dependencies) {
        const { data: depData, error: depError } = await supabase
          .from('task_dependencies')
          .select('task_id, depends_on_task_id')
          .or(
            `task_id.eq.${payload.task_id},depends_on_task_id.eq.${payload.task_id}`
          );

        if (depError) throw depError;

        // Map dependencies to template format (using indices)
        dependencies = (depData ?? []).map((dep) => ({
          from: dep.depends_on_task_id === payload.task_id ? 0 : 1,
          to: dep.task_id === payload.task_id ? 0 : 1,
        }));
      }

      // Create template data
      const templateData = {
        task: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          tag: task.tag,
          estimated_hours: task.estimated_hours,
        },
        subtasks: subtasks.map((subtask) => ({
          title: subtask.title,
          description: subtask.description,
          priority: subtask.priority,
          tag: subtask.tag,
          estimated_hours: subtask.estimated_hours,
        })),
        dependencies,
      };

      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          user_id: userId,
          name: payload.name,
          description: payload.description || null,
          template_data: templateData,
          is_public: payload.is_public || false,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
    },
  });
}

// Create a custom template from scratch
export function useCreateTemplate() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      template_data: TaskTemplate['template_data'];
      is_public?: boolean;
    }): Promise<TaskTemplate> => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          user_id: userId,
          name: payload.name,
          description: payload.description || null,
          template_data: payload.template_data,
          is_public: payload.is_public || false,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
    },
  });
}

// Update an existing template
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      description?: string;
      template_data?: TaskTemplate['template_data'];
      is_public?: boolean;
    }): Promise<TaskTemplate> => {
      const { id, ...updateData } = payload;

      const { data, error } = await supabase
        .from('task_templates')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      queryClient.invalidateQueries({ queryKey: templatesKeys.byId(data.id) });
    },
  });
}

// Delete a template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
    },
  });
}

// Use a template to create tasks with variable substitution
export function useCreateTaskFromTemplate() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      template_id: string;
      client_id?: string;
      variables?: Record<string, any>;
      due_date?: string;
    }): Promise<{
      parentTask: TaskRecord;
      subtasks: SubtaskRecord[];
    }> => {
      if (!userId) throw new Error('Not authenticated');

      // Get the template
      const { data: template, error: templateError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', payload.template_id)
        .single();

      if (templateError || !template) throw new Error('Template not found');

      // Substitute variables in template data
      const substitutedData = substituteTemplateVariables(
        template.template_data,
        payload.variables || {}
      );

      // Create the parent task
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          template_id: payload.template_id,
          client_id: payload.client_id || null,
          due_date: payload.due_date || null,
          title: substitutedData.task.title || 'Untitled Task',
          description: substitutedData.task.description || null,
          priority: substitutedData.task.priority || 'medium',
          tag: substitutedData.task.tag || 'follow-up',
          status: 'pending',
          estimated_hours: substitutedData.task.estimated_hours || null,
          actual_hours: 0,
          progress_percentage: 0,
        })
        .select()
        .single();

      if (parentError) throw parentError;

      // Create subtasks
      const subtasks: SubtaskRecord[] = [];
      for (const subtaskData of substitutedData.subtasks) {
        const { data: subtask, error: subtaskError } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            parent_task_id: parentTask.id,
            client_id: payload.client_id || null,
            title: subtaskData.title || 'Untitled Subtask',
            description: subtaskData.description || null,
            priority: subtaskData.priority || 'medium',
            tag: subtaskData.tag || 'follow-up',
            status: 'pending',
            estimated_hours: subtaskData.estimated_hours || null,
            actual_hours: 0,
            progress_percentage: 0,
          })
          .select()
          .single();

        if (subtaskError) throw subtaskError;
        subtasks.push(subtask as SubtaskRecord);
      }

      // Create dependencies if any
      if (
        substitutedData.dependencies &&
        substitutedData.dependencies.length > 0
      ) {
        const allTasks = [parentTask, ...subtasks];

        for (const dep of substitutedData.dependencies) {
          if (dep.from < allTasks.length && dep.to < allTasks.length) {
            await supabase.from('task_dependencies').insert({
              task_id: allTasks[dep.to].id,
              depends_on_task_id: allTasks[dep.from].id,
            });
          }
        }
      }

      // Increment template usage count
      await supabase
        .from('task_templates')
        .update({
          usage_count: template.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', payload.template_id);

      return {
        parentTask: parentTask as TaskRecord,
        subtasks,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
    },
  });
}

// Share a template (make it public)
export function useShareTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string): Promise<TaskTemplate> => {
      const { data, error } = await supabase
        .from('task_templates')
        .update({ is_public: true })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      queryClient.invalidateQueries({ queryKey: templatesKeys.byId(data.id) });
    },
  });
}

// Duplicate a template
export function useDuplicateTemplate() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      template_id: string;
      new_name: string;
    }): Promise<TaskTemplate> => {
      if (!userId) throw new Error('Not authenticated');

      // Get the original template
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', payload.template_id)
        .single();

      if (fetchError || !originalTemplate)
        throw new Error('Template not found');

      // Create a copy
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          user_id: userId,
          name: payload.new_name,
          description: originalTemplate.description,
          template_data: originalTemplate.template_data,
          is_public: false, // Duplicates are private by default
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
    },
  });
}

// Get template categories for organization
export function useTemplateCategories() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: templatesKeys.categories(userId),
    queryFn: async (): Promise<Array<{ category: string; count: number }>> => {
      if (!userId) return [];

      // This would require adding a category field to templates
      // For now, we'll return some default categories
      const { data: templates } = await supabase
        .from('task_templates')
        .select('template_data')
        .or(`user_id.eq.${userId},is_public.eq.true`);

      // Analyze templates to extract categories based on tags
      const categoryMap = new Map<string, number>();

      (templates ?? []).forEach((template) => {
        const templateData = template.template_data as any;
        const tag = templateData?.task?.tag || 'general';
        categoryMap.set(tag, (categoryMap.get(tag) || 0) + 1);
      });

      return Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      }));
    },
    enabled: !!userId,
  });
}

// Search templates
export function useSearchTemplates() {
  return useMutation({
    mutationFn: async (payload: {
      query: string;
      category?: string;
      is_public?: boolean;
      user_id?: string;
    }): Promise<TaskTemplate[]> => {
      let query = supabase.from('task_templates').select('*');

      // Apply filters
      if (payload.user_id) {
        if (payload.is_public !== undefined) {
          query = query.or(
            `user_id.eq.${payload.user_id},is_public.eq.${payload.is_public}`
          );
        } else {
          query = query.or(`user_id.eq.${payload.user_id},is_public.eq.true`);
        }
      } else if (payload.is_public !== undefined) {
        query = query.eq('is_public', payload.is_public);
      }

      // Text search in name and description
      if (payload.query) {
        query = query.or(
          `name.ilike.%${payload.query}%,description.ilike.%${payload.query}%`
        );
      }

      const { data, error } = await query.order('usage_count', {
        ascending: false,
      });

      if (error) throw error;
      return (data ?? []) as TaskTemplate[];
    },
  });
}

// Utility function to substitute variables in template data
function substituteTemplateVariables(
  templateData: TaskTemplate['template_data'],
  variables: Record<string, any>
): TaskTemplate['template_data'] {
  const substitute = (text: string): string => {
    if (!text) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  };

  const substitutedTask = {
    ...templateData.task,
    title: substitute(templateData.task.title || ''),
    description: substitute(templateData.task.description || ''),
  };

  const substitutedSubtasks = templateData.subtasks.map((subtask) => ({
    ...subtask,
    title: substitute(subtask.title || ''),
    description: substitute(subtask.description || ''),
  }));

  return {
    task: substitutedTask,
    subtasks: substitutedSubtasks,
    dependencies: templateData.dependencies,
  };
}

// Hook to extract variables from template data
export function useTemplateVariables(
  templateData: TaskTemplate['template_data']
) {
  return React.useMemo(() => {
    const variables = new Set<string>();

    const extractVariables = (text: string) => {
      if (!text) return;
      const matches = text.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        matches.forEach((match) => {
          const variable = match.replace(/\{\{|\}\}/g, '');
          variables.add(variable);
        });
      }
    };

    // Extract from task
    extractVariables(templateData.task.title || '');
    extractVariables(templateData.task.description || '');

    // Extract from subtasks
    templateData.subtasks.forEach((subtask) => {
      extractVariables(subtask.title || '');
      extractVariables(subtask.description || '');
    });

    return Array.from(variables).map((variable) => ({
      key: variable,
      label: variable.charAt(0).toUpperCase() + variable.slice(1),
      type: 'text' as const,
      required: true,
    }));
  }, [templateData]);
}

// Hook to get template usage statistics
export function useTemplateStats(templateId: string) {
  return useQuery({
    queryKey: [...templatesKeys.byId(templateId), 'stats'] as const,
    queryFn: async () => {
      if (!templateId) return null;

      // Get tasks created from this template
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status, created_at')
        .eq('template_id', templateId);

      if (error) throw error;

      const totalUsages = tasks?.length || 0;
      const completedTasks =
        tasks?.filter((task) => task.status === 'completed').length || 0;
      const completionRate =
        totalUsages > 0 ? Math.round((completedTasks / totalUsages) * 100) : 0;

      // Calculate usage over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsages =
        tasks?.filter((task) => new Date(task.created_at) >= thirtyDaysAgo)
          .length || 0;

      return {
        totalUsages,
        completedTasks,
        completionRate,
        recentUsages,
      };
    },
    enabled: !!templateId,
  });
}
