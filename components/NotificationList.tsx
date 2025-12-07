import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Calendar,
  UserPlus,
  MessageSquare,
  AtSign,
  Trash2,
} from 'lucide-react-native';
import type { Notification } from '@/types/organization';
import OrganizationInviteCard from './OrganizationInviteCard';
import { length } from 'zod';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'organization_invite':
      return Users;
    case 'task_assigned':
      return CheckCircle;
    case 'task_completed':
      return CheckCircle;
    case 'task_overdue':
      return AlertCircle;
    case 'meeting_scheduled':
      return Calendar;
    case 'meeting_reminder':
      return Calendar;
    case 'meeting_cancelled':
      return Calendar;
    case 'lead_assigned':
      return UserPlus;
    case 'comment_added':
      return MessageSquare;
    case 'mention':
      return AtSign;
    default:
      return AlertCircle;
  }
};

export default function NotificationList() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url as any);
    }
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    // Show special card for organization invites
    if (item.type === 'organization_invite' && !item.read) {
      return <OrganizationInviteCard notification={item} />;
    }

    const Icon = getNotificationIcon(item.type);
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            backgroundColor: isUnread ? colors.primary + '10' : colors.surface,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primary + '20' },
          ]}
        >
          <Icon size={20} color={colors.primary} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title}
          </Text>
          <Text
            style={[styles.message, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Trash2 size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {notifications.length > 0 && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications ({notifications.filter((n) => !n.read).length})
          </Text>
          <TouchableOpacity onPress={() => markAllAsRead.mutate()}>
            <Text style={[styles.markAllRead, { color: colors.primary }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No notifications
            </Text>
          </View>
        }
      />
    </View>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
