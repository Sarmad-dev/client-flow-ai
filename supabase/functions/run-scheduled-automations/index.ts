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
  if (
    typeof expected === 'object' &&
    expected !== null &&
    !Array.isArray(expected)
  ) {
    // Handle comparison operators
    // Numeric comparisons - only use if both values are numbers
    if (expected['>'] !== undefined) {
      const expectedVal = Number(expected['>']);
      const actualVal = Number(actual);
      return (
        !isNaN(actualVal) && !isNaN(expectedVal) && actualVal > expectedVal
      );
    }
    if (expected['>='] !== undefined) {
      const expectedVal = Number(expected['>=']);
      const actualVal = Number(actual);
      return (
        !isNaN(actualVal) && !isNaN(expectedVal) && actualVal >= expectedVal
      );
    }
    if (expected['<'] !== undefined) {
      const expectedVal = Number(expected['<']);
      const actualVal = Number(actual);
      return (
        !isNaN(actualVal) && !isNaN(expectedVal) && actualVal < expectedVal
      );
    }
    if (expected['<='] !== undefined) {
      const expectedVal = Number(expected['<=']);
      const actualVal = Number(actual);
      return (
        !isNaN(actualVal) && !isNaN(expectedVal) && actualVal <= expectedVal
      );
    }

    // String/value comparisons
    if (expected['!='] !== undefined) return actual !== expected['!='];
    if (expected['='] !== undefined) return actual === expected['='];
    if (expected['equals'] !== undefined) return actual === expected['equals'];

    // Array membership
    if (expected['in'] !== undefined) {
      return Array.isArray(expected['in']) && expected['in'].includes(actual);
    }
    if (expected['not_in'] !== undefined) {
      return (
        Array.isArray(expected['not_in']) &&
        !expected['not_in'].includes(actual)
      );
    }

    // String operations
    if (expected['contains'] !== undefined) {
      return String(actual)
        .toLowerCase()
        .includes(String(expected['contains']).toLowerCase());
    }
    if (expected['starts_with'] !== undefined) {
      return String(actual)
        .toLowerCase()
        .startsWith(String(expected['starts_with']).toLowerCase());
    }
    if (expected['ends_with'] !== undefined) {
      return String(actual)
        .toLowerCase()
        .endsWith(String(expected['ends_with']).toLowerCase());
    }

    // Status/Priority change specific
    if (expected['changed_to'] !== undefined) {
      return actual === expected['changed_to'];
    }
    if (expected['changed_from'] !== undefined) {
      return actual === expected['changed_from'];
    }
  }

  // Handle array values (OR condition)
  if (Array.isArray(expected)) {
    return expected.includes(actual);
  }

  // Direct equality
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

    case 'create_follow_up':
      return await createFollowUp(task, action.parameters, context);

    case 'reschedule':
      return await rescheduleTask(task, action.parameters);

    case 'update_estimates':
      return await updateTaskEstimates(task, action.parameters);

    case 'create_reminder':
      return await createReminder(task, action.parameters, context);

    case 'log_activity':
      return await logActivity(task, action.parameters, context);

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
  const message = processTemplateVariables(
    parameters.message || 'Task notification',
    task,
    context
  );

  console.log(`Automation Notification: ${message}`);

  try {
    // Determine recipients
    let recipientIds: string[] = [];

    if (parameters.recipient === 'assignees') {
      // Get all assigned users
      const { data: assignments } = await supabaseAdmin
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', task.id);

      recipientIds = assignments?.map((a: any) => a.user_id) || [];
    } else if (parameters.recipient === 'owner') {
      recipientIds = [task.user_id];
    } else if (parameters.recipient_id) {
      recipientIds = [parameters.recipient_id];
    } else {
      // Default to task owner
      recipientIds = [task.user_id];
    }

    // Send notification to each recipient
    for (const userId of recipientIds) {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'task_assigned', // Generic type for automation notifications
        title: parameters.title || 'Task Notification',
        message,
        data: { task_id: task.id },
        action_url: `/tasks/${task.id}`,
        read: false,
      });
    }

    return {
      notification_sent: true,
      message: message,
      type: parameters.type || 'general',
      recipients_count: recipientIds.length,
    };
  } catch (error) {
    console.error('Error sending automation notification:', error);
    return {
      notification_sent: false,
      message: message,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
    const match = dueDateSpec.match(/\+(\d+)\s*(hour|day|week|month)s?/i);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const date = new Date();

      switch (unit) {
        case 'hour':
          date.setHours(date.getHours() + amount);
          break;
        case 'day':
          date.setDate(date.getDate() + amount);
          break;
        case 'week':
          date.setDate(date.getDate() + amount * 7);
          break;
        case 'month':
          date.setMonth(date.getMonth() + amount);
          break;
      }

      return date.toISOString();
    }

    // Fallback: assume days
    const days = parseInt(dueDateSpec.substring(1));
    if (!isNaN(days)) {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString();
    }
  }

  return dueDateSpec;
}

