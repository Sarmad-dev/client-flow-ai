import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StyleSheet } from 'react-native';
import {
  Send,
  MessageCircle,
  Edit3,
  Trash2,
  MoreVertical,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTaskComments,
  useAddTaskComment,
  useUpdateTaskComment,
  useDeleteTaskComment,
  useTaskCommentsSubscription,
} from '@/hooks/useTaskComments';
import type { TaskComment } from '@/types/task-management';

interface TaskCommentsProps {
  taskId: string;
  maxHeight?: number;
}

interface CommentItemProps {
  comment: TaskComment;
  currentUserId: string;
  onEdit: (comment: TaskComment) => void;
  onDelete: (comment: TaskComment) => void;
  theme: any;
}

function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  theme,
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);
  const isOwner = comment.user_id === currentUserId;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={[styles.commentItem, { backgroundColor: theme.surface }]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAuthor}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {(comment.user?.full_name ||
                comment.user?.email ||
                'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentMeta}>
            <Text style={[styles.authorName, { color: theme.text }]}>
              {comment.user?.full_name || comment.user?.email || 'Unknown User'}
            </Text>
            <Text style={[styles.commentTime, { color: theme.textSecondary }]}>
              {formatTimestamp(comment.created_at)}
            </Text>
          </View>
        </View>

        {isOwner && (
          <TouchableOpacity
            style={styles.actionsButton}
            onPress={() => setShowActions(!showActions)}
          >
            <MoreVertical size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.commentContent, { color: theme.text }]}>
        {comment.content}
      </Text>

      {showActions && isOwner && (
        <View
          style={[
            styles.actionsMenu,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              setShowActions(false);
              onEdit(comment);
            }}
          >
            <Edit3 size={16} color={theme.text} />
            <Text style={[styles.actionText, { color: theme.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              setShowActions(false);
              onDelete(comment);
            }}
          >
            <Trash2 size={16} color={theme.error} />
            <Text style={[styles.actionText, { color: theme.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function TaskComments({
  taskId,
  maxHeight = 400,
}: TaskCommentsProps) {
  const { colors: theme } = useTheme();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<TaskComment | null>(
    null
  );
  const [editContent, setEditContent] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Hooks
  const { data: comments = [], isLoading } = useTaskComments(taskId);
  const addCommentMutation = useAddTaskComment();
  const updateCommentMutation = useUpdateTaskComment();
  const deleteCommentMutation = useDeleteTaskComment();

  // Set up real-time subscription
  useTaskCommentsSubscription(taskId);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        task_id: taskId,
        content: newComment.trim(),
      });
      setNewComment('');
      inputRef.current?.blur();
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleEditComment = (comment: TaskComment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editContent.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        id: editingComment.id,
        content: editContent.trim(),
        task_id: taskId,
      });
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment');
    }
  };

  const handleDeleteComment = (comment: TaskComment) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommentMutation.mutateAsync({
                id: comment.id,
                task_id: taskId,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { maxHeight }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Comments List */}
      <ScrollView
        style={styles.commentsContainer}
        contentContainerStyle={styles.commentsContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No comments yet. Be the first to comment!
            </Text>
          </View>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id || ''}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                theme={theme}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Edit Comment Modal */}
      {editingComment && (
        <View
          style={[
            styles.editContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.editTitle, { color: theme.text }]}>
            Edit Comment
          </Text>
          <TextInput
            style={[
              styles.editInput,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            placeholder="Edit your comment..."
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: theme.textSecondary + '20' },
              ]}
              onPress={() => {
                setEditingComment(null);
                setEditContent('');
              }}
            >
              <Text
                style={[styles.editButtonText, { color: theme.textSecondary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    !editContent.trim() || updateCommentMutation.isPending
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={handleUpdateComment}
              disabled={!editContent.trim() || updateCommentMutation.isPending}
            >
              {updateCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.editButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Comment Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          style={[
            styles.inputContainer,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.commentInput,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: theme.primary,
                opacity:
                  !newComment.trim() || addCommentMutation.isPending ? 0.5 : 1,
              },
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            {addCommentMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsContainer: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  commentItem: {
    padding: 16,
    borderRadius: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  commentMeta: {
    flex: 1,
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsButton: {
    padding: 8,
    marginTop: -4,
    marginRight: -4,
  },
  commentContent: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 52,
  },
  actionsMenu: {
    position: 'absolute',
    top: 48,
    right: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    minWidth: 120,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  editContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
