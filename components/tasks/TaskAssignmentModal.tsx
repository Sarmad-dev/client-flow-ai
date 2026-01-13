import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { X, UserPlus, Mail, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useTaskAssignments,
  useAssignTask,
  useUnassignTask,
  useAssignableMembersForTask,
} from '@/hooks/useTaskAssignments';
import type { TaskAssignment } from '@/types/task-management';

interface TaskAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export default function TaskAssignmentModal({
  visible,
  onClose,
  taskId,
  taskTitle,
}: TaskAssignmentModalProps) {
  const { colors } = useTheme();
  const [isAssigning, setIsAssigning] = useState(false);

  // Hooks
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useTaskAssignments(taskId);
  const { data: availableMembers = [], isLoading: membersLoading } =
    useAssignableMembersForTask(taskId);
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();

  // Filter out already assigned users (this is now handled by useAssignableMembersForTask)
  const assignedUserIds = assignments.map((a) => a.user_id);

  const handleAssignMember = async (member: any) => {
    setIsAssigning(true);
    try {
      await assignTaskMutation.mutateAsync({
        taskId: taskId,
        userId: member.user_id, // This should be the profile ID
      });

      Alert.alert('Success', `Member assigned to "${taskTitle}"`);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to assign member'
      );
      console.log('Error Message: ', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (assignment: TaskAssignment) => {
    Alert.alert(
      'Remove Assignment',
      `Remove ${
        assignment.user?.full_name || assignment.user?.email
      } from this task?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await unassignTaskMutation.mutateAsync({
                taskId: taskId,
                userId: assignment.user_id,
              });
              Alert.alert('Success', 'User removed from task');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove user from task');
            }
          },
        },
      ]
    );
  };

  const renderAssignment = ({ item }: { item: TaskAssignment }) => (
    <View style={[styles.assignmentItem, { backgroundColor: colors.surface }]}>
      <View style={styles.assignmentInfo}>
        <Text style={[styles.assignmentName, { color: colors.text }]}>
          {item.user?.full_name || item.user?.email}
        </Text>
        <Text style={[styles.assignmentEmail, { color: colors.textSecondary }]}>
          {item.user?.email}
        </Text>
        <Text style={[styles.assignmentDate, { color: colors.textSecondary }]}>
          Assigned {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: colors.error + '20' }]}
        onPress={() => handleUnassign(item)}
        disabled={unassignTaskMutation.isPending}
      >
        <Trash2 size={16} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  const renderAvailableMember = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: colors.surface }]}
      onPress={() => handleAssignMember(item)}
      disabled={isAssigning}
    >
      <View
        style={[styles.userAvatar, { backgroundColor: colors.primary + '20' }]}
      >
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {(item.user?.full_name || item.user?.email || 'U')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {item.user?.full_name || item.user?.email}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {item.user?.email}
        </Text>
        <Text style={[styles.userRole, { color: colors.textSecondary }]}>
          {item.role}
        </Text>
      </View>
      <UserPlus size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Task Assignments
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Task Info */}
        <View style={[styles.taskInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.taskTitle, { color: colors.text }]}>
            {taskTitle}
          </Text>
        </View>

        {/* Add Assignment Section */}
        <View style={styles.addSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Assign Team Member
          </Text>

          {/* Available Members List */}
          {membersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Loading team members...
              </Text>
            </View>
          ) : availableMembers.length > 0 ? (
            <View style={styles.availableUsersContainer}>
              <FlatList
                data={availableMembers}
                renderItem={renderAvailableMember}
                keyExtractor={(item: any) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.availableUsersList}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <View style={styles.noUsersContainer}>
              <Text
                style={[styles.noUsersText, { color: colors.textSecondary }]}
              >
                All organization members are already assigned to this task.
              </Text>
            </View>
          )}
        </View>

        {/* Current Assignments */}
        <View style={styles.assignmentsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Current Assignments ({assignments.length})
          </Text>

          {assignmentsLoading ? (
            <View style={styles.assignmentsLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : assignments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Mail size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No users assigned to this task
              </Text>
            </View>
          ) : (
            <FlatList
              data={assignments}
              renderItem={renderAssignment}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.assignmentsList}
            />
          )}
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  taskInfo: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  addSection: {
    padding: 16,
    maxHeight: '50%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  availableUsersContainer: {
    marginBottom: 16,
  },
  availableUsersList: {
    gap: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  userRole: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  noUsersContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noUsersText: {
    fontSize: 14,
    textAlign: 'center',
  },
  assignmentsSection: {
    flex: 1,
    padding: 16,
  },
  assignmentsLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  assignmentsList: {
    gap: 12,
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  assignmentEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  assignmentDate: {
    fontSize: 12,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
