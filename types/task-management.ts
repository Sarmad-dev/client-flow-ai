// Enhanced Task Management Type Definitions
// This file contains all TypeScript interfaces for the comprehensive task management system

import { TaskRecord } from '@/hooks/useTasks';

// Re-export the main TaskRecord interface from hooks for consistency
export type { TaskRecord } from '@/hooks/useTasks';

// Subtask interface - extends TaskRecord but with required parent_task_id
export interface SubtaskRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tag: 'follow-up' | 'proposal' | 'meeting' | 'call' | 'research' | 'design';
  due_date: string | null;
  voice_recording_id: string | null;
  ai_generated: boolean;
  ai_confidence_score: number | null;
  created_at: string;
  updated_at: string;

  // Subtask-specific fields
  parent_task_id: string; // Required for subtasks
  template_id: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  progress_percentage: number;
  is_template: boolean;
  automation_rules: AutomationRule[] | null;

  // Computed/joined fields
  time_entries?: TimeEntry[];
  comments?: TaskComment[];
  assignments?: TaskAssignment[];
}

// Task Template interface for reusable task structures
export interface TaskTemplate {
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

// Time Entry interface for time tracking
export interface TimeEntry {
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

// Task Dependency interface for task relationships
export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

// Task Comment interface for collaboration
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

// Task Assignment interface for team collaboration
export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
  assigned_by_user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

// Automation Rule interface for task automation
export interface AutomationRule {
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

// Automation Action interface for automated task actions
export interface AutomationAction {
  type: 'create_task' | 'send_notification' | 'update_status' | 'assign_user';
  parameters: Record<string, any>;
}

// Task Analytics interfaces for reporting and insights
export interface TaskAnalytics {
  overview: TaskOverviewMetrics;
  productivity: ProductivityMetrics;
  timeTracking: TimeTrackingMetrics;
  collaboration: CollaborationMetrics;
}

export interface TaskOverviewMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
}

export interface ProductivityMetrics {
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  averageTasksPerDay: number;
  productivityTrend: 'increasing' | 'decreasing' | 'stable';
  mostProductiveDay: string;
  mostProductiveHour: number;
}

export interface TimeTrackingMetrics {
  totalTimeTracked: number; // in minutes
  averageTimePerTask: number; // in minutes
  timeByPriority: Record<'low' | 'medium' | 'high' | 'urgent', number>;
  timeByStatus: Record<
    'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked',
    number
  >;
  timeByTag: Record<string, number>;
  estimationAccuracy: number; // percentage
}

export interface CollaborationMetrics {
  sharedTasks: number;
  assignedTasks: number;
  commentsCount: number;
  activeCollaborators: number;
  averageResponseTime: number; // in hours
}

// Filter and sorting interfaces
export interface TaskFilters {
  status?: (
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'blocked'
  )[];
  priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  tag?: string[];
  client_id?: string[];
  assigned_to?: string[];
  due_date_range?: {
    start: string;
    end: string;
  };
  has_subtasks?: boolean;
  has_dependencies?: boolean;
  is_overdue?: boolean;
  search_query?: string;
}

export interface TaskSortOptions {
  field:
    | 'created_at'
    | 'updated_at'
    | 'due_date'
    | 'priority'
    | 'status'
    | 'title'
    | 'progress_percentage';
  direction: 'asc' | 'desc';
}

// Board view interfaces for Kanban functionality
export interface BoardColumn {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  color: string;
  limit?: number; // WIP limit
  order: number;
}

export interface BoardConfiguration {
  columns: BoardColumn[];
  swimlanes?: 'priority' | 'client' | 'assignee' | 'none';
  show_subtasks: boolean;
  show_dependencies: boolean;
  auto_move_completed: boolean;
}

// Date range interface for analytics and filtering
export interface DateRange {
  start: string;
  end: string;
  preset?:
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'last_week'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'last_quarter'
    | 'this_year'
    | 'last_year'
    | 'custom';
}

// Analytics filter interface
export interface AnalyticsFilters {
  date_range: DateRange;
  client_ids?: string[];
  user_ids?: string[];
  priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  status?: (
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'blocked'
  )[];
  tags?: string[];
  include_subtasks?: boolean;
}

// Template variable interface for dynamic template usage
export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  default_value?: any;
  options?: string[]; // for select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// Enhanced template interface with variables
export interface EnhancedTaskTemplate extends TaskTemplate {
  variables: TemplateVariable[];
  category: string;
  tags: string[];
  is_favorite: boolean;
  last_used_at: string | null;
}

// Bulk operation interfaces
export interface BulkTaskOperation {
  task_ids: string[];
  operation:
    | 'update_status'
    | 'update_priority'
    | 'assign_user'
    | 'add_tag'
    | 'set_due_date'
    | 'delete';
  parameters: Record<string, any>;
}

export interface BulkOperationResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    task_id: string;
    error: string;
  }>;
}

// Notification interfaces for task updates
export interface TaskNotification {
  id: string;
  user_id: string;
  task_id: string;
  type:
    | 'assignment'
    | 'comment'
    | 'status_change'
    | 'due_date_reminder'
    | 'overdue'
    | 'completion';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task?: TaskRecord;
}

// Real-time update interfaces
export interface TaskUpdate {
  type:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'status_changed'
    | 'assigned'
    | 'commented';
  task_id: string;
  user_id: string;
  timestamp: string;
  changes?: Record<string, any>;
  task?: TaskRecord;
}

// Error handling interfaces
export enum TaskErrorType {
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  INVALID_TEMPLATE = 'invalid_template',
  TIME_TRACKING_CONFLICT = 'time_tracking_conflict',
  PERMISSION_DENIED = 'permission_denied',
  SYNC_CONFLICT = 'sync_conflict',
  OFFLINE_OPERATION = 'offline_operation',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
}

export interface TaskError extends Error {
  type: TaskErrorType;
  task_id?: string;
  details?: Record<string, any>;
  retry_count?: number;
}

// Offline support interfaces
export interface OfflineTaskOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  task_id?: string;
  data: Record<string, any>;
  timestamp: string;
  retry_count: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

export interface SyncStatus {
  is_online: boolean;
  pending_operations: number;
  last_sync: string | null;
  sync_in_progress: boolean;
  failed_operations: number;
}
