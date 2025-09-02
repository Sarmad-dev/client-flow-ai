import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  CircleCheck as CheckCircle2,
  Circle,
  Calendar,
  User,
  MoveVertical as MoreVertical,
  TriangleAlert as AlertTriangle,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface TaskLike {
  id: string;
  title: string;
  tag: string;
  priority: 'low' | 'medium' | 'high';
  // Legacy props
  client?: string;
  dueDate?: string;
  completed?: boolean;
  // DB props
  client_id?: string | null;
  due_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string | null;
  clients?: { name?: string | null; company?: string | null } | null;
}

interface TaskCardProps {
  task: TaskLike;
  onToggleComplete: () => void;
  onPress?: () => void;
  onDelete?: () => void;
}

export function TaskCard({
  task,
  onToggleComplete,
  onPress,
  onDelete,
}: TaskCardProps) {
  const { colors } = useTheme();
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'follow-up':
        return colors.primary;
      case 'proposal':
        return colors.secondary;
      case 'call':
        return colors.accent;
      case 'meeting':
        return '#8B5CF6';
      default:
        return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            setShowDeleteMenu(false);
          },
        },
      ]
    );
  };

  const clientLabel =
    task.client ?? task.clients?.name ?? task.clients?.company ?? '';
  const due = task.dueDate ?? task.due_date ?? undefined;
  const isCompleted =
    typeof task.completed === 'boolean'
      ? task.completed
      : task.status === 'completed';
  const dueDateObj = due ? new Date(due) : null;
  const isOverdue = !!dueDateObj && dueDateObj < new Date() && !isCompleted;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        isCompleted && styles.completedCard,
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onToggleComplete} style={styles.checkButton}>
          {isCompleted ? (
            <CheckCircle2 size={24} color={colors.success} strokeWidth={2} />
          ) : (
            <Circle size={24} color={colors.textSecondary} strokeWidth={2} />
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
              isCompleted && styles.completedText,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <User size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {clientLabel}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <Calendar
                size={14}
                color={isOverdue ? colors.error : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.metadataText,
                  { color: isOverdue ? colors.error : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {dueDateObj ? new Date(dueDateObj).toLocaleDateString() : '-'}
              </Text>
              {isOverdue && (
                <AlertTriangle size={14} color={colors.error} strokeWidth={2} />
              )}
            </View>
          </View>

          {!!task.description && (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          )}

          <View style={styles.tags}>
            <View
              style={[
                styles.tag,
                { backgroundColor: `${getTagColor(task.tag)}15` },
              ]}
            >
              <Text style={[styles.tagText, { color: getTagColor(task.tag) }]}>
                {task.tag}
              </Text>
            </View>
            <View
              style={[
                styles.priorityTag,
                { backgroundColor: `${getPriorityColor(task.priority)}15` },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: getPriorityColor(task.priority) },
                ]}
              >
                {task.priority}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowDeleteMenu(!showDeleteMenu)}
        >
          <MoreVertical
            size={20}
            color={colors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      {/* Delete Menu */}
      {showDeleteMenu && (
        <>
          <TouchableOpacity
            style={styles.deleteBackdrop}
            activeOpacity={1}
            onPress={() => setShowDeleteMenu(false)}
          />
          <View
            style={[styles.deleteMenu, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.border }]}
              onPress={handleDeletePress}
            >
              <Trash2 size={16} color={colors.error} strokeWidth={2} />
              <Text style={[styles.deleteText, { color: colors.error }]}>
                Delete Task
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },

  completedCard: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  checkButton: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  metadata: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 10,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
    flex: 1,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moreButton: {
    marginLeft: 12,
    padding: 4,
  },
  deleteMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 150,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 36,
  },
  deleteText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});
