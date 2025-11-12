import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Filter,
  Settings,
  Search,
  Plus,
  MoreVertical,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { TaskBoard } from '@/components/TaskBoard';
import { TaskFilter } from '@/components/TaskFilter';
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal';
import { TaskSearchBar } from '@/components/tasks/TaskSearchBar';
import { useTasks, useUpdateTask, TaskRecord } from '@/hooks/useTasks';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import type {
  BoardColumn,
  BoardConfiguration,
  TaskFilters,
} from '@/types/task-management';

// Default board columns configuration
const DEFAULT_COLUMNS: BoardColumn[] = [
  {
    id: 'pending',
    title: 'To Do',
    status: 'pending',
    color: '#6B7280',
    order: 1,
    limit: undefined,
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    status: 'in_progress',
    color: '#3B82F6',
    order: 2,
    limit: 5, // WIP limit example
  },
  {
    id: 'blocked',
    title: 'Blocked',
    status: 'blocked',
    color: '#EF4444',
    order: 3,
    limit: undefined,
  },
  {
    id: 'completed',
    title: 'Completed',
    status: 'completed',
    color: '#10B981',
    order: 4,
    limit: undefined,
  },
];

export default function TaskBoardScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<string>('pending');
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);

  // Board configuration state
  const [boardConfig, setBoardConfig] = useState<BoardConfiguration>({
    columns: DEFAULT_COLUMNS,
    swimlanes: 'none',
    show_subtasks: true,
    show_dependencies: true,
    auto_move_completed: false,
  });

  // Filters state
  const [filters, setFilters] = useState<TaskFilters>({
    status: undefined,
    priority: undefined,
    client_id: undefined,
    search_query: '',
    has_subtasks: undefined,
    has_dependencies: undefined,
    is_overdue: undefined,
    assigned_to: undefined,
    due_date_range: undefined,
  });

  const tasksQuery = useTasks();
  const updateTask = useUpdateTask();
  const tasks = tasksQuery.data ?? [];

  const {
    guardTaskCreation,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  // Apply search query to filters
  const activeFilters = useMemo(
    () => ({
      ...filters,
      search_query: searchQuery,
    }),
    [filters, searchQuery]
  );

  // Handle task movement between columns
  const handleTaskMove = useCallback(
    (taskId: string, newStatus: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Auto-complete logic
      if (newStatus === 'completed' && boardConfig.auto_move_completed) {
        // Additional logic for auto-completion can be added here
      }

      updateTask.mutate({
        id: taskId,
        status: newStatus as any,
      });
    },
    [tasks, updateTask, boardConfig.auto_move_completed]
  );

  // Handle task creation from specific column
  const handleCreateTask = useCallback(
    (status: string) => {
      if (guardTaskCreation('')) {
        setCreateTaskStatus(status);
        setShowTaskForm(true);
      }
    },
    [guardTaskCreation]
  );

  // Handle task press for details
  const handleTaskPress = useCallback((task: TaskRecord) => {
    router.push(`/(tabs)/task-detail?taskId=${task.id}` as any);
  }, []);

  // Handle board configuration changes
  const handleConfigurationChange = useCallback(
    (newConfig: BoardConfiguration) => {
      setBoardConfig(newConfig);
    },
    []
  );

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
  }, []);

  // Board view preferences
  const handleViewPreferences = () => {
    Alert.alert(
      'View Preferences',
      'Configure board layout and display options',
      [
        {
          text: 'Toggle Subtasks',
          onPress: () =>
            setBoardConfig((prev) => ({
              ...prev,
              show_subtasks: !prev.show_subtasks,
            })),
        },
        {
          text: 'Toggle Dependencies',
          onPress: () =>
            setBoardConfig((prev) => ({
              ...prev,
              show_dependencies: !prev.show_dependencies,
            })),
        },
        {
          text: 'Auto-complete Tasks',
          onPress: () =>
            setBoardConfig((prev) => ({
              ...prev,
              auto_move_completed: !prev.auto_move_completed,
            })),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Task Board</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
            ]}
            onPress={() => setSearchQuery('')}
          >
            <Search size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
              showFilters && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter
              size={20}
              color={showFilters ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
            ]}
            onPress={handleViewPreferences}
          >
            <Settings size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={() => handleCreateTask('pending')}
          >
            <Plus size={20} color="white" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TaskSearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {/* Filters Panel */}
      {showFilters && <TaskFilter onClose={() => setShowFilters(false)} />}

      {/* Task Board */}
      <TaskBoard
        tasks={tasks}
        columns={boardConfig.columns}
        onTaskMove={handleTaskMove}
        onTaskPress={handleTaskPress}
        onCreateTask={handleCreateTask}
        filters={activeFilters}
        onFiltersChange={handleFiltersChange}
        configuration={boardConfig}
        onConfigurationChange={handleConfigurationChange}
        loading={tasksQuery.isLoading}
      />

      {/* Task Creation Modal */}
      <TaskCreateModal
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        initialStatus={createTaskStatus as any}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />

      {/* Task Detail Modal */}
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        onRequestClose={() => setSelectedTask(null)}
        transparent
      >
        <View style={styles.detailOverlay}>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.detailHeader}>
              <Text
                style={[styles.detailTitle, { color: colors.text }]}
                numberOfLines={2}
              >
                {selectedTask?.title}
              </Text>
              <TouchableOpacity
                style={styles.detailMoreButton}
                onPress={() => {
                  // Navigate to full task detail screen
                  setSelectedTask(null);
                  // router.push(`/tasks/${selectedTask?.id}`);
                }}
              >
                <MoreVertical
                  size={20}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            {selectedTask?.description && (
              <Text
                style={[
                  styles.detailDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {selectedTask.description}
              </Text>
            )}

            <View style={styles.detailInfo}>
              <View style={styles.detailInfoRow}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Status:
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.textSecondary }]}
                >
                  {selectedTask?.status}
                </Text>
              </View>

              <View style={styles.detailInfoRow}>
                <Text style={[styles.detailLabel, { color: colors.text }]}>
                  Priority:
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.textSecondary }]}
                >
                  {selectedTask?.priority}
                </Text>
              </View>

              {selectedTask?.due_date && (
                <View style={styles.detailInfoRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>
                    Due:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {new Date(selectedTask.due_date).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {selectedTask?.progress_percentage !== undefined && (
                <View style={styles.detailInfoRow}>
                  <Text style={[styles.detailLabel, { color: colors.text }]}>
                    Progress:
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {selectedTask.progress_percentage}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[
                  styles.detailButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  if (selectedTask) {
                    const newStatus =
                      selectedTask.status === 'completed'
                        ? 'pending'
                        : 'completed';
                    handleTaskMove(selectedTask.id, newStatus);
                    setSelectedTask(null);
                  }
                }}
              >
                <Text style={styles.detailButtonText}>
                  {selectedTask?.status === 'completed'
                    ? 'Mark Pending'
                    : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  detailCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  detailMoreButton: {
    padding: 4,
    marginRight: 8,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  detailInfo: {
    gap: 8,
    marginBottom: 20,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
