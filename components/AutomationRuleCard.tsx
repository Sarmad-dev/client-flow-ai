import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { AutomationRuleWithMetadata } from '@/hooks/useTaskAutomation';
import {
  useToggleAutomationRule,
  useDeleteAutomationRule,
} from '@/hooks/useTaskAutomation';

interface AutomationRuleCardProps {
  rule: AutomationRuleWithMetadata;
  onPress?: () => void;
  onEdit?: () => void;
}

export default function AutomationRuleCard({
  rule,
  onPress,
  onEdit,
}: AutomationRuleCardProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const toggleRule = useToggleAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const handleToggle = async () => {
    try {
      await toggleRule.mutateAsync({
        id: rule.id,
        is_active: !rule.is_active,
      });
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['automation', 'rules'] });
    } catch (error) {
      console.error('Error toggling automation rule:', error);
      Alert.alert('Error', 'Failed to toggle automation rule');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Automation Rule',
      `Are you sure you want to delete "${rule.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRule.mutateAsync(rule.id);
            } catch (error) {
              console.error('Error deleting automation rule:', error);
              Alert.alert('Error', 'Failed to delete automation rule');
            }
          },
        },
      ]
    );
  };

  const getTriggerDisplayName = (trigger: string) => {
    switch (trigger) {
      case 'task_completed':
        return 'Task Completed';
      case 'task_overdue':
        return 'Task Overdue';
      case 'status_changed':
        return 'Status Changed';
      case 'time_tracked':
        return 'Time Tracked';
      case 'due_date_approaching':
        return 'Due Date Approaching';
      default:
        return trigger;
    }
  };

  const getActionSummary = (actions: any[]) => {
    if (actions.length === 0) return 'No actions';
    if (actions.length === 1) {
      const action = actions[0];
      switch (action.type) {
        case 'create_task':
          return 'Create task';
        case 'update_status':
          return 'Update status';
        case 'update_priority':
          return 'Update priority';
        case 'send_notification':
          return 'Send notification';
        case 'assign_user':
          return 'Assign user';
        case 'create_follow_up':
          return 'Create follow-up';
        case 'reschedule':
          return 'Reschedule';
        case 'add_dependency':
          return 'Add dependency';
        case 'create_subtasks':
          return 'Create subtasks';
        default:
          return action.type;
      }
    }
    return `${actions.length} actions`;
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: rule.is_active
        ? theme.colors.primary + '20'
        : theme.colors.border,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleContainer: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
    },
    triggerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    triggerIcon: {
      marginRight: 8,
    },
    triggerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    actionText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: 8,
      marginLeft: 4,
    },
    disabledOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background + '80',
      borderRadius: 12,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!rule.is_active && <View style={styles.disabledOverlay} />}

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{rule.name}</Text>
          {rule.description && (
            <Text style={styles.description} numberOfLines={2}>
              {rule.description}
            </Text>
          )}
        </View>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: rule.is_active
                  ? theme.colors.success
                  : theme.colors.textSecondary,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: rule.is_active
                  ? theme.colors.success
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {rule.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.triggerContainer}>
        <Ionicons
          name="flash"
          size={16}
          color={theme.colors.primary}
          style={styles.triggerIcon}
        />
        <Text style={styles.triggerText}>
          When: {getTriggerDisplayName(rule.trigger)}
        </Text>
        <Text style={styles.actionText}>
          → {getActionSummary(rule.actions)}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons
            name="play-circle-outline"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.statText}>
            Executed {rule.execution_count} times
          </Text>
        </View>

        {rule.last_executed && (
          <View style={styles.statItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.statText}>
              Last: {new Date(rule.last_executed).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToggle}
            disabled={toggleRule.isPending}
          >
            <Ionicons
              name={rule.is_active ? 'pause' : 'play'}
              size={18}
              color={theme.colors.primary}
            />
          </TouchableOpacity>

          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Ionicons
                name="create-outline"
                size={18}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDelete}
            disabled={deleteRule.isPending}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
