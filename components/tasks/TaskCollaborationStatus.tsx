import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';
import { Eye, Edit3, Clock, Users } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';

interface CollaboratorStatus {
  user_id: string;
  user_name: string;
  user_email: string;
  status: 'viewing' | 'editing' | 'timing';
  last_seen: string;
}

interface TaskCollaborationStatusProps {
  taskId: string;
  compact?: boolean;
}

// Mock real-time collaboration data - in a real app, this would come from WebSocket/Supabase realtime
const mockCollaborators: CollaboratorStatus[] = [
  {
    user_id: 'user2',
    user_name: 'John Doe',
    user_email: 'john@example.com',
    status: 'viewing',
    last_seen: new Date().toISOString(),
  },
  {
    user_id: 'user3',
    user_name: 'Sarah Wilson',
    user_email: 'sarah@example.com',
    status: 'editing',
    last_seen: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
  },
];

export default function TaskCollaborationStatus({
  taskId,
  compact = false,
}: TaskCollaborationStatusProps) {
  const { colors: theme } = useTheme();
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    // Filter out current user and simulate some activity
    const activeCollaborators = mockCollaborators.filter(
      (c) => c.user_id !== user?.id
    );

    setCollaborators(activeCollaborators);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setCollaborators((prev) =>
        prev.map((c) => ({
          ...c,
          last_seen:
            Math.random() > 0.7 ? new Date().toISOString() : c.last_seen,
          status:
            Math.random() > 0.8
              ? (['viewing', 'editing', 'timing'] as const)[
                  Math.floor(Math.random() * 3)
                ]
              : c.status,
        }))
      );
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [taskId, user?.id]);

  const getStatusIcon = (status: CollaboratorStatus['status']) => {
    switch (status) {
      case 'viewing':
        return <Eye size={12} color={theme.primary} />;
      case 'editing':
        return <Edit3 size={12} color={theme.warning} />;
      case 'timing':
        return <Clock size={12} color={theme.success} />;
      default:
        return <Eye size={12} color={theme.textSecondary} />;
    }
  };

  const getStatusColor = (status: CollaboratorStatus['status']) => {
    switch (status) {
      case 'viewing':
        return theme.primary;
      case 'editing':
        return theme.warning;
      case 'timing':
        return theme.success;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusText = (status: CollaboratorStatus['status']) => {
    switch (status) {
      case 'viewing':
        return 'viewing';
      case 'editing':
        return 'editing';
      case 'timing':
        return 'tracking time';
      default:
        return 'active';
    }
  };

  const isRecentlyActive = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastSeenDate > fiveMinutesAgo;
  };

  const activeCollaborators = collaborators.filter((c) =>
    isRecentlyActive(c.last_seen)
  );

  if (activeCollaborators.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          { backgroundColor: theme.primary + '10' },
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Users size={14} color={theme.primary} />
        <Text style={[styles.compactText, { color: theme.primary }]}>
          {activeCollaborators.length} active
        </Text>

        {/* Active indicators */}
        <View style={styles.compactIndicators}>
          {activeCollaborators.slice(0, 3).map((collaborator, index) => (
            <View
              key={collaborator.user_id}
              style={[
                styles.compactIndicator,
                {
                  backgroundColor: getStatusColor(collaborator.status),
                  marginLeft: index > 0 ? -4 : 0,
                },
              ]}
            />
          ))}
          {activeCollaborators.length > 3 && (
            <Text style={[styles.compactMore, { color: theme.primary }]}>
              +{activeCollaborators.length - 3}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <Users size={16} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>
            Active Collaborators ({activeCollaborators.length})
          </Text>
        </View>

        <View style={styles.headerRight}>
          {activeCollaborators.slice(0, 3).map((collaborator, index) => (
            <View
              key={collaborator.user_id}
              style={[
                styles.avatar,
                {
                  backgroundColor: getStatusColor(collaborator.status),
                  marginLeft: index > 0 ? -8 : 0,
                },
              ]}
            >
              <Text style={styles.avatarText}>
                {collaborator.user_name[0].toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.collaboratorsList}>
          {activeCollaborators.map((collaborator) => (
            <View key={collaborator.user_id} style={styles.collaboratorItem}>
              <View style={styles.collaboratorLeft}>
                <View
                  style={[
                    styles.collaboratorAvatar,
                    { backgroundColor: getStatusColor(collaborator.status) },
                  ]}
                >
                  <Text style={styles.collaboratorAvatarText}>
                    {collaborator.user_name[0].toUpperCase()}
                  </Text>
                </View>

                <View style={styles.collaboratorInfo}>
                  <Text
                    style={[styles.collaboratorName, { color: theme.text }]}
                  >
                    {collaborator.user_name}
                  </Text>
                  <Text
                    style={[
                      styles.collaboratorEmail,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {collaborator.user_email}
                  </Text>
                </View>
              </View>

              <View style={styles.collaboratorStatus}>
                <View style={styles.statusIndicator}>
                  {getStatusIcon(collaborator.status)}
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(collaborator.status) },
                    ]}
                  >
                    {getStatusText(collaborator.status)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: theme.success },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  compactIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  compactIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'white',
  },
  compactMore: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  collaboratorsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  collaboratorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  collaboratorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collaboratorAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  collaboratorEmail: {
    fontSize: 12,
  },
  collaboratorStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
