# Design Document

## Overview

The comprehensive task management system will enhance NexaSuit's existing task functionality with advanced features while maintaining the current React Native architecture, Supabase backend, and established UI/UX patterns. The design focuses on scalability, performance, and seamless integration with existing components.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Task Screens  │  Task Components  │  Task Modals/Forms     │
│  - TaskBoard   │  - TaskCard       │  - TaskForm            │
│  - TaskList    │  - SubtaskCard    │  - TemplateForm        │
│  - Analytics   │  - TimeTracker    │  - DependencyPicker    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Custom Hooks  │  Context Providers │  Utility Functions    │
│  - useTasks    │  - TaskContext     │  - taskUtils          │
│  - useSubtasks │  - TimeContext     │  - dependencyUtils    │
│  - useTemplates│  - AnalyticsContext│  - automationEngine   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Supabase Client │  React Query    │  Local Storage        │
│  - Database      │  - Caching      │  - Offline Queue      │
│  - Real-time     │  - Mutations    │  - User Preferences   │
│  - Auth          │  - Sync         │  - Templates          │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Extensions

The design extends the existing task table and adds new related tables:

```sql
-- Enhanced tasks table (extends existing)
ALTER TABLE tasks ADD COLUMN parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN estimated_hours decimal;
ALTER TABLE tasks ADD COLUMN actual_hours decimal DEFAULT 0;
ALTER TABLE tasks ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE tasks ADD COLUMN is_template boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN automation_rules jsonb;

-- New tables
CREATE TABLE task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE TABLE task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL,
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  description text,
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);
```

## Components and Interfaces

### Core Components

#### 1. Enhanced TaskCard Component

```typescript
interface EnhancedTaskCardProps {
  task: TaskRecord;
  showSubtasks?: boolean;
  showTimeTracking?: boolean;
  showProgress?: boolean;
  onToggleComplete: () => void;
  onStartTimer?: () => void;
  onPress?: () => void;
  onDelete?: () => void;
}
```

Features:

- Progress bar for subtask completion
- Time tracking controls
- Dependency indicators
- Collaboration badges
- Quick actions menu

#### 2. TaskBoard Component

```typescript
interface TaskBoardProps {
  tasks: TaskRecord[];
  columns: BoardColumn[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onTaskPress: (task: TaskRecord) => void;
  filters?: TaskFilters;
}

interface BoardColumn {
  id: string;
  title: string;
  status: TaskStatus;
  color: string;
  limit?: number;
}
```

Features:

- Drag-and-drop functionality
- Column customization
- WIP limits
- Swimlanes by priority/client

#### 3. SubtaskManager Component

```typescript
interface SubtaskManagerProps {
  parentTaskId: string;
  subtasks: SubtaskRecord[];
  onAddSubtask: (subtask: Partial<SubtaskRecord>) => void;
  onUpdateSubtask: (id: string, updates: Partial<SubtaskRecord>) => void;
  onDeleteSubtask: (id: string) => void;
  readonly?: boolean;
}
```

Features:

- Inline subtask creation
- Progress calculation
- Bulk operations
- Reordering capabilities

#### 4. TimeTracker Component

```typescript
interface TimeTrackerProps {
  taskId: string;
  isActive: boolean;
  currentEntry?: TimeEntry;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onManualEntry: (entry: Partial<TimeEntry>) => void;
}
```

Features:

- Real-time timer display
- Pause/resume functionality
- Manual time entry
- Time entry history

#### 5. TaskTemplate Component

```typescript
interface TaskTemplateProps {
  template?: TaskTemplate;
  onSave: (template: TaskTemplate) => void;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'use';
}
```

Features:

- Template creation wizard
- Variable substitution
- Preview functionality
- Template sharing

#### 6. TaskAnalytics Component

```typescript
interface TaskAnalyticsProps {
  dateRange: DateRange;
  filters?: AnalyticsFilters;
  chartType: 'line' | 'bar' | 'pie' | 'donut';
}
```

Features:

- Interactive charts using Victory Native
- Drill-down capabilities
- Export functionality
- Real-time updates

### Navigation Structure

```
TasksStack
├── TasksScreen (Enhanced with board/list toggle)
├── TaskBoardScreen (New Kanban view)
├── TaskDetailScreen (Enhanced with subtasks, time tracking)
├── TaskAnalyticsScreen (New analytics dashboard)
├── TaskTemplatesScreen (New template management)
└── TaskSettingsScreen (New automation & preferences)
```

### State Management

#### Task Context Enhancement

