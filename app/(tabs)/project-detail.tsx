import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Edit3,
  Plus,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  Flag,
  Folder,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useTasksByProject } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal';
import { useToggleTaskStatus, useDeleteTask } from '@/hooks/useTasks';
import { CustomAlert } from '@/components/CustomAlert';

export default function ProjectDetailScreen() {
  const { colors } = useTheme();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Hooks
  const { data: project, isLoading: projectLoading } = useProject(projectId!);
  const { data: tasks = [], isLoading: tasksLoading } = useTasksByProject(
    projectId!
  );
  const updateProject = useUpdateProject();
  const toggleTaskStatus = useToggleTaskStatus();
  const deleteTask = useDeleteTask();

  const handleBack = () => {
    router.back();
  };

  const handleEditProject = () => {
    // Navigate to project edit screen or show edit modal
    // For now, show an alert - you can implement the edit modal later
    Alert.alert(
      'Edit Project',
      'Project editing functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    try {
      // Find the current task to determine next status
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await toggleTaskStatus.mutateAsync({
        id: taskId,
        to: nextStatus,
      });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to update task status. Please try again.',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to delete task. Please try again.',
      });
    }
  };

  const handleUpdateProjectStatus = async (status: string) => {
    if (!project) return;

    try {
      await updateProject.mutateAsync({
        id: project.id,
        status: status as any,
      });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to update project status. Please try again.',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return colors.warning;
      case 'active':
        return colors.primary;
      case 'on_hold':
        return colors.textSecondary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#DC2626';
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const completedTasks = tasks.filter(
    (task) => task.status === 'completed'
  ).length;
  const totalTasks = tasks.length;
  const progressPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (projectLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading project...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Project not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBack}
          >
            <Text style={[styles.backButtonText, { color: colors.surface }]}>
              Go Back
            </Text>
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
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {project.name}
          </Text>
          <View style={styles.headerMeta}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(project.status)}15` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(project.status) },
                ]}
              >
                {project.status.replace('_', ' ')}
              </Text>
            </View>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: `${getPriorityColor(project.priority)}15` },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  { color: getPriorityColor(project.priority) },
                ]}
              >
                {project.priority}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleEditProject}
          style={styles.headerButton}
        >
          <Edit3 size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Overview */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Overview
          </Text>

          {project.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {project.description}
            </Text>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Target size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Progress
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {progressPercentage}%
              </Text>
            </View>

            <View style={styles.statItem}>
              <CheckCircle size={20} color={colors.success} strokeWidth={2} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Tasks
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {completedTasks}/{totalTasks}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Clock size={20} color={colors.warning} strokeWidth={2} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Hours
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {project.actual_hours || 0}
                {project.estimated_hours && `/${project.estimated_hours}`}
              </Text>
            </View>

            <View style={styles.statItem}>
              <DollarSign size={20} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Budget
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(project.budget)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
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
        </View>

        {/* Project Details */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Details
          </Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Calendar
                size={16}
                color={colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Start Date
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(project.start_date)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Flag size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Due Date
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(project.due_date)}
              </Text>
            </View>

            {project.client && (
              <View style={styles.detailItem}>
                <Users size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  Client
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {project.client.name || project.client.company}
                </Text>
              </View>
            )}

            {project.lead && (
              <View style={styles.detailItem}>
                <Users size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  Lead
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {project.lead.name || project.lead.company}
                </Text>
              </View>
            )}
          </View>

          {project.tags && project.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={[styles.tagsLabel, { color: colors.textSecondary }]}>
                Tags
              </Text>
              <View style={styles.tags}>
                {project.tags.map((tag, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {project.notes && (
            <View style={styles.notesContainer}>
              <Text
                style={[styles.notesLabel, { color: colors.textSecondary }]}
              >
                Notes
              </Text>
              <Text style={[styles.notesText, { color: colors.text }]}>
                {project.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Tasks Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Tasks ({tasks.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowTaskForm(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Plus size={20} color={colors.surface} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {tasksLoading ? (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading tasks...
            </Text>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Folder size={48} color={colors.textSecondary} strokeWidth={1} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No tasks yet
              </Text>
              <Text
                style={[styles.emptyMessage, { color: colors.textSecondary }]}
              >
                Create your first task to get started
              </Text>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={() => handleToggleTaskStatus(task.id)}
                  onPress={() =>
                    router.push(`/(tabs)/task-detail?taskId=${task.id}`)
                  }
                  onDelete={() => handleDeleteTask(task.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Task Create Modal */}
      <TaskCreateModal
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        initialProjectId={projectId}
        onCreated={() => setShowTaskForm(false)}
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Content
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Overview Section
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 8,
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

  // Details Section
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 2,
  },

  // Tags
  tagsContainer: {
    marginTop: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Notes
  notesContainer: {
    marginTop: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Tasks Section
  tasksList: {
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
