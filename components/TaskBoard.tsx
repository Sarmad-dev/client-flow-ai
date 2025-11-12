import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Plus, Filter, Settings } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { TaskCard } from './TaskCard';
import type { TaskRecord } from '@/hooks/useTasks';
import type {
  BoardColumn,
  BoardConfiguration,
  TaskFilters,
} from '@/types/task-management';

const { width: screenWidth } = Dimensions.get('window');

interface TaskBoardProps {
  tasks: TaskRecord[];
  columns: BoardColumn[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onTaskPress: (task: TaskRecord) => void;
  onCreateTask?: (status: string) => void;
  filters?: TaskFilters;
  onFiltersChange?: (filters: TaskFilters) => void;
  configuration?: BoardConfiguration;
  onConfigurationChange?: (config: BoardConfiguration) => void;
  loading?: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedTask: TaskRecord | null;
  draggedFromColumn: string | null;
  dragOverColumn: string | null;
}

export function TaskBoard({
  tasks,
  columns,
  onTaskMove,
  onTaskPress,
  onCreateTask,
  filters,
  onFiltersChange,
  configuration,
  onConfigurationChange,
  loading = false,
}: TaskBoardProps) {
  const { colors } = useTheme();
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTask: null,
    draggedFromColumn: null,
    dragOverColumn: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Default configuration
  const defaultConfig: BoardConfiguration = {
    columns: columns,
    swimlanes: 'none',
    show_subtasks: true,
    show_dependencies: true,
    auto_move_completed: false,
  };

  const config = configuration || defaultConfig;

  // Group tasks by status
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<string, TaskRecord[]> = {};

    columns.forEach((column) => {
      grouped[column.status] = [];
    });

    tasks.forEach((task) => {
      const status = task.status || 'pending';
      if (grouped[status]) {
        grouped[status].push(task);
      }
    });

    return grouped;
  }, [tasks, columns]);

  // Apply filters to tasks
  const filteredTasksByStatus = React.useMemo(() => {
    if (!filters) return tasksByStatus;

    const filtered: Record<string, TaskRecord[]> = {};

    Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
      filtered[status] = statusTasks.filter((task) => {
        // Status filter
        if (filters.status && !filters.status.includes(task.status as any)) {
          return false;
        }

        // Priority filter
        if (
          filters.priority &&
          !filters.priority.includes(task.priority as any)
        ) {
          return false;
        }

        // Client filter
        if (filters.client_id && filters.client_id.length > 0) {
          if (!task.client_id || !filters.client_id.includes(task.client_id)) {
            return false;
          }
        }

        // Search query
        if (filters.search_query) {
          const query = filters.search_query.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(query);
          const matchesDescription = task.description
            ?.toLowerCase()
            .includes(query);
          if (!matchesTitle && !matchesDescription) {
            return false;
          }
        }

        // Subtasks filter
        if (filters.has_subtasks !== undefined) {
          const hasSubtasks = task.subtasks && task.subtasks.length > 0;
          if (filters.has_subtasks !== hasSubtasks) {
            return false;
          }
        }

        // Dependencies filter
        if (filters.has_dependencies !== undefined) {
          const hasDependencies =
            task.dependencies && task.dependencies.length > 0;
          if (filters.has_dependencies !== hasDependencies) {
            return false;
          }
        }

        // Overdue filter
        if (filters.is_overdue !== undefined) {
          const isOverdue =
            task.due_date &&
            new Date(task.due_date) < new Date() &&
            task.status !== 'completed';
          if (filters.is_overdue !== !!isOverdue) {
            return false;
          }
        }

        return true;
      });
    });

    return filtered;
  }, [tasksByStatus, filters]);

  // Handle drag over column
  const handleDragOver = (columnStatus: string) => {
    if (dragState.isDragging) {
      setDragState((prev) => ({
        ...prev,
        dragOverColumn: columnStatus,
      }));
    }
  };

  // Handle drop
  const handleDrop = (targetColumnStatus: string) => {
    if (
      dragState.draggedTask &&
      dragState.draggedFromColumn !== targetColumnStatus
    ) {
      const targetColumn = columns.find(
        (col) => col.status === targetColumnStatus
      );

      // Check WIP limit
      if (targetColumn?.limit) {
        const currentTasksInColumn =
          filteredTasksByStatus[targetColumnStatus]?.length || 0;
        if (currentTasksInColumn >= targetColumn.limit) {
          Alert.alert(
            'WIP Limit Exceeded',
            `Column "${targetColumn.title}" has reached its limit of ${targetColumn.limit} tasks.`
          );
          setDragState({
            isDragging: false,
            draggedTask: null,
            draggedFromColumn: null,
            dragOverColumn: null,
          });
          return;
        }
      }

      onTaskMove(dragState.draggedTask.id, targetColumnStatus);
    }

    setDragState({
      isDragging: false,
      draggedTask: null,
      draggedFromColumn: null,
      dragOverColumn: null,
    });
  };

  // Calculate column width
  const columnWidth = Math.max(
    280,
    (screenWidth - 32) / Math.min(columns.length, 3)
  );

  // Render column header
  const renderColumnHeader = (column: BoardColumn, taskCount: number) => (
    <View style={[styles.columnHeader, { borderBottomColor: column.color }]}>
      <View style={styles.columnTitleContainer}>
        <View
          style={[styles.columnIndicator, { backgroundColor: column.color }]}
        />
        <Text style={[styles.columnTitle, { color: colors.text }]}>
          {column.title}
        </Text>
        <View style={[styles.taskCount, { backgroundColor: colors.border }]}>
          <Text style={[styles.taskCountText, { color: colors.textSecondary }]}>
            {taskCount}
          </Text>
        </View>
        {column.limit && (
          <Text style={[styles.wipLimit, { color: colors.textSecondary }]}>
            /{column.limit}
          </Text>
        )}
      </View>

      {onCreateTask && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onCreateTask(column.status)}
        >
          <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Render task in column
  const renderTask = (task: TaskRecord) => {
    const isDragged = dragState.draggedTask?.id === task.id;

    return (
      <View
        key={task.id}
        style={[styles.taskContainer, isDragged && styles.draggedTask]}
      >
        <TaskCard
          task={task}
          onToggleComplete={() => {
            const newStatus =
              task.status === 'completed' ? 'pending' : 'completed';
            onTaskMove(task.id, newStatus);
          }}
          onPress={() => onTaskPress(task)}
          showSubtasks={config.show_subtasks}
          showDependencies={config.show_dependencies}
          showTimeTracking={true}
          showCollaboration={true}
        />
      </View>
    );
  };

  // Render column
  const renderColumn = (column: BoardColumn) => {
    const columnTasks = filteredTasksByStatus[column.status] || [];
    const isDropTarget = dragState.dragOverColumn === column.status;
    const isWipLimitExceeded =
      column.limit && columnTasks.length >= column.limit;

    return (
      <View
        key={column.id}
        style={[
          styles.column,
          { width: columnWidth },
          isDropTarget ? styles.dropTarget : null,
          isWipLimitExceeded ? styles.wipExceeded : null,
        ]}
        onTouchStart={() => handleDragOver(column.status)}
        onTouchEnd={() => handleDrop(column.status)}
      >
        {renderColumnHeader(column, columnTasks.length)}

        <ScrollView
          style={styles.columnContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {columnTasks.map((task) => renderTask(task))}

          {columnTasks.length === 0 && (
            <View style={styles.emptyColumn}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tasks
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Task Board</Text>

        <View style={styles.headerActions}>
          {onFiltersChange && (
            <TouchableOpacity
              style={[
                styles.headerButton,
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
          )}

          {onConfigurationChange && (
            <TouchableOpacity
              style={[
                styles.headerButton,
                showConfig && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setShowConfig(!showConfig)}
            >
              <Settings
                size={20}
                color={showConfig ? colors.primary : colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Board Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.boardContainer}
        contentContainerStyle={styles.boardContent}
      >
        {columns
          .sort((a, b) => a.order - b.order)
          .map((column) => renderColumn(column))}
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading tasks...
          </Text>
        </View>
      )}

      {/* Drag Indicator */}
      {dragState.isDragging && (
        <View style={styles.dragIndicator}>
          <Text style={[styles.dragText, { color: colors.text }]}>
            Moving "{dragState.draggedTask?.title}"
          </Text>
        </View>
      )}
    </View>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },

  boardContainer: {
    flex: 1,
  },
  boardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },

  column: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    minHeight: 400,
  },
  dropTarget: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  wipExceeded: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },

  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  columnIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  wipLimit: {
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    padding: 4,
  },

  columnContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskContainer: {
    marginBottom: 8,
  },
  draggedTask: {
    opacity: 0.5,
  },

  emptyColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  dragIndicator: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  dragText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