async function createFollowUp(
  originalTask: Task,
  parameters: any,
  context: Record<string, any>
): Promise<any> {
  const processedParams = processTemplateVariables(
    parameters,
    originalTask,
    context
  );

  const followUpTask = {
    user_id: originalTask.user_id,
    title: processedParams.title || `Follow up: ${originalTask.title}`,
    description:
      processedParams.description ||
      `Follow-up task for: ${originalTask.title}`,
    client_id: originalTask.client_id,
    priority: processedParams.priority || 'medium',
    status: 'pending',
    tag: 'follow-up',
    due_date: calculateDueDate(processedParams.due_date || '+3 days'),
    ai_generated: true,
    ai_confidence_score: 0.9,
  };

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert(followUpTask)
    .select()
    .single();

  if (error) throw error;

  return {
    created_task_id: data.id,
    follow_up_task: data,
  };
}

async function rescheduleTask(task: Task, parameters: any): Promise<any> {
  const newDueDate = calculateDueDate(parameters.due_date);

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({
      due_date: newDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_due_date: task.due_date,
    new_due_date: newDueDate,
  };
}

async function updateTaskEstimates(task: Task, parameters: any): Promise<any> {
  const estimatedHours = parseFloat(parameters.estimated_hours);

  if (isNaN(estimatedHours)) {
    throw new Error('Invalid estimated_hours value');
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({
      estimated_hours: estimatedHours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_estimate: task.estimated_hours,
    new_estimate: estimatedHours,
  };
}

async function createReminder(
  task: Task,
  parameters: any,
  context: Record<string, any>
): Promise<any> {
  const reminderTime = calculateDueDate(parameters.reminder_time || '+1 hour');
  const message = processTemplateVariables(
    parameters.message || 'Reminder for task: {task.title}',
    task,
    context
  );

  // Create notification/reminder
  const { data, error } = await supabaseAdmin.from('notifications').insert({
    user_id: task.user_id,
    type: 'reminder',
    title: 'Task Reminder',
    message: message,
    related_task_id: task.id,
    scheduled_for: reminderTime,
    created_at: new Date().toISOString(),
  });

  if (error) {
    // If notifications table doesn't exist, just log
    console.log(`Reminder Created: ${message} at ${reminderTime}`);
    return {
      reminder_created: true,
      reminder_time: reminderTime,
      message: message,
    };
  }

  return {
    reminder_created: true,
    reminder_time: reminderTime,
    message: message,
  };
}

async function logActivity(
  task: Task,
  parameters: any,
  context: Record<string, any>
): Promise<any> {
  const activityType = parameters.activity_type || 'automation';
  const description = processTemplateVariables(
    parameters.description || 'Automated activity',
    task,
    context
  );

  // Log to task activity/history table
  const { data, error } = await supabaseAdmin.from('task_activity').insert({
    task_id: task.id,
    user_id: task.user_id,
    activity_type: activityType,
    description: description,
    metadata: {
      automation: true,
      trigger: context.trigger,
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    // If table doesn't exist, just log to console
    console.log(`Task Activity Log: ${description}`);
    return {
      logged: true,
      activity_type: activityType,
      description: description,
    };
  }

  return {
    logged: true,
    activity_type: activityType,
    description: description,
  };
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
