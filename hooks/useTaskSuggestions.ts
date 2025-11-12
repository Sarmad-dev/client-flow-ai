import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  generateTaskSuggestions,
  prioritizeTasks,
  generateReschedulingSuggestions,
  analyzeTaskPatterns,
} from '@/lib/ai';

export interface TaskSuggestion {
  id: string;
  type: 'priority' | 'reschedule' | 'template' | 'dependency' | 'automation';
  title: string;
  description: string;
  confidence: number;
  task_id?: string;
  suggested_action: {
    type: string;
    parameters: Record<string, any>;
  };
  created_at: string;
  is_applied: boolean;
}

export interface TaskPrioritization {
  task_id: string;
  suggested_priority: 'low' | 'medium' | 'high' | 'urgent';
  current_priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  confidence: number;
  factors: {
    due_date_urgency: number;
    dependency_impact: number;
    client_importance: number;
    historical_pattern: number;
  };
}

export interface ReschedulingSuggestion {
  task_id: string;
  current_due_date: string | null;
  suggested_due_date: string;
  reason: string;
  confidence: number;
  suggested_actions: Array<{
    type: 'reschedule' | 'break_down' | 'delegate' | 'cancel';
    description: string;
    parameters: Record<string, any>;
  }>;
}

const taskSuggestionsKeys = {
  all: ['task-suggestions'] as const,
  list: (userId?: string) =>
    [...taskSuggestionsKeys.all, 'list', userId] as const,
  prioritization: (userId?: string) =>
    [...taskSuggestionsKeys.all, 'prioritization', userId] as const,
  rescheduling: (userId?: string) =>
    [...taskSuggestionsKeys.all, 'rescheduling', userId] as const,
};

// Hook to get intelligent task suggestions
export function useTaskSuggestions() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: taskSuggestionsKeys.list(userId),
    queryFn: async (): Promise<TaskSuggestion[]> => {
      if (!userId) return [];

      // Get user's tasks and historical data
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          clients(name, company),
          dependencies:task_dependencies!task_id(*),
          time_entries(*)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (tasksError) throw tasksError;

      // Get user's historical patterns
      const { data: completedTasks, error: completedError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (completedError) throw completedError;

      // Generate AI-powered suggestions
      const suggestions = await generateTaskSuggestions({
        tasks: tasks || [],
        completedTasks: completedTasks || [],
        userId,
      });

      return suggestions;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get task prioritization suggestions
export function useTaskPrioritization() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: taskSuggestionsKeys.prioritization(userId),
    queryFn: async (): Promise<TaskPrioritization[]> => {
      if (!userId) return [];

      // Get active tasks that need prioritization
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          clients(name, company),
          dependencies:task_dependencies!task_id(*),
          dependent_tasks:task_dependencies!depends_on_task_id(*)
        `
        )
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate prioritization suggestions using AI
      const prioritizations = await prioritizeTasks(tasks || []);

      return prioritizations;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get rescheduling suggestions for overdue tasks
export function useReschedulingSuggestions() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: taskSuggestionsKeys.rescheduling(userId),
    queryFn: async (): Promise<ReschedulingSuggestion[]> => {
      if (!userId) return [];

      // Get overdue and at-risk tasks
      const today = new Date().toISOString().split('T')[0];
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          clients(name, company),
          subtasks:tasks!parent_task_id(*),
          time_entries(*)
        `
        )
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .or(`due_date.lt.${today},due_date.is.null`)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Generate rescheduling suggestions
      const suggestions = await generateReschedulingSuggestions(tasks || []);

      return suggestions;
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook to apply a task suggestion
export function useApplyTaskSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      suggestion: TaskSuggestion;
      parameters?: Record<string, any>;
    }) => {
      const { suggestion, parameters = {} } = payload;

      switch (suggestion.suggested_action.type) {
        case 'update_priority':
          await supabase
            .from('tasks')
            .update({
              priority: suggestion.suggested_action.parameters.priority,
              updated_at: new Date().toISOString(),
            })
            .eq('id', suggestion.task_id);
          break;

        case 'reschedule':
          await supabase
            .from('tasks')
            .update({
              due_date: suggestion.suggested_action.parameters.due_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', suggestion.task_id);
          break;

        case 'create_subtasks':
          const subtasks = suggestion.suggested_action.parameters.subtasks;
          for (const subtask of subtasks) {
            await supabase.from('tasks').insert({
              user_id: user?.id,
              parent_task_id: suggestion.task_id,
              title: subtask.title,
              description: subtask.description,
              priority: subtask.priority || 'medium',
              status: 'pending',
              tag: subtask.tag || 'follow-up',
              due_date: subtask.due_date,
              estimated_hours: subtask.estimated_hours,
            });
          }
          break;

        case 'add_dependency':
          await supabase.from('task_dependencies').insert({
            task_id: suggestion.task_id,
            depends_on_task_id:
              suggestion.suggested_action.parameters.depends_on_task_id,
          });
          break;

        case 'use_template':
          // This would integrate with the template system
          // Implementation depends on template hook
          break;

        default:
          throw new Error(
            `Unknown suggestion action type: ${suggestion.suggested_action.type}`
          );
      }

      // Mark suggestion as applied
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: taskSuggestionsKeys.all });
    },
  });
}

