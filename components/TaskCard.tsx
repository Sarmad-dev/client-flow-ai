import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  CircleCheck as CheckCircle2,
  Circle,
  Calendar,
  User,
  MoveVertical as MoreVertical,
  TriangleAlert as AlertTriangle,
  Trash2,
  Clock,
  Play,
  Pause,
  Users,
  Link,
  MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useTimerDisplay,
  useStartTimer,
  useStopTimer,
} from '@/hooks/useTimeTracking';
import { useSubtaskProgress } from '@/hooks/useSubtasks';
import TaskCollaborationStatus from '@/components/TaskCollaborationStatus';

interface TaskLike {
  id: string;
  title: string;
  tag: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  // Legacy props
  client?: string;
  dueDate?: string;
  completed?: boolean;
  // DB props
  client_id?: string | null;
  due_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  description?: string | null;
  clients?: { name?: string | null; company?: string | null } | null;

  // Enhanced task management fields
  parent_task_id?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number;
  progress_percentage?: number;

  // Computed/joined fields for enhanced features
  subtasks?: any[];
  dependencies?: any[];
  time_entries?: any[];
  comments?: any[];
  assignments?: any[];
}

interface TaskCardProps {
  task: TaskLike;
  onToggleComplete: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  showSubtasks?: boolean;
  showTimeTracking?: boolean;
  showProgress?: boolean;
  showDependencies?: boolean;
  showCollaboration?: boolean;
  onStartTimer?: () => void;
}

