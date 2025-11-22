// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Edge Function: Run Scheduled Automations
 *
 * This function should be called by a cron job (e.g., daily) to:
 * - Check for overdue tasks and trigger automations
 * - Check for tasks with approaching due dates and trigger automations
 *
 * Usage:
 * - Set up a cron job in Supabase to call this function daily
 * - Or call it manually: POST /functions/v1/run-scheduled-automations
 */

interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  trigger: string;
  conditions: Record<string, any>;
  actions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;
  is_active: boolean;
  execution_count: number;
}

interface Task {
  id: string;
  user_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  [key: string]: any;
}

async function checkOverdueTasks(userId: string): Promise<number> {
  const now = new Date();

  // Get all overdue tasks for the user
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .not('status', 'in', '(completed,cancelled)')
    .not('due_date', 'is', null)
    .lt('due_date', now.toISOString());

  if (error) {
    console.error('Error fetching overdue tasks:', error);
    return 0;
  }

  if (!tasks || tasks.length === 0) {
    return 0;
  }

  console.log(`Found ${tasks.length} overdue tasks for user ${userId}`);

  // Get active automation rules for overdue trigger
  const { data: rules, error: rulesError } = await supabaseAdmin
    .from('automation_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger', 'task_overdue')
    .eq('is_active', true);

  if (rulesError || !rules || rules.length === 0) {
    return 0;
  }

  let executedCount = 0;

  // Process each overdue task
  for (const task of tasks) {
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(task.due_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Execute matching rules
    for (const rule of rules) {
      try {
        const conditionsMet = evaluateConditions(rule.conditions, task, {
          days_overdue: daysOverdue,
          is_overdue: true,
        });

        if (conditionsMet) {
          await executeAutomationRule(rule, task, {
            days_overdue: daysOverdue,
          });
          executedCount++;
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
      }
    }
  }

  return executedCount;
}

async function checkApproachingDueDates(
  userId: string,
  daysAhead: number = 3
): Promise<number> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Get tasks with due dates in the next X days
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .not('status', 'in', '(completed,cancelled)')
    .not('due_date', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', futureDate.toISOString());

  if (error) {
    console.error('Error fetching tasks with approaching due dates:', error);
    return 0;
  }

  if (!tasks || tasks.length === 0) {
    return 0;
  }

  console.log(
    `Found ${tasks.length} tasks with approaching due dates for user ${userId}`
  );

  // Get active automation rules for due date approaching trigger
  const { data: rules, error: rulesError } = await supabaseAdmin
    .from('automation_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger', 'due_date_approaching')
    .eq('is_active', true);

  if (rulesError || !rules || rules.length === 0) {
    return 0;
  }

  let executedCount = 0;

  // Process each task
  for (const task of tasks) {
    const daysUntilDue = Math.floor(
      (new Date(task.due_date).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Execute matching rules
    for (const rule of rules) {
      try {
        const conditionsMet = evaluateConditions(rule.conditions, task, {
          days_until_due: daysUntilDue,
        });

        if (conditionsMet) {
          await executeAutomationRule(rule, task, {
            days_until_due: daysUntilDue,
          });
          executedCount++;
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
      }
    }
  }

  return executedCount;
}

function evaluateConditions(
  conditions: Record<string, any>,
  task: Task,
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
    if (expected['>']) return actual > expected['>'];
    if (expected['>=']) return actual >= expected['>='];
    if (expected['<']) return actual < expected['<'];
    if (expected['<=']) return actual <= expected['<='];
    if (expected['!=']) return actual !== expected['!='];
    if (expected['in']) return expected['in'].includes(actual);
    if (expected['not_in']) return !expected['not_in'].includes(actual);
  }

  if (Array.isArray(expected)) {
    return expected.includes(actual);
  }

  return actual === expected;
}

async function executeAutomationRule(
  rule: AutomationRule,
  task: Task,
  context: Record<string, any>
): Promise<void> {
  const executedActions: any[] = [];
  let hasErrors = false;
  let errorMessage: string | null = null;

  // Execute each action
  for (const action of rule.actions) {
    try {
      const result = await executeAction(action, task, context);
      executedActions.push({
        ...action,
        result,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
      hasErrors = true;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      executedActions.push({
        ...action,
        error: errorMessage,
        executed_at: new Date().toISOString(),
      });
    }
  }

  // Log the execution
  await supabaseAdmin.from('automation_executions').insert({
    rule_id: rule.id,
    user_id: rule.user_id,
    task_id: task.id,
    trigger_event: rule.trigger,
    executed_actions: executedActions,
    execution_status: hasErrors
      ? executedActions.length > 0
        ? 'partial'
        : 'failed'
      : 'success',
    error_message: errorMessage,
    executed_at: new Date().toISOString(),
  });

  // Update rule execution count
  await supabaseAdmin
    .from('automation_rules')
    .update({
      execution_count: rule.execution_count + 1,
      last_executed: new Date().toISOString(),
    })
    .eq('id', rule.id);
}

async function executeAction(
  action: any,
  task: Task,
  context: Record<string, any>
): Promise<any> {
  switch (action.type) {
    case 'update_priority':
      return await updateTaskPriority(task, action.parameters);

    case 'send_notification':
      return await sendNotification(task, action.parameters, context);

    case 'update_status':
      return await updateTaskStatus(task, action.parameters);

    case 'create_task':
      return await createTask(task, action.parameters, context);

    default:
      console.log(
        `Action type ${action.type} not implemented in edge function`
      );
      return { skipped: true, reason: 'Not implemented' };
  }
}

async function updateTaskPriority(task: Task, parameters: any): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({
      priority: parameters.priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_priority: task.priority,
    new_priority: parameters.priority,
  };
}

async function updateTaskStatus(task: Task, parameters: any): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({
      status: parameters.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_status: task.status,
    new_status: parameters.status,
  };
}

async function sendNotification(
  task: Task,
  parameters: any,
  context: Record<string, any>
): Promise<any> {
  // In a real implementation, this would send actual notifications
  // For now, we'll just log it
  const message = processTemplateVariables(
    parameters.message || 'Task notification',
    task,
    context
  );

  console.log(`Automation Notification: ${message}`);

  return {
    notification_sent: true,
    message: message,
    type: parameters.type || 'general',
  };
}

async function createTask(
  originalTask: Task,
  parameters: any,
  context: Record<string, any>
): Promise<any> {
  const processedParams = processTemplateVariables(
    parameters,
    originalTask,
    context
  );

  const newTask = {
    user_id: originalTask.user_id,
    title: processedParams.title || 'Automated Task',
    description: processedParams.description || null,
    client_id: processedParams.client_id || originalTask.client_id,
    priority: processedParams.priority || 'medium',
    status: processedParams.status || 'pending',
    tag: processedParams.tag || 'follow-up',
    due_date: calculateDueDate(processedParams.due_date),
    estimated_hours: processedParams.estimated_hours || null,
    ai_generated: true,
    ai_confidence_score: 0.8,
  };

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert(newTask)
    .select()
    .single();

  if (error) throw error;

  return {
    created_task_id: data.id,
    task_data: data,
  };
}

function processTemplateVariables(
  template: any,
  task: Task,
  context: Record<string, any>
): any {
  if (typeof template === 'string') {
    return template
      .replace(/\{task\.(\w+)\}/g, (_, key) => task[key] || '')
      .replace(/\{context\.(\w+)\}/g, (_, key) => context[key] || '');
  }

  if (typeof template === 'object' && template !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = processTemplateVariables(value, task, context);
    }
    return result;
  }

  return template;
}

function calculateDueDate(dueDateSpec: any): string | null {
  if (!dueDateSpec) return null;

  if (typeof dueDateSpec === 'string' && dueDateSpec.startsWith('+')) {
    const days = parseInt(dueDateSpec.substring(1));
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  return dueDateSpec;
}

async function handler(req: Request): Promise<Response> {
  const startTime = Date.now();

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Starting scheduled automation checks',
      timestamp: new Date().toISOString(),
    })
  );

  try {
    // Get all users who have active automation rules for scheduled triggers
    const { data: activeRules, error } = await supabaseAdmin
      .from('automation_rules')
      .select('user_id')
      .eq('is_active', true)
      .in('trigger', ['task_overdue', 'due_date_approaching']);

    if (error) {
      throw error;
    }

    if (!activeRules || activeRules.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No active automation rules found',
          users_processed: 0,
          automations_executed: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeRules.map((r) => r.user_id))];

    console.log(
      `Processing automation checks for ${uniqueUserIds.length} users`
    );

    let totalExecuted = 0;
    const results: any[] = [];

    // Run checks for each user
    for (const userId of uniqueUserIds) {
      try {
        const overdueCount = await checkOverdueTasks(userId);
        const approachingCount = await checkApproachingDueDates(userId, 3);

        const userTotal = overdueCount + approachingCount;
        totalExecuted += userTotal;

        results.push({
          user_id: userId,
          overdue_automations: overdueCount,
          approaching_automations: approachingCount,
          total: userTotal,
        });
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.push({
          user_id: userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Completed scheduled automation checks',
        users_processed: uniqueUserIds.length,
        automations_executed: totalExecuted,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Scheduled automation checks completed',
        users_processed: uniqueUserIds.length,
        automations_executed: totalExecuted,
        duration_ms: duration,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Error in scheduled automation checks',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMsg,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
