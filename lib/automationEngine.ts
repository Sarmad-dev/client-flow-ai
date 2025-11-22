import { supabase } from './supabase';
import { executeAutomationRule } from './ai';
import type {
  AutomationRule,
  TaskRecord,
  TimeEntry,
} from '@/types/task-management';

/**
 * Automation Engine
 * Handles automatic execution of automation rules when triggers occur
 */

export type TriggerEvent =
  | 'task_completed'
  | 'task_overdue'
  | 'status_changed'
  | 'time_tracked'
  | 'due_date_approaching';

export interface TriggerContext {
  event: TriggerEvent;
  task: TaskRecord;
  oldTask?: Partial<TaskRecord>;
  timeEntry?: TimeEntry;
  metadata?: Record<string, any>;
}

/**
 * Main function to process automation triggers
 * Called when task-related events occur
 */
export async function processAutomationTriggers(
  context: TriggerContext
): Promise<void> {
  try {
    const { event, task } = context;

    // Get active automation rules for this user and trigger type
    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', task.user_id)
      .eq('trigger', event)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching automation rules:', error);
      return;
    }

    if (!rules || rules.length === 0) {
      return; // No rules to execute
    }

    console.log(
      `Processing ${rules.length} automation rule(s) for trigger: ${event}`
    );

    // Execute each matching rule
    for (const rule of rules) {
      try {
        await executeAutomationRuleWithLogging(rule, context);
      } catch (error) {
        console.error(`Error executing automation rule ${rule.id}:`, error);
        // Continue with other rules even if one fails
      }
    }
  } catch (error) {
    console.error('Error in processAutomationTriggers:', error);
  }
}

/**
 * Execute an automation rule and log the execution
 */
async function executeAutomationRuleWithLogging(
  rule: any,
  context: TriggerContext
): Promise<void> {
  const { task, oldTask, timeEntry, metadata } = context;

  // Build trigger context for condition evaluation
  const triggerContext: Record<string, any> = {
    event: context.event,
    metadata: metadata || {},
  };

  // Add event-specific context
  if (oldTask) {
    triggerContext.old_task = oldTask;
    triggerContext.from_status = oldTask.status;
    triggerContext.to_status = task.status;
  }

  if (timeEntry) {
    triggerContext.time_entry = timeEntry;
  }

  // Calculate days overdue if applicable
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    triggerContext.days_overdue = daysOverdue;
    triggerContext.is_overdue = daysOverdue > 0;
  }

  // Calculate days until due if applicable
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const daysUntilDue = Math.floor(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    triggerContext.days_until_due = daysUntilDue;
  }

  // Execute the automation rule
  const executionResult = await executeAutomationRule(
    rule,
    task,
    triggerContext
  );

  // Log the execution
  await supabase.from('automation_executions').insert({
    rule_id: rule.id,
    user_id: rule.user_id,
    task_id: task.id,
    trigger_event: context.event,
    executed_actions: executionResult.executed_actions,
    execution_status: executionResult.status,
    error_message: executionResult.error_message,
    executed_at: new Date().toISOString(),
  });

  // Update rule execution count and last executed time
  await supabase
    .from('automation_rules')
    .update({
      execution_count: rule.execution_count + 1,
      last_executed: new Date().toISOString(),
    })
    .eq('id', rule.id);

  console.log(
    `Automation rule ${rule.id} executed with status: ${executionResult.status}`
  );
}

/**
 * Trigger automation when a task is completed
 */
export async function triggerTaskCompleted(task: TaskRecord): Promise<void> {
  await processAutomationTriggers({
    event: 'task_completed',
    task,
  });
}

/**
 * Trigger automation when a task status changes
 */
export async function triggerStatusChanged(
  task: TaskRecord,
  oldStatus: TaskRecord['status']
): Promise<void> {
  await processAutomationTriggers({
    event: 'status_changed',
    task,
    oldTask: { status: oldStatus },
  });
}

/**
 * Trigger automation when time is tracked on a task
 */