export function TaskCard({
  task,
  onToggleComplete,
  onPress,
  onDelete,
  showSubtasks = true,
  showTimeTracking = true,
  showProgress = true,
  showDependencies = true,
  showCollaboration = true,
  onStartTimer,
}: TaskCardProps) {
  const { colors } = useTheme();
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Time tracking hooks
  const { activeTimer, isRunning } = useTimerDisplay();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  // Subtask progress hook
  const subtaskProgress = useSubtaskProgress(task.id);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'follow-up':
        return colors.primary;
      case 'proposal':
        return colors.secondary;
      case 'call':
        return colors.accent;
      case 'meeting':
        return '#8B5CF6';
      default:
        return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#DC2626'; // Red-600
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            setShowDeleteMenu(false);
          },
        },
      ]
    );
  };

  const handleTimerToggle = async () => {
    try {
      if (isRunning && activeTimer?.task_id === task.id) {
        await stopTimer.mutateAsync({});
      } else if (!isRunning) {
        if (onStartTimer) {
          onStartTimer();
        } else {
          await startTimer.mutateAsync(task.id);
        }
      }
    } catch (error) {
      Alert.alert(
        'Timer Error',
        error instanceof Error ? error.message : 'Failed to toggle timer'
      );
    }
  };

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${Math.round(hours * 10) / 10}h`;
  };

  const clientLabel =
    task.client ?? task.clients?.name ?? task.clients?.company ?? '';
  const due = task.dueDate ?? task.due_date ?? undefined;
  const isCompleted =
    typeof task.completed === 'boolean'
      ? task.completed
      : task.status === 'completed';
  const dueDateObj = due ? new Date(due) : null;
  const isOverdue = !!dueDateObj && dueDateObj < new Date() && !isCompleted;

  // Enhanced computed values
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const hasDependencies = task.dependencies && task.dependencies.length > 0;
  const hasComments = task.comments && task.comments.length > 0;
  const hasAssignments = task.assignments && task.assignments.length > 0;
  const isTimerActive = isRunning && activeTimer?.task_id === task.id;

  // Progress calculation
  const progressPercentage = hasSubtasks
    ? subtaskProgress.percentage
    : task.progress_percentage || 0;

  // Time tracking display
  const actualHours = task.actual_hours || 0;
  const estimatedHours = task.estimated_hours;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        isCompleted && styles.completedCard,
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onToggleComplete} style={styles.checkButton}>
          {isCompleted ? (
            <CheckCircle2 size={24} color={colors.success} strokeWidth={2} />
          ) : (
            <Circle size={24} color={colors.textSecondary} strokeWidth={2} />
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
              isCompleted && styles.completedText,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <User size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {clientLabel}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <Calendar
                size={14}
                color={isOverdue ? colors.error : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.metadataText,
                  { color: isOverdue ? colors.error : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {dueDateObj ? new Date(dueDateObj).toLocaleDateString() : '-'}
              </Text>
              {isOverdue && (
                <AlertTriangle size={14} color={colors.error} strokeWidth={2} />
              )}
            </View>
          </View>

          {!!task.description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          {/* Progress Bar for tasks with subtasks */}
          {showProgress && hasSubtasks && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text
                  style={[styles.progressText, { color: colors.textSecondary }]}
                >
                  Progress: {subtaskProgress.completed}/{subtaskProgress.total}{' '}
                  subtasks
                </Text>
                <Text
                  style={[styles.progressPercentage, { color: colors.text }]}
                >
                  {progressPercentage}%
                </Text>
              </View>
              <View
                style={[styles.progressBar, { backgroundColor: colors.border }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${progressPercentage}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Time Tracking Display */}
          {showTimeTracking && (actualHours > 0 || estimatedHours) && (
            <View style={styles.timeContainer}>
              <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {actualHours > 0 && `${formatTime(actualHours)} tracked`}
                {actualHours > 0 && estimatedHours && ' / '}
                {estimatedHours && `${formatTime(estimatedHours)} estimated`}
              </Text>
              {isTimerActive && (
                <View
                  style={[
                    styles.timerIndicator,
                    { backgroundColor: colors.success },
                  ]}
                />
              )}
            </View>
          )}

          {/* Indicators Row */}
          <View style={styles.indicatorsRow}>
            {/* Dependency Indicator */}
            {showDependencies && hasDependencies && (
              <View style={styles.indicator}>
                <Link size={14} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.indicatorText, { color: colors.warning }]}>
                  {task.dependencies!.length} dep
                </Text>
              </View>
            )}

            {/* Collaboration Indicators */}
            {showCollaboration && hasAssignments && (
              <View style={styles.indicator}>
                <Users size={14} color={colors.secondary} strokeWidth={2} />
                <Text
                  style={[styles.indicatorText, { color: colors.secondary }]}
                >
                  {task.assignments!.length}
                </Text>
              </View>
            )}

            {showCollaboration && hasComments && (
              <View style={styles.indicator}>
                <MessageCircle
                  size={14}
                  color={colors.secondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.indicatorText, { color: colors.secondary }]}
                >
                  {task.comments!.length}
                </Text>
              </View>
            )}
          </View>

          {/* Real-time Collaboration Status */}
          {showCollaboration && (hasAssignments || hasComments) && (
            <TaskCollaborationStatus taskId={task.id} compact={true} />
          )}

          <View style={styles.tags}>
            <View
              style={[
                styles.tag,
                { backgroundColor: `${getTagColor(task.tag)}15` },
              ]}
            >
              <Text style={[styles.tagText, { color: getTagColor(task.tag) }]}>
                {task.tag}
              </Text>
            </View>
            <View
              style={[
                styles.priorityTag,
                { backgroundColor: `${getPriorityColor(task.priority)}15` },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: getPriorityColor(task.priority) },
                ]}
              >
                {task.priority}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {/* Time Tracking Button */}
          {showTimeTracking && !isCompleted && (
            <TouchableOpacity
              style={[
                styles.timerButton,
                isTimerActive && { backgroundColor: `${colors.success}15` },
              ]}
              onPress={handleTimerToggle}
            >
              {isTimerActive ? (
                <Pause size={16} color={colors.success} strokeWidth={2} />
              ) : (
                <Play size={16} color={colors.textSecondary} strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}

          {/* More Actions Button */}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setShowQuickActions(!showQuickActions)}
          >
            <MoreVertical
              size={20}
              color={colors.textSecondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions Menu */}
      {showQuickActions && (
        <>
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setShowQuickActions(false)}
          />
          <View
            style={[
              styles.quickActionsMenu,
              { backgroundColor: colors.surface },
            ]}
          >
            {showTimeTracking && !isCompleted && (
              <TouchableOpacity
                style={[styles.menuButton, { borderColor: colors.border }]}
                onPress={() => {
                  handleTimerToggle();
                  setShowQuickActions(false);
                }}
              >
                {isTimerActive ? (
                  <Pause size={16} color={colors.success} strokeWidth={2} />
                ) : (
                  <Play
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                )}
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {isTimerActive ? 'Stop Timer' : 'Start Timer'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuButton, { borderColor: colors.border }]}
              onPress={() => {
                onPress?.();
                setShowQuickActions(false);
              }}
            >
              <User size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                View Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, { borderColor: colors.border }]}
              onPress={() => {
                handleDeletePress();
                setShowQuickActions(false);
              }}
            >
              <Trash2 size={16} color={colors.error} strokeWidth={2} />
              <Text style={[styles.menuText, { color: colors.error }]}>
                Delete Task
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },

  completedCard: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  checkButton: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metadata: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 10,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
    flex: 1,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Enhanced features styles
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },

  indicatorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '500',
  },

  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerButton: {
    padding: 6,
    borderRadius: 6,
  },
  moreButton: {
    padding: 4,
  },

  quickActionsMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 160,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 40,
    marginBottom: 4,
  },
  menuText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});
