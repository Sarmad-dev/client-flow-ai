# Task Automation System

## Overview

The task automation system allows users to create rules that automatically execute actions when specific triggers occur. This document explains how to use the system and what each component does.

## Triggers

Triggers define when an automation rule should execute:

### 1. Task Completed

- **Event**: When a task status changes to "completed"
- **Use Cases**: Create follow-up tasks, notify team members, update related tasks
- **Available Conditions**:
  - `task.priority` - Filter by task priority
  - `task.tag` - Filter by task tag (e.g., meeting, call)
  - `task.client_id` - Filter by specific client
  - `task.has_subtasks` - Check if task has subtasks

### 2. Task Overdue

- **Event**: When a task's due date has passed and status is not completed
- **Use Cases**: Escalate priority, send notifications, reassign tasks
- **Available Conditions**:
  - `task.priority` - Filter by task priority
  - `task.tag` - Filter by task tag
  - `task.client_id` - Filter by specific client
  - `days_overdue` - Number of days past due date (numeric)

### 3. Status Changed

- **Event**: When a task's status changes
- **Use Cases**: Update dependencies, log activity, notify stakeholders
- **Available Conditions**:
  - `task.from_status` - Previous status value
  - `task.to_status` - New status value
  - `task.priority` - Current task priority
  - `task.client_id` - Filter by specific client

### 4. Time Tracked

- **Event**: When time is logged on a task
- **Use Cases**: Update estimates, send alerts when over budget
- **Available Conditions**:
  - `time_entry.duration` - Duration of time entry (numeric, in hours)
  - `task.estimated_hours` - Task's estimated hours (numeric)
  - `task.actual_hours` - Total actual hours logged (numeric)

### 5. Due Date Approaching

- **Event**: When a task's due date is approaching
- **Use Cases**: Send reminders, increase priority, notify assignees
- **Available Conditions**:
  - `days_until_due` - Number of days until due date (numeric)
  - `task.priority` - Current task priority
  - `task.status` - Current task status
  - `task.client_id` - Filter by specific client

## Conditions

Conditions determine whether a rule should execute for a specific trigger event. Each condition has three parts:

### 1. Field

The property to evaluate (e.g., `task.priority`, `days_overdue`)

### 2. Operator

How to compare the field value:

#### For Numeric Fields (days, hours, duration, percentage):

- `=` - Equals
- `!=` - Not Equals
- `>` - Greater Than
- `>=` - Greater or Equal
- `<` - Less Than
- `<=` - Less or Equal

#### For Status/Priority Fields:

- `=` - Equals
- `!=` - Not Equals
- `in` - Is One Of (comma-separated list)
- `not_in` - Is Not One Of (comma-separated list)
- `changed_to` - Changed to this value
- `changed_from` - Changed from this value

#### For Tag/Category Fields:

- `=` - Equals
- `!=` - Not Equals
- `in` - Is One Of (comma-separated list)
- `not_in` - Is Not One Of (comma-separated list)

#### For Boolean Fields:

- `=` - Equals (true/false)
- `!=` - Not Equals (true/false)

#### For String Fields:

- `=` - Equals
- `!=` - Not Equals
- `contains` - Contains substring
- `starts_with` - Starts with
- `ends_with` - Ends with
- `in` - Is One Of (comma-separated list)
- `not_in` - Is Not One Of (comma-separated list)

### 3. Value

The value to compare against

**Examples**:

- Status equals "completed": `task.status` `=` `completed`
- Priority is high or urgent: `task.priority` `in` `high,urgent`
- More than 2 days overdue: `days_overdue` `>` `2`
- Status changed to in_progress: `task.to_status` `=` `in_progress`

## Actions

Actions define what happens when a rule's conditions are met:

### 1. Create Task

Creates a new task with specified properties.

**Parameters**:

- `title` - Task title (supports template variables)
- `description` - Task description
- `priority` - low, medium, high, urgent
- `due_date` - Relative date (e.g., "+3 days", "+1 week")
- `tag` - Task tag
- `status` - Initial status (default: pending)

**Example**: Create follow-up task 3 days after completing a meeting

### 2. Update Status

Changes the task's status.

**Parameters**:

- `status` - New status (pending, in_progress, completed, cancelled)

**Example**: Mark task as in_progress when dependency completes

### 3. Update Priority

Changes the task's priority.

**Parameters**:

- `priority` - New priority (low, medium, high, urgent)

**Example**: Escalate to high priority when task is 2+ days overdue

### 4. Send Notification

Sends a notification to the user.

**Parameters**:

- `message` - Notification message (supports template variables)
- `type` - Notification type (info, warning, error)

**Example**: Alert when task is overdue

### 5. Assign User

Assigns the task to a specific user.

**Parameters**:

- `user_id` - ID of user to assign

**Example**: Reassign overdue tasks to manager

### 6. Create Follow-up

Creates a follow-up task linked to the original.

