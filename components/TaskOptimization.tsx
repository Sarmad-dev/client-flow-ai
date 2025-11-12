import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import {
  useTaskPatternAnalysis,
  useOptimalTaskOrdering,
  useApplyTaskSuggestion,
  TaskSuggestion,
} from '@/hooks/useTaskSuggestions';
import { useTasks } from '@/hooks/useTasks';

interface TaskOptimizationProps {
  onRefresh?: () => void;
}

export default function TaskOptimization({ onRefresh }: TaskOptimizationProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'patterns' | 'ordering'>(
    'patterns'
  );

  const { data: patterns, isLoading: patternsLoading } =
    useTaskPatternAnalysis();
  const { data: optimalOrder = [], isLoading: orderLoading } =
    useOptimalTaskOrdering();
  const { data: tasks = [] } = useTasks();
  const applySuggestion = useApplyTaskSuggestion();

  const handleApplyOptimalOrder = async () => {
    Alert.alert(
      'Apply Optimal Task Order',
      'This will reorder your tasks based on dependencies, priorities, and due dates. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              // Create a suggestion for reordering tasks
              const suggestion: TaskSuggestion = {
                id: 'optimal-order',
                type: 'dependency',
                title: 'Optimize Task Order',
                description:
                  'Reorder tasks for optimal productivity based on dependencies and priorities',
                confidence: 0.9,
                suggested_action: {
                  type: 'reorder_tasks',
                  parameters: { task_order: optimalOrder },
                },
                created_at: new Date().toISOString(),
                is_applied: false,
              };

              await applySuggestion.mutateAsync({ suggestion });
              onRefresh?.();
              Alert.alert(
                'Success',
                'Tasks reordered for optimal productivity'
              );
            } catch (error) {
              console.error('Error applying optimal order:', error);
              Alert.alert('Error', 'Failed to reorder tasks');
            }
          },
        },
      ]
    );
  };

  const isLoading = patternsLoading || orderLoading;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      margin: 16,
      padding: 16,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerIcon: {
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: 'white',
    },
    patternCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.success,
    },
    patternTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    patternDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    patternMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metricChip: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    metricText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    orderingCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    orderingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    applyButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    applyButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    taskOrderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 6,
      marginBottom: 4,
    },
    orderNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    orderNumberText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
    taskTitle: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    taskPriority: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons
            name="analytics-outline"
            size={32}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.loadingText}>Analyzing task patterns...</Text>
        </View>
      </View>
    );
  }

  const renderPatterns = () => {
    if (!patterns || Object.keys(patterns).length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons
            name="analytics-outline"
            size={32}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyStateText}>
            Not enough data to analyze patterns. Complete more tasks to see
            insights.
          </Text>
        </View>
      );
    }

    return Object.entries(patterns).map(([key, pattern]: [string, any]) => (
      <View key={key} style={styles.patternCard}>
        <Text style={styles.patternTitle}>{pattern.title || key}</Text>
        <Text style={styles.patternDescription}>
          {pattern.description || 'Pattern analysis result'}
        </Text>
        {pattern.metrics && (
          <View style={styles.patternMetrics}>
            {Object.entries(pattern.metrics).map(
              ([metricKey, value]: [string, any]) => (
                <View key={metricKey} style={styles.metricChip}>
                  <Text style={styles.metricText}>
                    {metricKey}:{' '}
                    {typeof value === 'number'
                      ? Math.round(value * 100) / 100
                      : value}
                  </Text>
                </View>
              )
            )}
          </View>
        )}
      </View>
    ));
  };

  const renderOptimalOrdering = () => {
    if (optimalOrder.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons
            name="list-outline"
            size={32}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyStateText}>
            No active tasks to optimize. Create some tasks to see optimal
            ordering.
          </Text>
        </View>
      );
    }

    const orderedTasks = optimalOrder
      .map((taskId) => tasks.find((t) => t.id === taskId))
      .filter(Boolean)
      .slice(0, 10); // Show top 10 for better UX

    return (
      <View style={styles.orderingCard}>
        <View style={styles.orderingHeader}>
          <Text style={styles.orderingTitle}>Optimal Task Order</Text>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyOptimalOrder}
            disabled={applySuggestion.isPending}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {orderedTasks.map(
          (task, index) =>
            task && (
              <View key={task.id} style={styles.taskOrderItem}>
                <View style={styles.orderNumber}>
                  <Text style={styles.orderNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.taskPriority}>{task.priority}</Text>
              </View>
            )
        )}

        {optimalOrder.length > 10 && (
          <Text style={[styles.emptyStateText, { marginTop: 8 }]}>
            +{optimalOrder.length - 10} more tasks
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="analytics"
          size={20}
          color={theme.colors.primary}
          style={styles.headerIcon}
        />
        <Text style={styles.headerTitle}>Task Optimization</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'patterns' && styles.activeTab]}
          onPress={() => setActiveTab('patterns')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'patterns' && styles.activeTabText,
            ]}
          >
            Patterns
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ordering' && styles.activeTab]}
          onPress={() => setActiveTab('ordering')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'ordering' && styles.activeTabText,
            ]}
          >
            Optimal Order
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'patterns' ? renderPatterns() : renderOptimalOrdering()}
      </ScrollView>
    </View>
  );
}
