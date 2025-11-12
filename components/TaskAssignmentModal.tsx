import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
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
  useAvailableUsers,
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
  const [emailInput, setEmailInput] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Hooks
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useTaskAssignments(taskId);
  const { data: availableUsers = [] } = useAvailableUsers();
  const assignTaskMutation = useAssignTask();
  const unassignTaskMutation = useUnassignTask();

  const handleAssignByEmail = async () => {
    if (!emailInput.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setIsAssigning(true);
    try {
      await assignTaskMutation.mutateAsync({
        task_id: taskId,
        user_email: emailInput.trim(),
      });

      setEmailInput('');
      Alert.alert('Success', `User assigned to "${taskTitle}"`);
    } catch (error) {
      //   Alert.alert('Error', error instanceof Error ? error.message : error);
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
                task_id: taskId,
                user_id: assignment.user_id,
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
            Assign User
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.emailInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Enter email address"
              placeholderTextColor={colors.textSecondary}
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[
                styles.assignButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isAssigning || !emailInput.trim() ? 0.5 : 1,
                },
              ]}
              onPress={handleAssignByEmail}
              disabled={isAssigning || !emailInput.trim()}
            >
              {isAssigning ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <UserPlus size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Assignments */}
        <View style={styles.assignmentsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Current Assignments ({assignments.length})
          </Text>

          {assignmentsLoading ? (
            <View style={styles.loadingContainer}>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  emailInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  assignButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentsSection: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
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