**Parameters**:

- `title` - Follow-up task title (supports template variables)
- `due_date` - Relative date (e.g., "+3 days")
- `priority` - Task priority (default: medium)

**Example**: Create follow-up 3 days after completing a client call

### 7. Reschedule Task

Changes the task's due date.

**Parameters**:

- `due_date` - New relative due date (e.g., "+1 day", "+1 week")

**Example**: Push due date by 1 day when task becomes overdue

### 8. Add Task Dependency

Creates a dependency relationship between tasks.

**Parameters**:

- `depends_on_task_id` - ID of task this depends on

**Example**: Link related tasks in a workflow

### 9. Create Subtasks

Creates multiple subtasks under the current task.

**Parameters**:

- `subtasks` - JSON array of subtask objects with title, priority, etc.

**Example**: Break down large tasks into smaller pieces

### 10. Update Related Tasks

Updates all tasks related to the current task (same client or parent).

**Parameters**:

- `field` - Field to update (status, priority, etc.)
- `value` - New value for the field

**Example**: Update all client tasks when one is completed

### 11. Update Dependencies

Updates tasks that depend on the current task.

**Parameters**:

- `auto_start` - If true, starts dependent tasks when this completes

**Example**: Auto-start next phase when current phase completes

### 12. Log Activity

Logs an activity entry for the task.

**Parameters**:

- `activity_type` - Type of activity (automation, status_change, etc.)
- `description` - Activity description (supports template variables)

**Example**: Track when automation rules execute

### 13. Update Time Estimates

Updates the task's estimated hours.

**Parameters**:

- `estimated_hours` - New estimate (numeric)

**Example**: Adjust estimates based on actual time tracked

### 14. Create Report

Generates a report for the task.

**Parameters**:

- `report_type` - Type of report (time_summary, task_completion, etc.)

**Example**: Generate weekly summary when tasks complete

### 15. Create Reminder

Creates a reminder notification for the task.

**Parameters**:

- `reminder_time` - When to remind (relative, e.g., "+1 hour", "+1 day")
- `message` - Reminder message (supports template variables)

**Example**: Remind 1 day before due date

## Template Variables

Actions support template variables that are replaced with actual values:

- `{task.title}` - Task title
- `{task.status}` - Task status
- `{task.priority}` - Task priority
- `{task.tag}` - Task tag
- `{task.client_id}` - Client ID
- `{task.due_date}` - Due date

**Example**: "Follow up on {task.title}" becomes "Follow up on Client Meeting"

## Example Automation Rules

### 1. Auto-create Follow-ups for Meetings

- **Trigger**: Task Completed
- **Conditions**: `task.tag` `in` `meeting,call`
- **Actions**: Create Follow-up with title "Follow up on {task.title}", due in +3 days

### 2. Escalate Overdue Tasks

- **Trigger**: Task Overdue
- **Conditions**: `days_overdue` `>` `1`
- **Actions**:
  - Update Priority to "high"
  - Send Notification "Task '{task.title}' is overdue and needs attention"

### 3. Start Dependent Tasks

- **Trigger**: Status Changed
- **Conditions**: `task.to_status` `=` `completed`
- **Actions**: Update Dependencies with auto_start enabled

### 4. Time Budget Alert

- **Trigger**: Time Tracked
- **Conditions**: `task.actual_hours` `>` `task.estimated_hours`
- **Actions**: Send Notification "Task is over time budget"

### 5. Due Date Reminder

- **Trigger**: Due Date Approaching
- **Conditions**: `days_until_due` `=` `1`
- **Actions**: Create Reminder with message "Task '{task.title}' is due tomorrow"

## Best Practices

1. **Start Simple**: Begin with basic rules and add complexity as needed
2. **Test Rules**: Use the Test button to verify rules work as expected
3. **Avoid Loops**: Be careful with status_changed triggers that update status
4. **Use Specific Conditions**: Add conditions to prevent rules from firing too often
5. **Monitor Execution**: Check execution history to see how rules are performing
6. **Descriptive Names**: Give rules clear names that explain what they do
7. **Document Purpose**: Use the description field to explain why the rule exists

## Troubleshooting

### Rule Not Executing

- Check that the rule is Active
- Verify conditions match the actual task data
- Review execution history for error messages
- Use Test mode to debug

### Rule Executing Too Often

- Add more specific conditions
- Check for overlapping rules
- Review trigger selection

### Actions Failing

- Verify parameter values are correct
- Check for required fields (e.g., title for create_task)
- Review error messages in execution history
- Ensure referenced IDs (user_id, task_id) exist

## Technical Details

### Condition Evaluation

Conditions are evaluated using AND logic - all conditions must be true for the rule to execute.

### Action Execution

Actions execute sequentially in the order defined. If one action fails, subsequent actions still attempt to execute (partial success).

### Performance

Rules are evaluated asynchronously and don't block the main application. Execution history is logged for monitoring.
