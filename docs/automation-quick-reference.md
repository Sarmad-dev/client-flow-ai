# Automation System Quick Reference

## Condition Syntax Examples

### Status Conditions

```typescript
// Single status
{ field: 'task.status', operator: '=', value: 'completed' }

// Multiple statuses (OR)
{ field: 'task.status', operator: 'in', value: 'pending,in_progress' }

// Status changed to
{ field: 'task.to_status', operator: 'changed_to', value: 'completed' }

// Status changed from
{ field: 'task.from_status', operator: 'changed_from', value: 'pending' }
```

### Priority Conditions

```typescript
// High priority only
{ field: 'task.priority', operator: '=', value: 'high' }

// High or urgent
{ field: 'task.priority', operator: 'in', value: 'high,urgent' }

// Not low priority
{ field: 'task.priority', operator: '!=', value: 'low' }
```

### Numeric Conditions

```typescript
// More than 2 days overdue
{ field: 'days_overdue', operator: '>', value: '2' }

// At least 5 hours tracked
{ field: 'task.actual_hours', operator: '>=', value: '5' }

// Less than estimated
{ field: 'task.actual_hours', operator: '<', value: 'task.estimated_hours' }

// Due within 1 day
{ field: 'days_until_due', operator: '<=', value: '1' }
```

### Tag/Category Conditions

```typescript
// Specific tag
{ field: 'task.tag', operator: '=', value: 'meeting' }

// Multiple tags
{ field: 'task.tag', operator: 'in', value: 'meeting,call,follow-up' }

// Exclude tags
{ field: 'task.tag', operator: 'not_in', value: 'internal,admin' }
```

### Boolean Conditions

```typescript
// Has subtasks
{ field: 'task.has_subtasks', operator: '=', value: 'true' }

// Not a template
{ field: 'task.is_template', operator: '=', value: 'false' }
```

## Action Parameter Examples

### Create Task

```typescript
{
  type: 'create_task',
  parameters: {
    title: 'Follow up on {task.title}',
    description: 'Follow-up task for completed {task.tag}',
    priority: 'medium',
    due_date: '+3 days',
    tag: 'follow-up',
    status: 'pending'
  }
}
```

### Update Status

```typescript
{
  type: 'update_status',
  parameters: {
    status: 'in_progress'
  }
}
```

### Update Priority

```typescript
{
  type: 'update_priority',
  parameters: {
    priority: 'high'
  }
}
```

### Send Notification

```typescript
{
  type: 'send_notification',
  parameters: {
    message: 'Task "{task.title}" is overdue by {days_overdue} days',
    type: 'warning'
  }
}
```

### Create Follow-up

```typescript
{
  type: 'create_follow_up',
  parameters: {
    title: 'Follow up: {task.title}',
    due_date: '+3 days',
    priority: 'medium'
  }
}
```

### Reschedule

```typescript
{
  type: 'reschedule',
  parameters: {
    due_date: '+1 week'
  }
}
```

### Create Subtasks

```typescript
{
  type: 'create_subtasks',
  parameters: {
    subtasks: [
      { title: 'Research phase', priority: 'high', due_date: '+1 day' },
      { title: 'Implementation', priority: 'medium', due_date: '+3 days' },
      { title: 'Testing', priority: 'medium', due_date: '+5 days' }
    ]
  }
}
```

### Update Related Tasks

```typescript
{
  type: 'update_related_tasks',
  parameters: {
    field: 'status',
    value: 'on_hold'
  }
}
```

### Update Dependencies

```typescript
{
  type: 'update_dependencies',
  parameters: {
    auto_start: true
  }
}
```

### Log Activity

```typescript
{
  type: 'log_activity',
  parameters: {
    activity_type: 'automation',
    description: 'Task automatically escalated due to overdue status'
  }
}
```

### Create Reminder

```typescript
{
  type: 'create_reminder',
  parameters: {
    reminder_time: '+1 day',
    message: 'Task "{task.title}" is due tomorrow'
  }
}
```

## Complete Rule Examples

### Example 1: Meeting Follow-ups

```typescript
{
  name: 'Auto-create follow-ups for meetings',
  description: 'Creates a follow-up task 3 days after completing a meeting',
  trigger: 'task_completed',
  conditions: {
    'task.tag': { operator: 'in', value: ['meeting', 'call'] }
  },
  actions: [
    {
      type: 'create_follow_up',
      parameters: {
        title: 'Follow up on {task.title}',
        due_date: '+3 days',
        priority: 'medium'
      }
    }
  ],
  is_active: true
}
```

