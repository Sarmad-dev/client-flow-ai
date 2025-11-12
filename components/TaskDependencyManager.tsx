import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import {
  useTaskDependencies,
  useCreateTaskDependency,
  useDeleteTaskDependency,
  useValidateTaskStart,
} from '@/hooks/useTaskDependencies';
import { useTasks } from '@/hooks/useTasks';
import type { TaskRecord } from '@/types/task-management';

interface TaskDependencyManagerProps {
  taskId: string;
  taskTitle: string;
}

export default function TaskDependencyManager({
  taskId,
  taskTitle,
}: TaskDependencyManagerProps) {
  const theme = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Hooks
  const { data: dependencyData, isLoading } = useTaskDependencies(taskId);
  const { data: allTasks = [] } = useTasks();
  const createDependency = useCreateTaskDependency();
  const deleteDependency = useDeleteTaskDependency();
  const validateTaskStart = useValidateTaskStart();

  const {
    dependencies = [],
    dependents = [],
    prerequisiteTasks = [],
    dependentTasks = [],
  } = dependencyData || {};

  // Filter available tasks for adding dependencies
  const availableTasks = allTasks.filter(
    (task) =>
      task.id !== taskId &&
      !prerequisiteTasks.some((prereq) => prereq.id === task.id) &&
      task.status !== 'completed' &&
      !task.parent_task_id
  );

  const filteredTasks = availableTasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDependency = async (dependsOnTaskId: string) => {
    try {
      await createDependency.mutateAsync({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
      });
      setShowAddModal(false);
      setSearchQuery('');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add dependency'
      );
    }
  };

  const handleRemoveDependency = (dependsOnTaskId: string) => {
    Alert.alert(
      'Remove Dependency',
      'Are you sure you want to remove this dependency?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDependency.mutateAsync({
                task_id: taskId,
                depends_on_task_id: dependsOnTaskId,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to remove dependency');
            }
          },
        },
      ]
    );
  };

  const handleValidateStart = async () => {
    try {
      const result = await validateTaskStart.mutateAsync(taskId);
      Alert.alert(
        'Task Validation',
        result.message,
        result.blockedBy.length > 0
          ? [
              { text: 'OK' },
              {
                text: 'View Blocking Tasks',
                onPress: () => {
                  const blockingTitles = result.blockedBy
                    .map((task) => `• ${task.title}`)
                    .join('\n');
                  Alert.alert('Blocking Tasks', blockingTitles);
                },
              },
            ]
          : [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to validate task');
    }
  };

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
        return theme.colors.textSecondary;
    }
  };

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
        return theme.colors.textSecondary;
    }
  };

  const styles = StyleSheet.create({
    container: {
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
    },
    actionButtonSecondary: {
      backgroundColor: theme.colors.secondary,
    },
    actionButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    dependencyItem: {
      borderRadius: 8,
      borderWidth: 1,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
    },
    dependencyContent: {
      gap: 8,
    },
    dependencyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    dependencyTitle: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      marginRight: 8,
      color: theme.colors.text,
    },
    removeButton: {
      padding: 2,
    },
    dependencyMeta: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    dependencyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dependencyBadgeText: {
      fontSize: 12,
      textTransform: 'capitalize',
      color: theme.colors.textSecondary,
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 16,
    },
    taskList: {
      maxHeight: 300,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8,
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
    },
    taskItemContent: {
      flex: 1,
      gap: 4,
    },
    taskItemTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    taskItemMeta: {
      flexDirection: 'row',
      gap: 8,
    },
    taskItemBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    taskItemBadgeText: {
      fontSize: 12,
      textTransform: 'capitalize',
      color: theme.colors.textSecondary,
    },
    noResultsText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontStyle: 'italic',
      paddingVertical: 20,
    },
  });

  const renderTaskItem = ({ item }: { item: TaskRecord }) => (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => handleAddDependency(item.id)}
    >
      <View style={styles.taskItemContent}>
        <Text style={styles.taskItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.taskItemMeta}>
          <View style={styles.taskItemBadge}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            />
            <Text style={styles.taskItemBadgeText}>{item.priority}</Text>
          </View>
          <View style={styles.taskItemBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            />
            <Text style={styles.taskItemBadgeText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <Ionicons
        name="add-circle-outline"
        size={24}
        color={theme.colors.primary}
      />
    </TouchableOpacity>
  );

  const renderDependencyItem = (
    task: TaskRecord,
    type: 'prerequisite' | 'dependent'
  ) => (
    <View key={task.id} style={styles.dependencyItem}>
      <View style={styles.dependencyContent}>
        <View style={styles.dependencyHeader}>
          <Text style={styles.dependencyTitle} numberOfLines={2}>
            {task.title}
          </Text>
          {type === 'prerequisite' && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveDependency(task.id)}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dependencyMeta}>
          <View style={styles.dependencyBadge}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(task.priority) },
              ]}
            />
            <Text style={styles.dependencyBadgeText}>{task.priority}</Text>
          </View>
          <View style={styles.dependencyBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(task.status) },
              ]}
            />
            <Text style={styles.dependencyBadgeText}>{task.status}</Text>
          </View>
          {task.due_date && (
            <View style={styles.dependencyBadge}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.dependencyBadgeText}>
                {new Date(task.due_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dependencies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Dependencies ({prerequisiteTasks.length + dependentTasks.length})
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={14} color="white" />
            <Text style={styles.actionButtonText}>Add</Text>
          </TouchableOpacity>

          {prerequisiteTasks.length > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={handleValidateStart}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={14}
                color="white"
              />
              <Text style={styles.actionButtonText}>Validate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Prerequisites Section */}
      {prerequisiteTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Prerequisites ({prerequisiteTasks.length})
          </Text>
          <Text style={[styles.emptyStateText, { marginBottom: 8 }]}>
            This task depends on the following tasks being completed first:
          </Text>
          {prerequisiteTasks.map((task) =>
            renderDependencyItem(task, 'prerequisite')
          )}
        </View>
      )}

      {/* Dependents Section */}
      {dependentTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Dependent Tasks ({dependentTasks.length})
          </Text>
          <Text style={[styles.emptyStateText, { marginBottom: 8 }]}>
            The following tasks depend on this task being completed:
          </Text>
          {dependentTasks.map((task) =>
            renderDependencyItem(task, 'dependent')
          )}
        </View>
      )}

      {/* Empty State */}
      {prerequisiteTasks.length === 0 && dependentTasks.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No dependencies yet. Add dependencies to create task relationships.
          </Text>
        </View>
      )}

      {/* Add Dependency Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Dependency</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks..."
              placeholderTextColor={theme.colors.textSecondary}
            />

            <FlatList
              data={filteredTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              style={styles.taskList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>
                  {searchQuery
                    ? 'No tasks found matching your search.'
                    : 'No available tasks to add as dependencies.'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
