import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { TaskCard } from '@/components/TaskCard';
import { TaskFilter } from '@/components/TaskFilter';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTasks,
  useToggleTaskStatus,
  useDeleteTask,
  TaskRecord,
} from '@/hooks/useTasks';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskSearchBar } from '@/components/tasks/TaskSearchBar';
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import TaskSuggestions from '@/components/TaskSuggestions';
import * as Notifications from 'expo-notifications';
import { Trash2 } from 'lucide-react-native';
import { CustomAlert } from '@/components/CustomAlert';

export default function TasksScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const tasksQuery = useTasks();
  const tasks = tasksQuery.data?.filter((task) => !task.parent_task_id) ?? [];
  const toggleTask = useToggleTaskStatus();
  const deleteTask = useDeleteTask();

  const {
    guardTaskCreation,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

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

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'completed'),
    [tasks]
  );

  useEffect(() => {
    const setup = async () => {
      await Notifications.requestPermissionsAsync();
      Notifications.setNotificationHandler({
        handleNotification: async () =>
          ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          } as any),
      } as any);
    };
    setup();
  }, []);

  useEffect(() => {
    const scheduleDueReminders = async () => {
      for (const t of tasks) {
        if (!t.due_date) continue;
        const due = new Date(t.due_date);
        if (isNaN(due.getTime())) continue;
        // Skip past due
        if (due.getTime() < Date.now()) continue;
        // Schedule a local notification at due date/time
        const secondsFromNow = Math.max(
          1,
          Math.floor((due.getTime() - Date.now()) / 1000)
        );
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task due',
            body:
              `${t.title} is due now` +
              (t.description ? `: ${t.description}` : ''),
            data: { taskId: t.id },
          },
          trigger: {
            seconds: secondsFromNow,
            repeats: false,
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          },
        });
      }
    };
    scheduleDueReminders();
  }, [tasks]);

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
    });
  };

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    showAlert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
      () => {
        deleteTask.mutate(taskId);
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
        hideAlert();
      }
    );
  };

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <TaskHeader
          onToggleFilter={() => setShowFilter((s) => !s)}
          onOpenForm={() => {
            if (guardTaskCreation('')) {
              setShowTaskForm(true);
            }
          }}
          onOpenBoard={() => router.push('/task-board')}
          onOpenAnalytics={() => router.push('/(tabs)/task-analytics')}
          onOpenAutomations={() => router.push('/(tabs)/task-automation')}
          onOpenDependencies={() => router.push('/(tabs)/dependency-graph')}
        />

        <TaskSearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {showFilter && <TaskFilter onClose={() => setShowFilter(false)} />}

        <TaskCreateModal
          visible={showTaskForm}
          onClose={() => setShowTaskForm(false)}
        />

        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          featureName={modalFeatureName}
        />

        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={hideAlert}
          onConfirm={alertConfig.onConfirm}
          confirmText="Delete"
          cancelText="Cancel"
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Task Suggestions */}
          {/* <TaskSuggestions onRefresh={() => tasksQuery.refetch()} /> */}

          {/* Active Tasks */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Active Tasks ({activeTasks.length})
            </Text>
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={() =>
                  toggleTask.mutate({ id: task.id, to: 'completed' })
                }
                onPress={() =>
                  router.push(`/(tabs)/task-detail?taskId=${task.id}`)
                }
                onDelete={() => handleDeleteTask(task.id, task.title)}
              />
            ))}
          </View>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Completed ({completedTasks.length})
              </Text>
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={() =>
                    toggleTask.mutate({ id: task.id, to: 'pending' })
                  }
                  onPress={() =>
                    router.push(`/(tabs)/task-detail?taskId=${task.id}`)
                  }
                  onDelete={() => handleDeleteTask(task.id, task.title)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
            {!!selectedTask?.description && (
              <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                {selectedTask.description}
              </Text>
            )}
            <View
              style={{ flexDirection: 'column', gap: 12, marginBottom: 12 }}
            >
              <Text style={{ color: colors.textSecondary }}>
                Status: {selectedTask?.status}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Priority: {selectedTask?.priority}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Due:{' '}
                {selectedTask?.due_date
                  ? new Date(selectedTask.due_date).toLocaleString()
                  : '-'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {selectedTask?.status !== 'completed' ? (
                <TouchableOpacity
                  onPress={() =>
                    selectedTask &&
                    toggleTask.mutate({ id: selectedTask.id, to: 'completed' })
                  }
                  style={[
                    styles.detailBtn,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    Mark Completed
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    selectedTask &&
                    toggleTask.mutate({ id: selectedTask.id, to: 'pending' })
                  }
                  style={[
                    styles.detailBtn,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    Mark Pending
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() =>
                  selectedTask &&
                  handleDeleteTask(selectedTask.id, selectedTask.title)
                }
                style={[styles.detailBtn, { backgroundColor: colors.error }]}
              >
                <Trash2 size={16} color="#fff" strokeWidth={2} />
                <Text
                  style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  detailCard: {
    width: '92%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailTitle: { fontSize: 20, fontWeight: '800', flex: 1, paddingRight: 12 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
