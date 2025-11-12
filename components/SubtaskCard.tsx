import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  CircleCheck as CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Check,
  X,
  GripVertical,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useUpdateSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import type { SubtaskRecord } from '@/types/task-management';

interface SubtaskCardProps {
  subtask: SubtaskRecord;
  onToggleComplete: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: Partial<SubtaskRecord>) => void;
  showInlineEdit?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function SubtaskCard({
  subtask,
  onToggleComplete,
  onPress,
  onDelete,
  onUpdate,
  showInlineEdit = true,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: SubtaskCardProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [editDescription, setEditDescription] = useState(
    subtask.description || ''
  );

  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#DC2626'; // Red-600
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
      case 'research':
        return '#059669';
      case 'design':
        return '#DC2626';
      default:
        return colors.textSecondary;
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Subtask title cannot be empty');
      return;
    }

    try {
      if (onUpdate) {
        onUpdate({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        });
      } else {
        await updateSubtask.mutateAsync({
          id: subtask.id,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        });
      }
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update subtask');
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(subtask.title);
    setEditDescription(subtask.description || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Subtask',
      `Are you sure you want to delete "${subtask.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete();
            } else {
              deleteSubtask.mutate({
                id: subtask.id,
                parent_task_id: subtask.parent_task_id,
              });
            }
          },
        },
      ]
    );
  };

  const isCompleted = subtask.status === 'completed';
  const dueDateObj = subtask.due_date ? new Date(subtask.due_date) : null;
  const isOverdue = !!dueDateObj && dueDateObj < new Date() && !isCompleted;

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${Math.round(hours * 10) / 10}h`;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        isCompleted && styles.completedCard,
        isDragging && styles.draggingCard,
      ]}
    >
      <View style={styles.header}>
        {/* Drag Handle */}
        <TouchableOpacity
          style={styles.dragHandle}
          onPressIn={onDragStart}
          onPressOut={onDragEnd}
        >
          <GripVertical
            size={16}
            color={colors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Completion Toggle */}
        <TouchableOpacity onPress={onToggleComplete} style={styles.checkButton}>
          {isCompleted ? (
            <CheckCircle2 size={20} color={colors.success} strokeWidth={2} />
          ) : (
            <Circle size={20} color={colors.textSecondary} strokeWidth={2} />
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Subtask title"
                placeholderTextColor={colors.textSecondary}
                multiline
                autoFocus
              />
              <TextInput
                style={[
                  styles.editInput,
                  styles.descriptionInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    { backgroundColor: colors.success },
                  ]}
                  onPress={handleSaveEdit}
                >
                  <Check size={14} color="white" strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.error }]}
                  onPress={handleCancelEdit}
                >
                  <X size={14} color="white" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.titleContainer}
                onPress={onPress}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.title,
                    { color: colors.text },
                    isCompleted && styles.completedText,
                  ]}
                  numberOfLines={2}
                >
                  {subtask.title}
                </Text>
              </TouchableOpacity>

              {!!subtask.description && (
                <Text
                  style={[styles.description, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {subtask.description}
                </Text>
              )}

              {/* Metadata Row */}
              <View style={styles.metadata}>
                {/* Due Date */}
                {dueDateObj && (
                  <View style={styles.metadataItem}>
                    <Calendar
                      size={12}
                      color={isOverdue ? colors.error : colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.metadataText,
                        {
                          color: isOverdue
                            ? colors.error
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {dueDateObj.toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* Time Tracking */}
                {(subtask.actual_hours > 0 || subtask.estimated_hours) && (
                  <View style={styles.metadataItem}>
                    <Clock
                      size={12}
                      color={colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.metadataText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {subtask.actual_hours > 0 &&
                        `${formatTime(subtask.actual_hours)}`}
                      {subtask.actual_hours > 0 &&
                        subtask.estimated_hours &&
                        '/'}
                      {subtask.estimated_hours &&
                        `${formatTime(subtask.estimated_hours)}`}
                    </Text>
                  </View>
                )}

                {/* Priority Badge */}
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: `${getPriorityColor(
                        subtask.priority
                      )}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: getPriorityColor(subtask.priority) },
                    ]}
                  >
                    {subtask.priority}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        {!isEditing && (
          <View style={styles.actions}>
            {showInlineEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsEditing(true)}
              >
                <Edit3 size={14} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Trash2 size={14} color={colors.error} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completedCard: {
    opacity: 0.7,
  },
  draggingCard: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  dragHandle: {
    marginRight: 8,
    padding: 2,
  },
  checkButton: {
    marginRight: 10,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
    lineHeight: 16,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metadataText: {
    fontSize: 11,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
  },

  // Edit mode styles
  editContainer: {
    gap: 8,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '500',
    minHeight: 36,
  },
  descriptionInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