```typescript
interface TaskContextValue {
  // Existing
  tasks: TaskRecord[];
  createTask: (task: Partial<TaskRecord>) => Promise<TaskRecord>;
  updateTask: (id: string, updates: Partial<TaskRecord>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // New
  subtasks: SubtaskRecord[];
  templates: TaskTemplate[];
  timeEntries: TimeEntry[];
  dependencies: TaskDependency[];

  // Subtask operations
  createSubtask: (subtask: Partial<SubtaskRecord>) => Promise<SubtaskRecord>;
  updateSubtask: (id: string, updates: Partial<SubtaskRecord>) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;

  // Template operations
  createTemplate: (template: Partial<TaskTemplate>) => Promise<TaskTemplate>;
  useTemplate: (
    templateId: string,
    variables: Record<string, any>
  ) => Promise<TaskRecord>;

  // Time tracking
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: (taskId: string) => Promise<void>;
  addTimeEntry: (entry: Partial<TimeEntry>) => Promise<TimeEntry>;

  // Dependencies
  addDependency: (taskId: string, dependsOnId: string) => Promise<void>;
  removeDependency: (taskId: string, dependsOnId: string) => Promise<void>;

  // Analytics
  getTaskAnalytics: (filters: AnalyticsFilters) => Promise<TaskAnalytics>;

  // Automation
  configureAutomation: (
    taskId: string,
    rules: AutomationRule[]
  ) => Promise<void>;
}
```

## Data Models

### Enhanced Task Model

```typescript
interface TaskRecord {
  // Existing fields
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tag: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;

  // New fields
  parent_task_id: string | null;
  template_id: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  progress_percentage: number;
  is_template: boolean;
  automation_rules: AutomationRule[] | null;

  // Computed/joined fields
  subtasks?: SubtaskRecord[];
  dependencies?: TaskDependency[];
  time_entries?: TimeEntry[];
  comments?: TaskComment[];
  assignments?: TaskAssignment[];
  clients?: { name: string; company: string };
}
```

### New Models

```typescript
interface SubtaskRecord
  extends Omit<TaskRecord, 'parent_task_id' | 'subtasks'> {
  parent_task_id: string;
}

interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_data: {
    task: Partial<TaskRecord>;
    subtasks: Partial<SubtaskRecord>[];
    dependencies: { from: number; to: number }[];
  };
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  is_manual: boolean;
  created_at: string;
}

interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

interface AutomationRule {
  id: string;
  trigger:
    | 'task_completed'
    | 'task_overdue'
    | 'status_changed'
    | 'time_tracked';
  conditions: Record<string, any>;
  actions: AutomationAction[];
  enabled: boolean;
}

interface AutomationAction {
  type: 'create_task' | 'send_notification' | 'update_status' | 'assign_user';
  parameters: Record<string, any>;
}
```

## Error Handling

### Error Types

```typescript
enum TaskErrorType {
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  INVALID_TEMPLATE = 'invalid_template',
  TIME_TRACKING_CONFLICT = 'time_tracking_conflict',
  PERMISSION_DENIED = 'permission_denied',
  SYNC_CONFLICT = 'sync_conflict',
  OFFLINE_OPERATION = 'offline_operation',
}

interface TaskError extends Error {
  type: TaskErrorType;
  taskId?: string;
  details?: Record<string, any>;
}
```

### Error Handling Strategy

- Graceful degradation for offline scenarios
- Conflict resolution for concurrent edits
- User-friendly error messages with recovery options
- Automatic retry for transient failures
- Rollback capabilities for failed operations

## Testing Strategy

### Unit Testing

- Component rendering and interaction tests
- Hook functionality and state management tests
- Utility function tests for calculations and validations
- Database operation mocking and testing

### Integration Testing

- End-to-end task creation and management workflows
- Real-time synchronization testing
- Offline/online transition testing
- Cross-component communication testing

### Performance Testing

- Large dataset handling (1000+ tasks)
- Real-time update performance
- Memory usage optimization
- Battery usage monitoring for time tracking

### User Acceptance Testing

- Task workflow completion scenarios
- Accessibility compliance testing
- Cross-platform consistency verification
- User experience validation

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load subtasks and dependencies on demand
2. **Virtualization**: Use FlatList for large task lists
3. **Caching**: Implement intelligent caching for frequently accessed data
4. **Debouncing**: Debounce search and filter operations
5. **Background Sync**: Sync data in background to maintain responsiveness

### Memory Management

- Implement proper cleanup for timers and subscriptions
- Use React.memo for expensive components
- Optimize image and asset loading
- Monitor and prevent memory leaks in real-time features

### Database Optimization

- Implement proper indexing for query performance
- Use database functions for complex calculations
- Batch operations where possible
- Implement pagination for large datasets

## Security Considerations

### Data Protection

- Row-level security for all task-related tables
- Encryption for sensitive task data
- Secure handling of time tracking data
- Audit logging for task modifications

### Access Control

- Role-based permissions for team collaboration
- Template sharing controls
- Time entry validation and approval workflows
- Secure API endpoints with proper authentication

This design maintains consistency with NexaSuit's existing architecture while providing a robust foundation for advanced task management features. The modular approach ensures maintainability and allows for incremental implementation of features.