// Hook to dismiss a suggestion
export function useDismissTaskSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      // In a real implementation, you might want to store dismissed suggestions
      // to improve future suggestions
      return { dismissed: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskSuggestionsKeys.all });
    },
  });
}

// Hook to get task pattern analysis
export function useTaskPatternAnalysis() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['task-patterns', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get comprehensive task history
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          clients(name, company),
          time_entries(*)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Analyze patterns using AI
      const patterns = await analyzeTaskPatterns(tasks || []);

      return patterns;
    },
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook to get optimal task ordering
export function useOptimalTaskOrdering() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['optimal-task-order', userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];

      // Get active tasks with dependencies
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          dependencies:task_dependencies!task_id(*),
          dependent_tasks:task_dependencies!depends_on_task_id(*)
        `
        )
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate optimal ordering based on dependencies, priorities, and due dates
      const orderedTaskIds = calculateOptimalTaskOrder(tasks || []);

      return orderedTaskIds;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Utility function to calculate optimal task order
function calculateOptimalTaskOrder(tasks: any[]): string[] {
  // Create a graph of task dependencies
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const dependencyGraph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize graph
  tasks.forEach((task) => {
    dependencyGraph.set(task.id, []);
    inDegree.set(task.id, 0);
  });

  // Build dependency graph
  tasks.forEach((task) => {
    if (task.dependencies) {
      task.dependencies.forEach((dep: any) => {
        const dependsOnId = dep.depends_on_task_id;
        if (taskMap.has(dependsOnId)) {
          dependencyGraph.get(dependsOnId)?.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      });
    }
  });

  // Topological sort with priority weighting
  const result: string[] = [];
  const queue: Array<{ id: string; priority: number; dueDate: string | null }> =
    [];

  // Add tasks with no dependencies to queue
  tasks.forEach((task) => {
    if (inDegree.get(task.id) === 0) {
      queue.push({
        id: task.id,
        priority: getPriorityWeight(task.priority),
        dueDate: task.due_date,
      });
    }
  });

  // Sort queue by priority and due date
  const sortQueue = () => {
    queue.sort((a, b) => {
      // First by due date (overdue tasks first)
      const today = new Date().toISOString().split('T')[0];
      const aOverdue = a.dueDate && a.dueDate < today;
      const bOverdue = b.dueDate && b.dueDate < today;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then by due date
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }

      return 0;
    });
  };

  while (queue.length > 0) {
    sortQueue();
    const current = queue.shift()!;
    result.push(current.id);

    // Process dependent tasks
    const dependents = dependencyGraph.get(current.id) || [];
    dependents.forEach((dependentId) => {
      const newInDegree = (inDegree.get(dependentId) || 0) - 1;
      inDegree.set(dependentId, newInDegree);

      if (newInDegree === 0) {
        const task = taskMap.get(dependentId);
        if (task) {
          queue.push({
            id: dependentId,
            priority: getPriorityWeight(task.priority),
            dueDate: task.due_date,
          });
        }
      }
    });
  }

  return result;
}

function getPriorityWeight(priority: string): number {
  switch (priority) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 2;
  }
}
