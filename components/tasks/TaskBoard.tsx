import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/useTheme';
import { DraggableTaskCard } from './DraggableTaskCard';
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

interface ColumnLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  status: string;
}

export function TaskBoard({
  tasks,
  columns,
  onTaskMove,
  onTaskPress,
  onCreateTask,
  filters,
  configuration,
  loading = false,
}: TaskBoardProps) {
  const { colors } = useTheme();
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTask: null,
    draggedFromColumn: null,
    dragOverColumn: null,
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const [columnLayouts, setColumnLayouts] = useState<ColumnLayout[]>([]);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Default configuration
  const defaultConfig: BoardConfiguration = {
    columns: columns,
    swimlanes: 'none',
    show_subtasks: true,
    show_dependencies: true,
    auto_move_completed: false,
  };

  const config = configuration || defaultConfig;

  // Group tasks by status (filter out subtasks)
  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<string, TaskRecord[]> = {};

    columns.forEach((column) => {
      grouped[column.status] = [];
    });

    // Only include parent tasks (filter out subtasks)
    const parentTasks = tasks.filter((task) => !task.parent_task_id);

    parentTasks.forEach((task) => {
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

  // Handle drag start
  const handleDragStart = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setDragState({
          isDragging: true,
          draggedTask: task,
          draggedFromColumn: task.status,
          dragOverColumn: null,
        });
      }
    },
    [tasks]
  );

  // Handle drag move for auto-scrolling
  const handleDragMove = useCallback(
    (taskId: string, x: number, y: number) => {
      const edgeThreshold = 120;
      const maxScrollSpeed = 25;
      const minScrollSpeed = 8;

      // Clear any existing scroll interval
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }

      // Calculate dynamic scroll speed based on distance from edge
      let scrollSpeed = 0;
      let direction = 0;

      // Check if near left edge
      if (x < edgeThreshold) {
        const distanceFromEdge = edgeThreshold - x;
        const speedRatio = Math.min(distanceFromEdge / edgeThreshold, 1);
        scrollSpeed =
          minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedRatio;
        direction = -1;
      }
      // Check if near right edge
      else if (x > screenWidth - edgeThreshold) {
        const distanceFromEdge = x - (screenWidth - edgeThreshold);
        const speedRatio = Math.min(distanceFromEdge / edgeThreshold, 1);
        scrollSpeed =
          minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedRatio;
        direction = 1;
      }

      // Start scrolling if near an edge
      if (direction !== 0) {
        scrollIntervalRef.current = setInterval(() => {
          const newOffset =
            direction === -1
              ? Math.max(0, scrollOffset - scrollSpeed)
              : scrollOffset + scrollSpeed;

          scrollViewRef.current?.scrollTo({
            x: newOffset,
            animated: false,
          });
          setScrollOffset(newOffset);
        }, 16) as any;
      }
    },
    [scrollOffset]
  );

  // Handle drag end with position
  const handleDragEnd = useCallback(
    (taskId: string, x: number, y: number) => {
      // Clear auto-scroll interval
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }

      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        setDragState({
          isDragging: false,
          draggedTask: null,
          draggedFromColumn: null,
          dragOverColumn: null,
        });
        return;
      }

      // Adjust x position based on scroll offset
      const adjustedX = x + scrollOffset;

      console.log('Drop position:', { x, y, adjustedX, scrollOffset });
      console.log('Column layouts:', columnLayouts);

      // Find which column the task was dropped in
      const targetColumn = columnLayouts.find(
        (layout) =>
          adjustedX >= layout.x &&
          adjustedX <= layout.x + layout.width &&
          y >= layout.y &&
          y <= layout.y + layout.height
      );

      console.log('Target column found:', targetColumn);

      if (targetColumn && targetColumn.status !== task.status) {
        const column = columns.find(
          (col) => col.status === targetColumn.status
        );

        console.log(
          'Moving to column:',
          column?.title,
          'status:',
          targetColumn.status
        );

        // Check WIP limit
        if (column?.limit) {
          const currentTasksInColumn =
            filteredTasksByStatus[targetColumn.status]?.length || 0;
          if (currentTasksInColumn >= column.limit) {
            Alert.alert(
              'WIP Limit Exceeded',
              `Column "${column.title}" has reached its limit of ${column.limit} tasks.`
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

        onTaskMove(taskId, targetColumn.status);
      } else {
        console.log('No target column or same status');
      }

      setDragState({
        isDragging: false,
        draggedTask: null,
        draggedFromColumn: null,
        dragOverColumn: null,
      });
    },
    [
      tasks,
      columnLayouts,
      columns,
      filteredTasksByStatus,
      onTaskMove,
      scrollOffset,
    ]
  );

  // Handle column layout measurement using measureInWindow for absolute positions
  const handleColumnLayout = useCallback((status: string, ref: any) => {
    if (ref) {
      ref.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setColumnLayouts((prev) => {
            const existing = prev.findIndex(
              (layout) => layout.status === status
            );
            const newLayout = { x, y, width, height, status };

            console.log('Column layout measured:', status, {
              x,
              y,
              width,
              height,
            });

            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = newLayout;
              return updated;
            }
            return [...prev, newLayout];
          });
        }
      );
    }
  }, []);

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
    return (
      <DraggableTaskCard
        key={task.id}
        task={task}
        onToggleComplete={() => {
          const newStatus =
            task.status === 'completed' ? 'pending' : 'completed';
          onTaskMove(task.id, newStatus);
        }}
        onPress={() => onTaskPress(task)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        showSubtasks={config.show_subtasks}
        showDependencies={config.show_dependencies}
      />
    );
  };

  // Render column
  const renderColumn = (column: BoardColumn) => {
    const columnTasks = filteredTasksByStatus[column.status] || [];
    const isDropTarget =
      dragState.isDragging && dragState.draggedFromColumn !== column.status;
    const isWipLimitExceeded =
      column.limit && columnTasks.length >= column.limit;
    const columnRef = useRef<View>(null);

    return (
      <View
        key={column.id}
        ref={columnRef}
        style={[
          styles.column,
          { width: columnWidth },
          isDropTarget ? styles.dropTarget : null,
          isWipLimitExceeded ? styles.wipExceeded : null,
        ]}
        onLayout={() => {
          handleColumnLayout(column.status, columnRef.current);
        }}
      >
        {renderColumnHeader(column, columnTasks.length)}

        <ScrollView
          style={styles.columnContent}
          contentContainerStyle={styles.columnContentContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          scrollEnabled={!dragState.isDragging}
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Board Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.boardContainer}
          contentContainerStyle={styles.boardContent}
          scrollEnabled={!dragState.isDragging}
          onScroll={(event) => {
            setScrollOffset(event.nativeEvent.contentOffset.x);
          }}
          scrollEventThrottle={16}
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
          <View
            style={[styles.dragIndicator, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.dragText, { color: colors.text }]}>
              Drag to move "{dragState.draggedTask?.title}"
            </Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
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
    height: '100%',
    maxHeight: '100%',
  },
  dropTarget: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 2,
    borderColor: '#10B981',
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
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  columnContentContainer: {
    flexGrow: 1,
    paddingBottom: 16,
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
    top: 80,
    left: 16,
    right: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