### Example 2: Overdue Escalation

```typescript
{
  name: 'Escalate overdue high-priority tasks',
  description: 'Increases priority and sends notification for overdue tasks',
  trigger: 'task_overdue',
  conditions: {
    'days_overdue': { operator: '>', value: 1 },
    'task.priority': { operator: 'in', value: ['high', 'urgent'] }
  },
  actions: [
    {
      type: 'update_priority',
      parameters: { priority: 'urgent' }
    },
    {
      type: 'send_notification',
      parameters: {
        message: 'URGENT: Task "{task.title}" is {days_overdue} days overdue',
        type: 'error'
      }
    }
  ],
  is_active: true
}
```

### Example 3: Dependency Chain

```typescript
{
  name: 'Auto-start dependent tasks',
  description: 'Starts tasks that depend on completed tasks',
  trigger: 'status_changed',
  conditions: {
    'task.to_status': { operator: '=', value: 'completed' }
  },
  actions: [
    {
      type: 'update_dependencies',
      parameters: { auto_start: true }
    },
    {
      type: 'log_activity',
      parameters: {
        activity_type: 'workflow',
        description: 'Completed task, starting dependent tasks'
      }
    }
  ],
  is_active: true
}
```

### Example 4: Time Budget Alert

```typescript
{
  name: 'Alert when over time budget',
  description: 'Sends notification when actual hours exceed estimate',
  trigger: 'time_tracked',
  conditions: {
    'task.actual_hours': { operator: '>', value: 'task.estimated_hours' }
  },
  actions: [
    {
      type: 'send_notification',
      parameters: {
        message: 'Task "{task.title}" is over budget: {task.actual_hours}h / {task.estimated_hours}h',
        type: 'warning'
      }
    }
  ],
  is_active: true
}
```

### Example 5: Due Date Reminder

```typescript
{
  name: 'Remind 1 day before due',
  description: 'Creates reminder notification for tasks due tomorrow',
  trigger: 'due_date_approaching',
  conditions: {
    'days_until_due': { operator: '=', value: 1 },
    'task.status': { operator: 'not_in', value: ['completed', 'cancelled'] }
  },
  actions: [
    {
      type: 'create_reminder',
      parameters: {
        reminder_time: '+12 hours',
        message: 'Reminder: Task "{task.title}" is due tomorrow'
      }
    }
  ],
  is_active: true
}
```

## Relative Date Formats

Supported formats for `due_date`, `reminder_time`, etc.:

- `+1 hour` / `+2 hours`
- `+1 day` / `+3 days`
- `+1 week` / `+2 weeks`
- `+1 month` / `+3 months`

## Template Variables

Available in action parameters:

- `{task.title}` - Task title
- `{task.status}` - Current status
- `{task.priority}` - Current priority
- `{task.tag}` - Task tag
- `{task.client_id}` - Client ID
- `{task.due_date}` - Due date
- `{days_overdue}` - Days overdue (for overdue trigger)
- `{days_until_due}` - Days until due (for approaching trigger)

## Field Type Reference

### Numeric Fields

- `time_entry.duration`
- `task.estimated_hours`
- `task.actual_hours`
- `days_overdue`
- `days_until_due`
- `task.progress_percentage`

### Status/Priority Fields

- `task.status`
- `task.from_status`
- `task.to_status`
- `task.priority`

### Category Fields

- `task.tag`
- `task.client_id`

### Boolean Fields

- `task.has_subtasks`
- `task.is_template`

## Common Patterns

### Pattern: Workflow Automation

```typescript
// Step 1: Complete → Start Next
trigger: 'status_changed'
condition: task.to_status = 'completed'
action: update_dependencies (auto_start: true)

// Step 2: Log Progress
action: log_activity
```

### Pattern: Time Management

```typescript
// Alert on overrun
trigger: 'time_tracked';
condition: actual_hours > estimated_hours;
action: send_notification;

// Update estimates
action: update_estimates;
```

### Pattern: Priority Management

```typescript
// Escalate overdue
trigger: 'task_overdue';
condition: days_overdue > 2;
action: update_priority(urgent);

// Notify stakeholders
action: send_notification;
```

### Pattern: Follow-up Creation

```typescript
// Create follow-up
trigger: 'task_completed'
condition: task.tag in 'meeting,call,client-visit'
action: create_follow_up (+3 days)
```
