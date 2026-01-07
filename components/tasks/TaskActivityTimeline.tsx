import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { StyleSheet } from 'react-native';
import {
  MessageCircle,
  UserPlus,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTaskActivity, formatActivityItem } from '@/hooks/useTaskActivity';
import type { TaskActivityItem } from '@/hooks/useTaskActivity';

interface TaskActivityTimelineProps {
  taskId: string;
  maxHeight?: number;
  limit?: number;
}

interface ActivityItemProps {
  activity: TaskActivityItem;
  theme: any;
  isLast: boolean;
}

function ActivityTimelineItem({ activity, theme, isLast }: ActivityItemProps) {
  const formatted = formatActivityItem(activity);

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'comment':
        return <MessageCircle size={20} color={theme.primary} />;
      case 'assignment':
        return <UserPlus size={20} color={theme.success} />;
      case 'status_change':
        return <Activity size={20} color={theme.warning} />;
      case 'time_entry':
        return <Clock size={20} color={theme.info} />;
      default:
        return <AlertCircle size={20} color={theme.textSecondary} />;
    }
  };

  const getActivityColor = () => {
    switch (activity.activity_type) {
      case 'comment':
        return theme.primary;
      case 'assignment':
        return theme.success;
      case 'status_change':
        return theme.warning;
      case 'time_entry':
        return theme.info;
      default:
        return theme.textSecondary;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <View style={styles.activityItem}>
      {/* Timeline Line */}
      <View style={styles.timelineContainer}>
        <View
          style={[
            styles.timelineIcon,
            { backgroundColor: getActivityColor() + '20' },
          ]}
        >
          {getActivityIcon()}
        </View>
        {!isLast && (
          <View
            style={[styles.timelineLine, { backgroundColor: theme.border }]}
          />
        )}
      </View>

      {/* Activity Content */}
      <View style={[styles.activityContent, { backgroundColor: theme.card }]}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, { color: theme.text }]}>
            {formatted.title}
          </Text>
          <Text style={[styles.activityTime, { color: theme.textSecondary }]}>
            {formatRelativeTime(activity.created_at)}
          </Text>
        </View>

        <Text
          style={[styles.activityDescription, { color: theme.textSecondary }]}
        >
          {formatted.description}
        </Text>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View
            style={[styles.userAvatar, { backgroundColor: getActivityColor() }]}
          >
            <User size={12} color="white" />
          </View>
          <Text style={[styles.userName, { color: theme.textSecondary }]}>
            {activity.user_name}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function TaskActivityTimeline({
  taskId,
  maxHeight = 400,
  limit = 50,
}: TaskActivityTimelineProps) {
  const { colors: theme } = useTheme();
  const {
    data: activities = [],
    isLoading,
    error,
  } = useTaskActivity(taskId, limit);

  const renderActivity = ({
    item,
    index,
  }: {
    item: TaskActivityItem;
    index: number;
  }) => (
    <ActivityTimelineItem
      activity={item}
      theme={theme}
      isLast={index === activities.length - 1}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { maxHeight }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading activity...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { maxHeight }]}>
        <AlertCircle size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>
          Failed to load activity timeline
        </Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={[styles.emptyContainer, { maxHeight }]}>
        <Activity size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No activity yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          Activity will appear here as team members interact with this task
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { maxHeight }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Activity Timeline
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {activities.length}{' '}
          {activities.length === 1 ? 'activity' : 'activities'}
        </Text>
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item, index) =>
          `${item.activity_type}-${item.created_at}-${index}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineList}
      />
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  timelineList: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  activityContent: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  activityTime: {
    fontSize: 12,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 12,
    fontWeight: '500',
  },
});
