import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Edit3,
  Clock,
  Users,
  MessageSquare,
  Plus,
  Play,
  Pause,
  Square,
  CheckSquare,
  Trash2,
  MoreVertical,
  Calendar,
  Flag,
  Tag,
  Link,
  UserPlus,
  Activity,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useTasks,
  useUpdateTask,
  useDeleteTask,
  TaskRecord,
  useUpdateSubtask,
  useDeleteSubtask,
  useCreateSubtask,
} from '@/hooks/useTasks';
import { useSubtasks } from '@/hooks/useSubtasks';

import { useTaskDependencies } from '@/hooks/useTaskDependencies';
import { SubtaskCard } from '@/components/SubtaskCard';
import TimeTracker from '@/components/TimeTracker';
import TaskDependencyManager from '@/components/TaskDependencyManager';
import TaskComments from '@/components/TaskComments';
import TaskActivityTimeline from '@/components/TaskActivityTimeline';
import TaskAssignmentModal from '@/components/TaskAssignmentModal';
import TaskCollaborationIndicator from '@/components/TaskCollaborationIndicator';

export default function TaskDetailScreen() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [isEditing, setIsEditing] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showActivityTimeline, setShowActivityTimeline] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editedTask, setEditedTask] = useState<Partial<TaskRecord>>({});

  // Hooks
  const tasksQuery = useTasks();
  const updateTask = useUpdateTask();
  const updateSubtask = useUpdateSubtask();
  const createSubtask = useCreateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const deleteTask = useDeleteTask();
  const subtasksQuery = useSubtasks(taskId);
  const dependenciesQuery = useTaskDependencies(taskId);

  // Find the current task
  const task = useMemo(() => {
    return tasksQuery.data?.find((t) => t.id === taskId);
  }, [tasksQuery.data, taskId]);

  const subtasks = subtasksQuery.data ?? [];
  const dependenciesData = dependenciesQuery.data ?? {
    dependencies: [],
    dependents: [],
    prerequisiteTasks: [],
    dependentTasks: [],
  };
  const dependencies = dependenciesData.dependencies;

  // Calculate progress based on subtasks
  const progress = useMemo(() => {
    if (subtasks.length === 0) return task?.progress_percentage ?? 0;
    const completed = subtasks.filter((s) => s.status === 'completed').length;
    return Math.round((completed / subtasks.length) * 100);
  }, [subtasks, task?.progress_percentage]);

  // Handle task updates
  const handleUpdateTask = useCallback(
    (updates: Partial<TaskRecord>) => {
      if (!task) return;
      updateTask.mutate({ id: task.id, ...updates });
    },
    [task, updateTask]
  );

  // Handle task deletion
  const handleDeleteTask = useCallback(() => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTask.mutate(task.id);
            router.back();
          },
        },
      ]
    );
  }, [task, deleteTask]);

  // Handle subtask creation
  const handleCreateSubtask = useCallback(() => {
    if (!newSubtaskTitle.trim() || !task) return;

    // This would use the useSubtasks hook's create function
    createSubtask.mutate({
      parent_task_id: task.id,
      title: newSubtaskTitle.trim(),
      status: 'pending',
      priority: 'medium',
    });

    setNewSubtaskTitle('');
    setShowSubtaskForm(false);
  }, [newSubtaskTitle, task]);

  // Handle save edits
  const handleSaveEdits = useCallback(() => {
    if (!task) return;
    handleUpdateTask(editedTask);
    setIsEditing(false);
    setEditedTask({});
  }, [task, editedTask, handleUpdateTask]);

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#6B7280';
      default:
        return colors.textSecondary;
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'blocked':
        return '#EF4444';
      case 'pending':
        return '#6B7280';
      default:
        return colors.textSecondary;
    }
  };

  if (!task) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Task not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Task Details
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Edit3 size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDeleteTask}
          >
            <Trash2 size={20} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Header Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {isEditing ? (
            <TextInput
              style={[
                styles.titleInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={editedTask.title ?? task.title}
              onChangeText={(text) =>
                setEditedTask((prev) => ({ ...prev, title: text }))
              }
              placeholder="Task title"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
          ) : (
            <Text style={[styles.taskTitle, { color: colors.text }]}>
              {task.title}
            </Text>
          )}

          {(task.description || isEditing) && (
            <View style={styles.descriptionContainer}>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.descriptionInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={editedTask.description ?? task.description ?? ''}
                  onChangeText={(text) =>
                    setEditedTask((prev) => ({ ...prev, description: text }))
                  }
                  placeholder="Task description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text
                  style={[
                    styles.taskDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {task.description}
                </Text>
              )}
            </View>
          )}

          {/* Task Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Flag
                  size={16}
                  color={getPriorityColor(task.priority)}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.metadataLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Priority
                </Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {task.priority}
                </Text>
              </View>

              <View style={styles.metadataItem}>
                <CheckSquare
                  size={16}
                  color={getStatusColor(task.status)}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.metadataLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Status
                </Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {task.status}
                </Text>
              </View>
            </View>

            {task.due_date && (
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Calendar
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.metadataLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Due Date
                  </Text>
                  <Text style={[styles.metadataValue, { color: colors.text }]}>
                    {new Date(task.due_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            {task.tag && (
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Tag size={16} color={colors.textSecondary} strokeWidth={2} />
                  <Text
                    style={[
                      styles.metadataLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Tag
                  </Text>
                  <Text style={[styles.metadataValue, { color: colors.text }]}>
                    {task.tag}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {subtasks.length > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>
                  Progress
                </Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>
                  {progress}%
                </Text>
              </View>
              <View
                style={[styles.progressBar, { backgroundColor: colors.border }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${progress}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    task.status === 'completed'
                      ? colors.secondary
                      : colors.primary,
                },
              ]}
              onPress={() =>
                handleUpdateTask({
                  status: task.status === 'completed' ? 'pending' : 'completed',
                })
              }
            >
              {task.status === 'completed' ? (
                <Square size={16} color="white" strokeWidth={2} />
              ) : (
                <CheckSquare size={16} color="white" strokeWidth={2} />
              )}
              <Text style={styles.actionButtonText}>
                {task.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.success },
                ]}
                onPress={handleSaveEdits}
              >
                <Text style={styles.actionButtonText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time Tracking Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.text} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Time Tracking
            </Text>
          </View>

          <TimeTracker
            taskId={task.id}
            taskTitle={task.title}
            showHistory={true}
            compact={false}
          />
        </View>

        {/* Subtasks Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <CheckSquare size={20} color={colors.text} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Subtasks ({subtasks.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowSubtaskForm(true)}
            >
              <Plus size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {subtasks.map((subtask) => (
            <SubtaskCard
              key={subtask.id}
              subtask={subtask}
              onToggleComplete={() => {
                // Handle subtask completion
                const newStatus =
                  subtask.status === 'completed' ? 'pending' : 'completed';
                updateSubtask.mutate({ id: subtask.id, status: newStatus });
              }}
              onDelete={() => {
                // Handle subtask deletion
                deleteSubtask.mutate({
                  id: subtask.id,
                  parent_task_id: task.id,
                });
              }}
            />
          ))}

          {subtasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                No subtasks yet. Add one to break down this task.
              </Text>
            </View>
          )}
        </View>

        {/* Dependencies Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Link size={20} color={colors.text} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dependencies
            </Text>
          </View>

          <TaskDependencyManager taskId={task.id} taskTitle={task.title} />
        </View>

        {/* Collaboration Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.text} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Collaboration
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAssignmentModal(true)}
            >
              <UserPlus size={16} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <TaskCollaborationIndicator
            task={task}
            onPress={() => setShowActivityTimeline(true)}
          />

          <View style={styles.collaborationActions}>
            <TouchableOpacity
              style={[
                styles.collaborationButton,
                { backgroundColor: colors.primary + '20' },
              ]}
              onPress={() => setShowAssignmentModal(true)}
            >
              <UserPlus size={16} color={colors.primary} strokeWidth={2} />
              <Text
                style={[
                  styles.collaborationButtonText,
                  { color: colors.primary },
                ]}
              >
                Manage Assignments
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.collaborationButton,
                { backgroundColor: colors.secondary + '20' },
              ]}
              onPress={() => setShowActivityTimeline(true)}
            >
              <Activity size={16} color={colors.secondary} strokeWidth={2} />
              <Text
                style={[
                  styles.collaborationButtonText,
                  { color: colors.secondary },
                ]}
              >
                View Activity
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={20} color={colors.text} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Comments & Discussion
            </Text>
          </View>

          <TaskComments taskId={task.id} maxHeight={300} />
        </View>
      </ScrollView>

      {/* Subtask Creation Modal */}
      <Modal
        visible={showSubtaskForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSubtaskForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Subtask
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Subtask title"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowSubtaskForm(false);
                  setNewSubtaskTitle('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleCreateSubtask}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        visible={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        taskId={task.id}
        taskTitle={task.title}
      />

      {/* Activity Timeline Modal */}
      <Modal
        visible={showActivityTimeline}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowActivityTimeline(false)}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={[styles.header, { backgroundColor: colors.surface }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowActivityTimeline(false)}
              >
                <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Activity Timeline
              </Text>
            </View>
          </View>

          <TaskActivityTimeline taskId={task.id} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },

  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  addButton: {
    padding: 4,
  },

  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  descriptionInput: {
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  metadataContainer: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  timeEntriesContainer: {
    gap: 8,
  },
  timeEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeEntryDate: {
    fontSize: 14,
  },
  timeEntryDuration: {
    fontSize: 14,
    fontWeight: '600',
  },

  dependencyItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  dependencyText: {
    fontSize: 14,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  collaborationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  collaborationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  collaborationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
