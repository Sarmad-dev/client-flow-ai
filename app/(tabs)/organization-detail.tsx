import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  UserPlus,
  Crown,
  Shield,
  User,
  X,
  LogOut,
  MoreVertical,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useOrganizations,
  useOrganizationMembers,
} from '@/hooks/useOrganizations';
import { useAlert } from '@/contexts/CustomAlertContext';
import { useAuth } from '@/contexts/AuthContext';

export default function OrganizationDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const { organizations } = useOrganizations();
  const { members, isLoading, inviteMember, removeMember, leaveOrganization } =
    useOrganizationMembers(id);

  const organization = organizations.find((org) => org.id === id);
  const userRole = organization?.user_role;
  const canInvite = userRole === 'owner' || userRole === 'admin';
  const canRemoveMembers = userRole === 'owner' || userRole === 'admin';

  const handleInvite = async () => {
    if (!email.trim()) return;

    try {
      await inviteMember.mutateAsync({
        organization_id: id!,
        user_email: email.trim(),
        role,
      });
      setShowInviteModal(false);
      setEmail('');
      showAlert({
        title: 'Success',
        message: 'Invitation sent successfully',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to send invitation',
      });
    }
  };

  const handleRemoveMember = async (
    membershipId: string,
    memberRole: string
  ) => {
    if (!canRemoveMembers) {
      showAlert({
        title: 'Permission Denied',
        message: 'Only owners and admins can remove members',
      });
      return;
    }

    if (memberRole === 'owner') {
      showAlert({
        title: 'Cannot Remove',
        message: 'The owner cannot be removed from the organization',
      });
      return;
    }

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember.mutateAsync(membershipId);
              showAlert({
                title: 'Success',
                message: 'Member removed',
              });
            } catch (error) {
              showAlert({
                title: 'Error',
                message: 'Failed to remove member',
              });
            }
          },
        },
      ]
    );
  };

  const handleLeaveOrganization = async () => {
    if (userRole === 'owner') {
      showAlert({
        title: 'Cannot Leave',
        message:
          'Organization owners cannot leave. Transfer ownership or delete the organization first.',
      });
      return;
    }

    Alert.alert(
      'Leave Organization',
      'Are you sure you want to leave this organization?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveOrganization.mutateAsync(id!);
              showAlert({
                title: 'Success',
                message: 'You have left the organization',
              });
              router.back();
            } catch (error) {
              showAlert({
                title: 'Error',
                message: 'Failed to leave organization',
              });
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
      case 'owner':
        return <Crown size={16} color={colors.warning} />;
      case 'admin':
        return <Shield size={16} color={colors.primary} />;
      default:
        return <User size={16} color={colors.textSecondary} />;
    }
  };

  const getStatusBadge = (status: string) => {
    const isPending = status === 'pending';
    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: isPending
              ? colors.warning + '20'
              : colors.success + '20',
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: isPending ? colors.warning : colors.success },
          ]}
        >
          {status}
        </Text>
      </View>
    );
  };

  if (!organization) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Organization not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>
            {organization.name}
          </Text>
          {organization.description && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {organization.description}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {canInvite && (
            <TouchableOpacity
              onPress={() => setShowInviteModal(true)}
              style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            >
              <UserPlus size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {userRole !== 'owner' && (
            <TouchableOpacity
              onPress={handleLeaveOrganization}
              style={[
                styles.leaveButton,
                { backgroundColor: colors.error + '20' },
              ]}
            >
              <LogOut size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={members}
          renderItem={({ item }) => (
            <View
              style={[styles.memberCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.memberInfo}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.primary + '20' },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {item.user?.full_name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.memberDetails}>
                  <View style={styles.memberHeader}>
                    <Text style={[styles.memberEmail, { color: colors.text }]}>
                      {item.user?.full_name || 'Member'}
                    </Text>
                    {getRoleIcon(item.role)}
                  </View>
                  <View style={styles.memberHeader}>
                    <Text style={[styles.memberEmail, { color: colors.text }]}>
                      {item.user?.email || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.memberMeta}>
                    <Text
                      style={[styles.roleText, { color: colors.textSecondary }]}
                    >
                      {item.role}
                    </Text>
                    {getStatusBadge(item.status)}
                  </View>
                </View>
              </View>
              {item.role !== 'owner' && canRemoveMembers && (
                <TouchableOpacity
                  onPress={() => handleRemoveMember(item.id, item.role)}
                  style={styles.removeButton}
                >
                  <X size={18} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No members yet
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Invite Member
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>
              Email Address
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="member@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.text }]}>Role</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor:
                      role === 'member' ? colors.primary : colors.background,
                  },
                ]}
                onPress={() => setRole('member')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    { color: role === 'member' ? '#fff' : colors.text },
                  ]}
                >
                  Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    backgroundColor:
                      role === 'admin' ? colors.primary : colors.background,
                  },
                ]}
                onPress={() => setRole('admin')}
              >
                <Text
                  style={[
                    styles.roleOptionText,
                    { color: role === 'admin' ? '#fff' : colors.text },
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleInvite}
                disabled={!email.trim() || inviteMember.isPending}
              >
                {inviteMember.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    Send Invite
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberEmail: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  removeButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
