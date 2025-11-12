import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useDependencyGraph, useReadyTasks } from '@/hooks/useTaskDependencies';
import DependencyGraph from '@/components/DependencyGraph';

export default function DependencyGraphScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'ready'>('graph');

  const {
    data: graphData,
    isLoading,
    refetch: refetchGraph,
  } = useDependencyGraph();

  const { data: readyTasks = [], refetch: refetchReady } = useReadyTasks();

  const { nodes = [], edges = [] } = graphData || {};

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchGraph(), refetchReady()]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNodePress = (nodeId: string) => {
    router.push(`/(tabs)/task-detail?taskId=${nodeId}`);
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/(tabs)/task-detail?taskId=${taskId}`);
  };

  const renderReadyTaskItem = (task: any) => (
    <TouchableOpacity
      key={task.id}
      style={[
        styles.readyTaskItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={() => handleTaskPress(task.id)}
    >
      <View style={styles.readyTaskContent}>
        <Text
          style={[styles.readyTaskTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        <View style={styles.readyTaskMeta}>
          <View style={styles.readyTaskBadge}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(task.priority) },
              ]}
            />
            <Text
              style={[
                styles.readyTaskBadgeText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {task.priority}
            </Text>
          </View>

          {task.due_date && (
            <View style={styles.readyTaskBadge}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.readyTaskBadgeText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {new Date(task.due_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    refreshButton: {
      padding: 8,
    },
    viewModeContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 2,
    },
    viewModeButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: 'center',
    },
    viewModeButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    viewModeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    viewModeButtonTextActive: {
      color: 'white',
    },
    content: {
      flex: 1,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.colors.surface,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    readyTasksContainer: {
      flex: 1,
      padding: 16,
    },
    readyTasksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
    },
    readyTasksTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    readyTasksSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    readyTaskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    readyTaskContent: {
      flex: 1,
      gap: 8,
    },
    readyTaskTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    readyTaskMeta: {
      flexDirection: 'row',
      gap: 12,
    },
    readyTaskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    readyTaskBadgeText: {
      fontSize: 12,
      textTransform: 'capitalize',
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    emptyStateIcon: {
      marginBottom: 8,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Task Dependencies</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons
              name={refreshing ? 'hourglass-outline' : 'refresh'}
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'graph' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('graph')}
          >
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === 'graph' && styles.viewModeButtonTextActive,
              ]}
            >
              Dependency Graph
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'ready' && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode('ready')}
          >
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === 'ready' && styles.viewModeButtonTextActive,
              ]}
            >
              Ready Tasks ({readyTasks.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{nodes.length}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{edges.length}</Text>
          <Text style={styles.statLabel}>Dependencies</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{readyTasks.length}</Text>
          <Text style={styles.statLabel}>Ready to Start</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {viewMode === 'graph' ? (
          <DependencyGraph onNodePress={handleNodePress} />
        ) : (
          <ScrollView
            style={styles.readyTasksContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            <View style={styles.readyTasksHeader}>
              <Ionicons
                name="play-circle"
                size={24}
                color={theme.colors.success}
              />
              <Text style={styles.readyTasksTitle}>Ready to Start</Text>
            </View>

            <Text style={styles.readyTasksSubtitle}>
              These tasks have no incomplete dependencies and can be started
              immediately.
            </Text>

            {readyTasks.length > 0 ? (
              readyTasks.map(renderReadyTaskItem)
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                  style={styles.emptyStateIcon}
                />
                <Text style={styles.emptyStateTitle}>No Ready Tasks</Text>
                <Text style={styles.emptyStateText}>
                  All pending tasks have incomplete dependencies. Complete
                  prerequisite tasks to unlock new ones.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
