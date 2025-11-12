import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AutomationRule, AutomationAction } from '@/types/task-management';
import { executeAutomationRule, validateAutomationRule } from '@/lib/ai';

export interface AutomationTrigger {
  id: string;
  name: string;
  description: string;
  event_type:
    | 'task_completed'
    | 'task_overdue'
    | 'status_changed'
    | 'time_tracked'
    | 'due_date_approaching';
  available_conditions: string[];
  available_actions: string[];
}

export interface AutomationRuleWithMetadata extends AutomationRule {
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  execution_count: number;
  last_executed: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationExecution {
  id: string;
  rule_id: string;
  task_id: string;
  trigger_event: string;
  executed_actions: AutomationAction[];
  execution_status: 'success' | 'failed' | 'partial';
  error_message: string | null;
  executed_at: string;
}

const automationKeys = {
  all: ['automation'] as const,
  rules: (userId?: string) => [...automationKeys.all, 'rules', userId] as const,
  triggers: () => [...automationKeys.all, 'triggers'] as const,
  executions: (userId?: string) =>
    [...automationKeys.all, 'executions', userId] as const,
};

// Hook to get available automation triggers
export function useAutomationTriggers() {
  return useQuery({
    queryKey: automationKeys.triggers(),
    queryFn: async (): Promise<AutomationTrigger[]> => {
      // Return predefined automation triggers
      return [
        {
          id: 'task_completed',
          name: 'Task Completed',
          description: 'Triggered when a task is marked as completed',
          event_type: 'task_completed',
          available_conditions: [
            'task.priority',
            'task.tag',
            'task.client_id',
            'task.has_subtasks',
          ],
          available_actions: [
            'create_task',
            'send_notification',
            'update_related_tasks',
            'create_follow_up',
          ],
        },
        {
          id: 'task_overdue',
          name: 'Task Overdue',
          description: 'Triggered when a task becomes overdue',
          event_type: 'task_overdue',
          available_conditions: [
            'task.priority',
            'task.tag',
            'task.client_id',
            'days_overdue',
          ],
          available_actions: [
            'update_priority',
            'send_notification',
            'reschedule',
            'assign_user',
          ],
        },
        {
          id: 'status_changed',
          name: 'Status Changed',
          description: 'Triggered when a task status changes',
          event_type: 'status_changed',
          available_conditions: [
            'task.from_status',
            'task.to_status',
            'task.priority',
            'task.client_id',
          ],
          available_actions: [
            'create_task',
            'send_notification',
            'update_dependencies',
            'log_activity',
          ],
        },
        {
          id: 'time_tracked',
          name: 'Time Tracked',
          description: 'Triggered when time is tracked on a task',
          event_type: 'time_tracked',
          available_conditions: [
            'time_entry.duration',
            'task.estimated_hours',
            'task.actual_hours',
          ],
          available_actions: [
            'send_notification',
            'update_estimates',
            'create_report',
          ],
        },
        {
          id: 'due_date_approaching',
          name: 'Due Date Approaching',
          description: 'Triggered when a task due date is approaching',
          event_type: 'due_date_approaching',
          available_conditions: [
            'days_until_due',
            'task.priority',
            'task.status',
            'task.client_id',
          ],
          available_actions: [
            'send_notification',
            'update_priority',
            'create_reminder',
          ],
        },
      ];
    },
    staleTime: Infinity, // These don't change often
  });
}

// Hook to get user's automation rules
export function useAutomationRules() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: automationKeys.rules(userId),
    queryFn: async (): Promise<AutomationRuleWithMetadata[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AutomationRuleWithMetadata[];
    },
    enabled: !!userId,
  });
}

// Hook to create a new automation rule
export function useCreateAutomationRule() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      trigger: AutomationRule['trigger'];
      conditions: Record<string, any>;
      actions: AutomationAction[];
      is_active?: boolean;
    }): Promise<AutomationRuleWithMetadata> => {
      if (!userId) throw new Error('Not authenticated');

      // Validate the automation rule
      const validationResult = await validateAutomationRule({
        id: 'temp',
        trigger: payload.trigger,
        conditions: payload.conditions,
        actions: payload.actions,
        enabled: payload.is_active ?? true,
      });

      if (!validationResult.isValid) {
        throw new Error(
          `Invalid automation rule: ${validationResult.errors.join(', ')}`
        );
      }

      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          user_id: userId,
          name: payload.name,
          description: payload.description,
          trigger: payload.trigger,
          conditions: payload.conditions,
          actions: payload.actions,
          is_active: payload.is_active ?? true,
          execution_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return data as AutomationRuleWithMetadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
    },
  });
}

// Hook to update an automation rule
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      updates: Partial<AutomationRuleWithMetadata>;
    }): Promise<AutomationRuleWithMetadata> => {
      const { id, updates } = payload;

      // If updating the rule logic, validate it
      if (updates.trigger || updates.conditions || updates.actions) {
        const rule = {
          id,
          trigger: updates.trigger || 'task_completed',
          conditions: updates.conditions || {},
          actions: updates.actions || [],
          enabled: updates.is_active ?? true,
        } as AutomationRule;

        const validationResult = await validateAutomationRule(rule);
        if (!validationResult.isValid) {
          throw new Error(
            `Invalid automation rule: ${validationResult.errors.join(', ')}`
          );
        }
      }

      const { data, error } = await supabase
        .from('automation_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as AutomationRuleWithMetadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
    },
  });
}

// Hook to delete an automation rule
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
    },
  });
}

// Hook to toggle automation rule active status
export function useToggleAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update({
          is_active: payload.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
    },
  });
}