export async function triggerTimeTracked(
  task: TaskRecord,
  timeEntry: TimeEntry
): Promise<void> {
  await processAutomationTriggers({
    event: 'time_tracked',
    task,
    timeEntry,
  });
}

/**
 * Trigger automation when a task becomes overdue
 * This should be called by a scheduled job/cron
 */
export async function triggerTaskOverdue(task: TaskRecord): Promise<void> {
  await processAutomationTriggers({
    event: 'task_overdue',
    task,
  });
}

/**
 * Trigger automation when a task due date is approaching
 * This should be called by a scheduled job/cron
 */
export async function triggerDueDateApproaching(
  task: TaskRecord
): Promise<void> {
  await processAutomationTriggers({
    event: 'due_date_approaching',
    task,
  });
}

/**
 * Check for overdue tasks and trigger automations
 * Should be called by a scheduled job (e.g., daily)
 */
export async function checkOverdueTasks(userId: string): Promise<void> {
  try {
    const now = new Date();

    // Get all overdue tasks for the user
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'in', '(completed,cancelled)')
      .not('due_date', 'is', null)
      .lt('due_date', now.toISOString());

    if (error) {
      console.error('Error fetching overdue tasks:', error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    console.log(`Found ${tasks.length} overdue tasks for user ${userId}`);

    // Trigger automation for each overdue task
    for (const task of tasks) {
      await triggerTaskOverdue(task as TaskRecord);
    }
  } catch (error) {
    console.error('Error in checkOverdueTasks:', error);
  }
}

/**
 * Check for tasks with approaching due dates and trigger automations
 * Should be called by a scheduled job (e.g., daily)
 */
export async function checkApproachingDueDates(
  userId: string,
  daysAhead: number = 3
): Promise<void> {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get tasks with due dates in the next X days
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'in', '(completed,cancelled)')
      .not('due_date', 'is', null)
      .gte('due_date', now.toISOString())
      .lte('due_date', futureDate.toISOString());

    if (error) {
      console.error('Error fetching tasks with approaching due dates:', error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    console.log(
      `Found ${tasks.length} tasks with approaching due dates for user ${userId}`
    );

    // Trigger automation for each task
    for (const task of tasks) {
      await triggerDueDateApproaching(task as TaskRecord);
    }
  } catch (error) {
    console.error('Error in checkApproachingDueDates:', error);
  }
}

/**
 * Run all scheduled automation checks for a user
 * Should be called by a scheduled job
 */
export async function runScheduledAutomationChecks(
  userId: string
): Promise<void> {
  console.log(`Running scheduled automation checks for user ${userId}`);

  await Promise.all([
    checkOverdueTasks(userId),
    checkApproachingDueDates(userId, 3),
  ]);

  console.log(`Completed scheduled automation checks for user ${userId}`);
}

/**
 * Run scheduled automation checks for all active users
 * Should be called by a cron job/edge function
 */
export async function runScheduledAutomationChecksForAllUsers(): Promise<void> {
  try {
    console.log('Running scheduled automation checks for all users');

    // Get all users who have active automation rules
    const { data: activeRules, error } = await supabase
      .from('automation_rules')
      .select('user_id')
      .eq('is_active', true)
      .in('trigger', ['task_overdue', 'due_date_approaching']);

    if (error) {
      console.error('Error fetching active automation rules:', error);
      return;
    }

    if (!activeRules || activeRules.length === 0) {
      console.log('No active automation rules found');
      return;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeRules.map((r) => r.user_id))];

    console.log(
      `Running automation checks for ${uniqueUserIds.length} users with active rules`
    );

    // Run checks for each user
    for (const userId of uniqueUserIds) {
      try {
        await runScheduledAutomationChecks(userId);
      } catch (error) {
        console.error(`Error running checks for user ${userId}:`, error);
        // Continue with other users
      }
    }

    console.log('Completed scheduled automation checks for all users');
  } catch (error) {
    console.error('Error in runScheduledAutomationChecksForAllUsers:', error);
  }
}
