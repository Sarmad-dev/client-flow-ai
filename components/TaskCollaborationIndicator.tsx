import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';
import { Users, MessageCircle, Clock, UserCheck } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTaskAssignments } from '@/hooks/useTaskAssignments';
import { useTaskComments } from '@/hooks/useTaskComments';
import type { TaskRecord } from '@/hooks/useTasks';

interface TaskCollaborationIndicatorProps {
  task: TaskRecord;
  onPress?: () => void;
  compact?: boolean;
}

export default function TaskCollaborationIndicator({
  task,
  onPress,
  compact = false,
}: TaskCollaborationIndicatorProps) {
  const { colors } = useTheme();
  const { data: assignments = [] } = useTaskAssignments(task.id);
  const { data: comments = [] } = useTaskComments(task.id);

  const hasCollaboration = assignments.length > 0 || comments.length > 0;
  const assignmentCount = assignments.length;
  const commentCount = comments.length;

  // Get recent activity (last 24 hours)
  const recentActivity = comments.filter((comment) => {
    const commentDate = new Date(comment.created_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return commentDate > oneDayAgo;
  }).length;

  if (!hasCollaboration && !compact) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          {
            backgroundColor: hasCollaboration
              ? colors.primary + '20'
              : colors.surface,
            borderColor: hasCollaboration ? colors.primary : colors.border,
          },
        ]}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.compactContent}>
          {assignmentCount > 0 && (
            <View style={styles.compactIndicator}>
              <Users size={12} color={colors.primary} />
              <Text style={[styles.compactText, { color: colors.primary }]}>
                {assignmentCount}
              </Text>
            </View>
          )}

          {commentCount > 0 && (
            <View style={styles.compactIndicator}>
              <MessageCircle size={12} color={colors.primary} />
              <Text style={[styles.compactText, { color: colors.primary }]}>
                {commentCount}
              </Text>
            </View>
          )}

          {recentActivity > 0 && (
            <View
              style={[styles.activityDot, { backgroundColor: colors.success }]}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Users size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            Collaboration
          </Text>
          {recentActivity > 0 && (
            <View
              style={[
                styles.activityBadge,
                { backgroundColor: colors.success },
              ]}
            >
              <Text style={styles.activityBadgeText}>{recentActivity}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Assignments */}
        {assignmentCount > 0 && (
          <View style={styles.stat}>
            <View style={styles.statIcon}>
              <UserCheck size={14} color={colors.textSecondary} />
            </View>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {assignmentCount}{' '}
              {assignmentCount === 1 ? 'assignee' : 'assignees'}
            </Text>
          </View>
        )}

        {/* Comments */}
        {commentCount > 0 && (
          <View style={styles.stat}>
            <View style={styles.statIcon}>
              <MessageCircle size={14} color={colors.textSecondary} />
            </View>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
            </Text>
          </View>
        )}

        {/* Recent Activity */}
        {recentActivity > 0 && (
          <View style={styles.stat}>
            <View style={styles.statIcon}>
              <Clock size={14} color={colors.success} />
            </View>
            <Text style={[styles.statText, { color: colors.success }]}>
              {recentActivity} recent{' '}
              {recentActivity === 1 ? 'update' : 'updates'}
            </Text>
          </View>
        )}

        {/* Assigned Users Preview */}
        {assignments.length > 0 && (
          <View style={styles.assigneesPreview}>
            <Text
              style={[styles.assigneesLabel, { color: colors.textSecondary }]}
            >
              Assigned to:
            </Text>
            <View style={styles.assigneesList}>
              {assignments.slice(0, 3).map((assignment, index) => (
                <View
                  key={assignment.id}
                  style={[
                    styles.assigneeAvatar,
                    { backgroundColor: colors.primary },
                    index > 0 && { marginLeft: -8 },
                  ]}
                >
                  <Text style={styles.assigneeAvatarText}>
                    {(assignment.user?.full_name ||
                      assignment.user?.email ||
                      'U')[0].toUpperCase()}
                  </Text>
                </View>
              ))}
              {assignments.length > 3 && (
                <View
                  style={[
                    styles.assigneeAvatar,
                    {
                      backgroundColor: colors.textSecondary,
                      marginLeft: -8,
                    },
                  ]}
                >
                  <Text style={styles.assigneeAvatarText}>
                    +{assignments.length - 3}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  compactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
    right: -2,
  },
  header: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  activityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 20,
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
  },
  assigneesPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  assigneesLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  assigneesList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  assigneeAvatarText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