// Hook to get automation execution history
export function useAutomationExecutions() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: automationKeys.executions(userId),
    queryFn: async (): Promise<AutomationExecution[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('automation_executions')
        .select(
          `
          *,
          rule:automation_rules(name, description),
          task:tasks(title, status)
        `
        )
        .eq('user_id', userId)
        .order('executed_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []) as AutomationExecution[];
    },
    enabled: !!userId,
  });
}

// Hook to manually execute an automation rule
export function useExecuteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      rule: AutomationRuleWithMetadata;
      task_id: string;
      trigger_context?: Record<string, any>;
    }) => {
      const { rule, task_id, trigger_context = {} } = payload;

      // Get the task data
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task_id)
        .single();

      if (taskError) throw taskError;

      // Execute the automation rule
      const executionResult = await executeAutomationRule(
        rule,
        task,
        trigger_context
      );

      // Log the execution
      await supabase.from('automation_executions').insert({
        rule_id: rule.id,
        user_id: rule.user_id,
        task_id: task_id,
        trigger_event: rule.trigger,
        executed_actions: executionResult.executed_actions,
        execution_status: executionResult.status,
        error_message: executionResult.error_message,
        executed_at: new Date().toISOString(),
      });

      // Update rule execution count
      await supabase
        .from('automation_rules')
        .update({
          execution_count: rule.execution_count + 1,
          last_executed: new Date().toISOString(),
        })
        .eq('id', rule.id);

      return executionResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.executions() });
      queryClient.invalidateQueries({ queryKey: automationKeys.rules() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Hook to get automation suggestions based on user patterns
export function useAutomationSuggestions() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['automation-suggestions', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get user's task patterns
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Analyze patterns and suggest automation rules
      const suggestions = analyzeAutomationOpportunities(tasks || []);

      return suggestions;
    },
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook to test an automation rule without executing it
export function useTestAutomationRule() {
  return useMutation({
    mutationFn: async (payload: {
      rule: Partial<AutomationRule>;
      task_id: string;
      trigger_context?: Record<string, any>;
    }) => {
      const { rule, task_id, trigger_context = {} } = payload;

      // Get the task data
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task_id)
        .single();

      if (taskError) throw taskError;

      // Validate the rule
      const validationResult = await validateAutomationRule(
        rule as AutomationRule
      );
      if (!validationResult.isValid) {
        return {
          isValid: false,
          errors: validationResult.errors,
          wouldExecute: false,
        };
      }

      // Test if the rule would execute
      const wouldExecute = evaluateAutomationConditions(
        rule.conditions || {},
        task,
        trigger_context
      );

      return {
        isValid: true,
        errors: [],
        wouldExecute,
        task: task,
        conditions: rule.conditions,
        actions: rule.actions,
      };
    },
  });
}

// Utility function to analyze automation opportunities
function analyzeAutomationOpportunities(tasks: any[]) {
  const suggestions = [];

  // Analyze completion patterns
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const followUpPattern = completedTasks.filter(
    (t) => t.tag === 'meeting' || t.tag === 'call'
  ).length;

  if (followUpPattern > 3) {
    suggestions.push({
      type: 'follow_up_automation',
      title: 'Automate Follow-up Tasks',
      description:
        'Create follow-up tasks automatically after completing meetings or calls',
      confidence: 0.8,
      suggested_rule: {
        trigger: 'task_completed',
        conditions: { 'task.tag': ['meeting', 'call'] },
        actions: [
          {
            type: 'create_task',
            parameters: {
              title: 'Follow up on {task.title}',
              tag: 'follow-up',
              due_date: '+3 days',
              priority: 'medium',
            },
          },
        ],
      },
    });
  }

  // Analyze overdue patterns
  const overdueTasks = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) < new Date() &&
      t.status !== 'completed'
  );

  if (overdueTasks.length > 2) {
    suggestions.push({
      type: 'overdue_management',
      title: 'Automate Overdue Task Management',
      description:
        'Automatically increase priority and send notifications for overdue tasks',
      confidence: 0.7,
      suggested_rule: {
        trigger: 'task_overdue',
        conditions: { days_overdue: { '>': 1 } },
        actions: [
          {
            type: 'update_priority',
            parameters: { priority: 'high' },
          },
          {
            type: 'send_notification',
            parameters: {
              message: 'Task "{task.title}" is overdue and needs attention',
              type: 'overdue_alert',
            },
          },
        ],
      },
    });
  }

  return suggestions;
}

// Utility function to evaluate automation conditions
function evaluateAutomationConditions(
  conditions: Record<string, any>,
  task: any,
  context: Record<string, any>
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    const actualValue = getNestedValue(key, { task, context });

    if (!evaluateCondition(actualValue, value)) {
      return false;
    }
  }

  return true;
}

function getNestedValue(path: string, data: any): any {
  return path.split('.').reduce((obj, key) => obj?.[key], data);
}

function evaluateCondition(actual: any, expected: any): boolean {
  if (typeof expected === 'object' && expected !== null) {
    // Handle comparison operators
    if (expected['>']) return actual > expected['>'];
    if (expected['>=']) return actual >= expected['>='];
    if (expected['<']) return actual < expected['<'];
    if (expected['<=']) return actual <= expected['<='];
    if (expected['!=']) return actual !== expected['!='];
    if (expected['in']) return expected['in'].includes(actual);
    if (expected['not_in']) return !expected['not_in'].includes(actual);
  }

  // Handle array values (OR condition)
  if (Array.isArray(expected)) {
    return expected.includes(actual);
  }

  // Direct equality
  return actual === expected;
}
