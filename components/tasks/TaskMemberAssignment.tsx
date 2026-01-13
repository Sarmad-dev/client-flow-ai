import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { Users, Plus, X, Check, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useTaskAssignments,
  useAssignTask,
  useUnassignTask,
  useAssignableMembersForTask,
} from '@/hooks/useTaskAssignments';
import type { TaskAssignment } from '@/types/task-management';
import type { OrganizationMember } from '@/types/organization';

interface TaskMemberAssignmentProps {
  taskId: string;
  projectId?: string;
  compact?: boolean;
}

export default function TaskMemberAssignment({
  taskId,
  projectId,
  compact = false,
}: TaskMemberAssignmentProps) {
  const { colors } = useTheme();
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: assignments = [], isLoading: assignmentsLoading } =
    useTaskAssignments(taskId);
  const { data: assignableMembers = [], isLoading: membersLoading } =
    useAssignableMembersForTask(taskId, projectId);
  const assignTask = useAssignTask();
  const unassignTask = useUnassignTask();

  const handleAssignMember = async (member: OrganizationMember) => {
    try {
      await assignTask.mutateAsync({
        taskId,
        userId: member.user_id,
        projectId,
      });
      setShowAssignModal(false);
    } catch (error: any) {
      Alert.alert(
        'Assignment Failed',
        error.message || 'Failed to assign member to task'
      );
    }
  };

  const handleUnassignMember = (assignment: TaskAssignment) => {
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
          onPress: () => {
            unassignTask.mutate({
              taskId,
              userId: assignment.user_id,
            });
          },
        },
      ]
    );
  };

  const renderAssignedMember = ({ item }: { item: TaskAssignment }) => (
    <TouchableOpacity
      style={[styles.assignedMember, { backgroundColor: colors.surface }]}
      onPress={() => handleUnassignMember(item)}
    >
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(item.user?.full_name || item.user?.email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text
            style={[styles.memberName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.user?.full_name || item.user?.email}
          </Text>
          <Text
            style={[styles.memberRole, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Assigned
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleUnassignMember(item)}
      >
        <X size={16} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAssignableMember = ({ item }: { item: OrganizationMember }) => (
    <TouchableOpacity
      style={[styles.assignableMember, { backgroundColor: colors.surface }]}
      onPress={() => handleAssignMember(item)}
      disabled={assignTask.isPending}
    >
      <View style={styles.memberInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(item.user?.full_name || item.user?.email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text
            style={[styles.memberName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.user?.full_name || item.user?.email}
          </Text>
          <Text
            style={[styles.memberRole, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.role}
          </Text>
        </View>
      </View>
      <View style={[styles.assignButton, { backgroundColor: colors.primary }]}>
        <Plus size={16} color="white" />
      </View>
    </TouchableOpacity>
  );

  if (assignmentsLoading) {
    return (
      <View style={{ marginVertical: 8 }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            textAlign: 'center',
            padding: 16,
          }}
        >
          Loading assignments...
        </Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    addButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
    assignedMember: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    memberDetails: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      fontWeight: '500',
    },
    memberRole: {
      fontSize: 12,
      marginTop: 2,
    },
    removeButton: {
      padding: 4,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      width: '90%',
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    assignableMember: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    assignButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 14,
      textAlign: 'center',
      padding: 16,
    },
    noMembersText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      padding: 20,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Assigned Members ({assignments.length})
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAssignModal(true)}
        >
          <UserPlus size={14} color="white" />
          <Text style={styles.addButtonText}>Assign</Text>
        </TouchableOpacity>
      </View>

      {assignments.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={32} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No members assigned to this task</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={renderAssignedMember}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <TouchableOpacity
          style={styles.modal}
          activeOpacity={1}
          onPress={() => setShowAssignModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Members</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAssignModal(false)}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {membersLoading ? (
              <Text style={styles.loadingText}>Loading members...</Text>
            ) : assignableMembers.length === 0 ? (
              <Text style={styles.noMembersText}>
                All organization members are already assigned to this task
              </Text>
            ) : (
              <FlatList
                data={assignableMembers}
                keyExtractor={(item) => item.id}
                renderItem={renderAssignableMember}
                showsVerticalScrollIndicator={false}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
