import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import {
  useTaskSuggestions,
  useTaskPrioritization,
  useReschedulingSuggestions,
  useApplyTaskSuggestion,
  useDismissTaskSuggestion,
  TaskSuggestion,
  TaskPrioritization,
  ReschedulingSuggestion,
} from '@/hooks/useTaskSuggestions';

interface TaskSuggestionsProps {
  onRefresh?: () => void;
}

export default function TaskSuggestions({ onRefresh }: TaskSuggestionsProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<
    'suggestions' | 'priority' | 'reschedule'
  >('suggestions');

  const { data: suggestions = [], isLoading: suggestionsLoading } =
    useTaskSuggestions();
  const { data: prioritizations = [], isLoading: priorityLoading } =
    useTaskPrioritization();
  const { data: rescheduling = [], isLoading: rescheduleLoading } =
    useReschedulingSuggestions();

  const applySuggestion = useApplyTaskSuggestion();
  const dismissSuggestion = useDismissTaskSuggestion();

  const handleApplySuggestion = async (suggestion: TaskSuggestion) => {
    Alert.alert(
      'Apply Suggestion',
      `Do you want to apply this suggestion: "${suggestion.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await applySuggestion.mutateAsync({ suggestion });
              onRefresh?.();
              Alert.alert('Success', 'Suggestion applied successfully');
            } catch (error) {
              console.error('Error applying suggestion:', error);
              Alert.alert('Error', 'Failed to apply suggestion');
            }
          },
        },
      ]
    );
  };

  const handleApplyPrioritization = async (
    prioritization: TaskPrioritization
  ) => {
    Alert.alert(
      'Update Priority',
      `Change priority from ${prioritization.current_priority} to ${prioritization.suggested_priority}?\n\nReason: ${prioritization.reason}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const suggestion: TaskSuggestion = {
                id: `priority-${prioritization.task_id}`,
                type: 'priority',
                title: 'Update Task Priority',
                description: prioritization.reason,
                confidence: prioritization.confidence,
                task_id: prioritization.task_id,
                suggested_action: {
                  type: 'update_priority',
                  parameters: { priority: prioritization.suggested_priority },
                },
                created_at: new Date().toISOString(),
                is_applied: false,
              };

              await applySuggestion.mutateAsync({ suggestion });
              onRefresh?.();
              Alert.alert('Success', 'Task priority updated successfully');
            } catch (error) {
              console.error('Error updating priority:', error);
              Alert.alert('Error', 'Failed to update task priority');
            }
          },
        },
      ]
    );
  };

  const handleApplyRescheduling = async (
    rescheduling: ReschedulingSuggestion
  ) => {
    Alert.alert(
      'Reschedule Task',
      `Reschedule to ${new Date(
        rescheduling.suggested_due_date
      ).toLocaleDateString()}?\n\nReason: ${rescheduling.reason}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reschedule',
          onPress: async () => {
            try {
              const suggestion: TaskSuggestion = {
                id: `reschedule-${rescheduling.task_id}`,
                type: 'reschedule',
                title: 'Reschedule Task',
                description: rescheduling.reason,
                confidence: rescheduling.confidence,
                task_id: rescheduling.task_id,
                suggested_action: {
                  type: 'reschedule',
                  parameters: { due_date: rescheduling.suggested_due_date },
                },
                created_at: new Date().toISOString(),
                is_applied: false,
              };

              await applySuggestion.mutateAsync({ suggestion });
              onRefresh?.();
              Alert.alert('Success', 'Task rescheduled successfully');
            } catch (error) {
              console.error('Error rescheduling task:', error);
              Alert.alert('Error', 'Failed to reschedule task');
            }
          },
        },
      ]
    );
  };

  const handleDismiss = async (suggestionId: string) => {
    try {
      await dismissSuggestion.mutateAsync(suggestionId);
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const isLoading = suggestionsLoading || priorityLoading || rescheduleLoading;
  const hasAnySuggestions =
    suggestions.length > 0 ||
    prioritizations.length > 0 ||
    rescheduling.length > 0;

  if (!hasAnySuggestions && !isLoading) {
    return null;
  }

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
    suggestionCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    suggestionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    suggestionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      marginRight: 12,
    },
    confidenceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    confidenceText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    suggestionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    suggestionActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    actionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    primaryButtonText: {
      color: 'white',
    },
    secondaryButtonText: {
      color: theme.colors.text,
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
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    priorityFactors: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    factorChip: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    factorText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
  });

  const renderSuggestions = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons
            name="hourglass-outline"
            size={32}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.loadingText}>Loading suggestions...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'suggestions':
        if (suggestions.length === 0) {
          return (
            <View style={styles.emptyState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={32}
                color={theme.colors.success}
              />
              <Text style={styles.emptyStateText}>
                No suggestions available. Your task management looks great!
              </Text>
            </View>
          );
        }

        return suggestions.map((suggestion) => (
          <View key={suggestion.id} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <View style={styles.confidenceContainer}>
                <Ionicons
                  name="analytics-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.confidenceText}>
                  {Math.round(suggestion.confidence * 100)}%
                </Text>
              </View>
            </View>
            <Text style={styles.suggestionDescription}>
              {suggestion.description}
            </Text>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleDismiss(suggestion.id)}
              >
                <Ionicons name="close" size={16} color={theme.colors.text} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Dismiss
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => handleApplySuggestion(suggestion)}
                disabled={applySuggestion.isPending}
              >
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ));

      case 'priority':
        if (prioritizations.length === 0) {
          return (
            <View style={styles.emptyState}>
              <Ionicons
                name="flag-outline"
                size={32}
                color={theme.colors.success}
              />
              <Text style={styles.emptyStateText}>
                Task priorities look well balanced!
              </Text>
            </View>
          );
        }

        return prioritizations.map((prioritization) => (
          <View key={prioritization.task_id} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>
                Priority: {prioritization.current_priority} →{' '}
                {prioritization.suggested_priority}
              </Text>
              <View style={styles.confidenceContainer}>
                <Ionicons
                  name="analytics-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.confidenceText}>
                  {Math.round(prioritization.confidence * 100)}%
                </Text>
              </View>
            </View>
            <Text style={styles.suggestionDescription}>
              {prioritization.reason}
            </Text>
            <View style={styles.priorityFactors}>
              {Object.entries(prioritization.factors).map(([key, value]) => (
                <View key={key} style={styles.factorChip}>
                  <Text style={styles.factorText}>
                    {key.replace('_', ' ')}: {Math.round(value * 100)}%
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => handleApplyPrioritization(prioritization)}
                disabled={applySuggestion.isPending}
              >
                <Ionicons name="flag" size={16} color="white" />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Update Priority
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ));

      case 'reschedule':
        if (rescheduling.length === 0) {
          return (
            <View style={styles.emptyState}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={theme.colors.success}
              />
              <Text style={styles.emptyStateText}>
                No rescheduling needed. All tasks are on track!
              </Text>
            </View>
          );
        }

        return rescheduling.map((reschedule) => (
          <View key={reschedule.task_id} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>
                Reschedule to{' '}
                {new Date(reschedule.suggested_due_date).toLocaleDateString()}
              </Text>
              <View style={styles.confidenceContainer}>
                <Ionicons
                  name="analytics-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.confidenceText}>
                  {Math.round(reschedule.confidence * 100)}%
                </Text>
              </View>
            </View>
            <Text style={styles.suggestionDescription}>
              {reschedule.reason}
            </Text>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => handleApplyRescheduling(reschedule)}
                disabled={applySuggestion.isPending}
              >
                <Ionicons name="calendar" size={16} color="white" />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Reschedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ));

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="bulb"
          size={20}
          color={theme.colors.warning}
          style={styles.headerIcon}
        />
        <Text style={styles.headerTitle}>Smart Suggestions</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'suggestions' && styles.activeTabText,
            ]}
          >
            General ({suggestions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'priority' && styles.activeTab]}
          onPress={() => setActiveTab('priority')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'priority' && styles.activeTabText,
            ]}
          >
            Priority ({prioritizations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reschedule' && styles.activeTab]}
          onPress={() => setActiveTab('reschedule')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'reschedule' && styles.activeTabText,
            ]}
          >
            Schedule ({rescheduling.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderSuggestions()}
      </ScrollView>
    </View>
  );
}
