import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StyleSheet } from 'react-native';
import {
  Bell,
  X,
  MessageCircle,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { TaskNotification } from '@/types/task-management';

interface TaskNotificationsProps {
  visible: boolean;
  onClose: () => void;
}

// Mock notifications data - in a real app, this would come from a hook
const mockNotifications: TaskNotification[] = [
  {
    id: '1',
    user_id: 'user1',
    task_id: 'task1',
    type: 'assignment',
    title: 'New Task Assignment',
    message: 'You have been assigned to "Complete project proposal"',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  },
  {
    id: '2',
    user_id: 'user1',
    task_id: 'task2',
    type: 'comment',
    title: 'New Comment',
    message: 'John Doe commented on "Review client feedback"',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: '3',
    user_id: 'user1',
    task_id: 'task3',
    type: 'due_date_reminder',
    title: 'Task Due Soon',
    message: '"Prepare presentation slides" is due tomorrow',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: '4',
    user_id: 'user1',
    task_id: 'task4',
    type: 'completion',
    title: 'Task Completed',
    message: 'Sarah completed "Design mockups" that you were collaborating on',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
];

interface NotificationItemProps {
  notification: TaskNotification;
  onPress: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  theme: any;
}

function NotificationItem({
  notification,
  onPress,
  onMarkRead,
  onDelete,
  theme,
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'assignment':
        return <UserPlus size={20} color={theme.primary} />;
      case 'comment':
        return <MessageCircle size={20} color={theme.secondary} />;
      case 'status_change':
      case 'completion':
        return <CheckCircle size={20} color={theme.success} />;
      case 'due_date_reminder':
        return <Calendar size={20} color={theme.warning} />;
      case 'overdue':
        return <AlertTriangle size={20} color={theme.error} />;
      default:
        return <Bell size={20} color={theme.textSecondary} />;
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
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.is_read
            ? theme.card
            : theme.primary + '10',
          borderLeftColor: notification.is_read ? theme.border : theme.primary,
        },
      ]}
      onPress={onPress}
      onLongPress={() => setShowActions(true)}
    >
      <View style={styles.notificationIcon}>{getNotificationIcon()}</View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, { color: theme.text }]}>
            {notification.title}
          </Text>
          <Text
            style={[styles.notificationTime, { color: theme.textSecondary }]}
          >
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>

        <Text
          style={[styles.notificationMessage, { color: theme.textSecondary }]}
        >
          {notification.message}
        </Text>

        {!notification.is_read && (
          <View
            style={[styles.unreadIndicator, { backgroundColor: theme.primary }]}
          />
        )}
      </View>

      {showActions && (
        <>
          <TouchableOpacity
            style={styles.actionsBackdrop}
            activeOpacity={1}
            onPress={() => setShowActions(false)}
          />
          <View
            style={[
              styles.actionsMenu,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {!notification.is_read && (
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onMarkRead();
                  setShowActions(false);
                }}
              >
                <CheckCircle size={16} color={theme.success} />
                <Text style={[styles.actionText, { color: theme.text }]}>
                  Mark as Read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                onDelete();
                setShowActions(false);
              }}
            >
              <Trash2 size={16} color={theme.error} />
              <Text style={[styles.actionText, { color: theme.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function TaskNotifications({
  visible,
  onClose,
}: TaskNotificationsProps) {
  const { colors: theme } = useTheme();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationPress = (notification: TaskNotification) => {
    // Navigate to the task or relevant screen
    console.log('Navigate to task:', notification.task_id);

    // Mark as read if not already
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const handleDeleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const renderNotification = ({ item }: { item: TaskNotification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkRead={() => handleMarkAsRead(item.id)}
      onDelete={() => handleDeleteNotification(item.id)}
      theme={theme}
    />
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Bell size={24} color={theme.text} />
            <Text style={[styles.title, { color: theme.text }]}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.error }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {notifications.length > 0 && (
          <View style={[styles.actions, { borderBottomColor: theme.border }]}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.primary + '20' },
                ]}
                onPress={handleMarkAllAsRead}
              >
                <CheckCircle size={16} color={theme.primary} />
                <Text
                  style={[styles.actionButtonText, { color: theme.primary }]}
                >
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.error + '20' },
              ]}
              onPress={handleClearAll}
            >
              <Trash2 size={16} color={theme.error} />
              <Text style={[styles.actionButtonText, { color: theme.error }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Notifications
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
              You're all caught up! Notifications about task assignments,
              comments, and updates will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsList}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationsList: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    position: 'relative',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  actionsMenu: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
