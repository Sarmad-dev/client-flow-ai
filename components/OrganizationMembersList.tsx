import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {
  Users,
  UserPlus,
  MoreVertical,
  Mail,
  Crown,
  Shield,
  User,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  useOrganizationMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/useOrganizationMembers';
import type { OrganizationMember } from '@/types/organization';

interface OrganizationMembersListProps {
  organizationId?: string;
  showInviteButton?: boolean;
}

export default function OrganizationMembersList({
  organizationId,
  showInviteButton = true,
}: OrganizationMembersListProps) {
  const { colors } = useTheme();
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMemberActions, setShowMemberActions] = useState<string | null>(
    null
  );
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  const { data: members = [], isLoading } = useOrganizationMembers(orgId);
  const inviteMember = useInviteMember();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const handleInviteMember = async () => {
    if (!orgId || !inviteEmail.trim()) return;

    try {
      await inviteMember.mutateAsync({
        organization_id: orgId,
        user_email: inviteEmail.trim(),
        role: inviteRole,
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      Alert.alert('Success', 'Invitation sent successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    }
  };

  const handleUpdateRole = (
    member: OrganizationMember,
    newRole: 'admin' | 'member'
  ) => {
    Alert.alert(
      'Update Role',
      `Change ${
        member.user?.full_name || member.user?.email
      }'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            updateMemberRole.mutate({
              membership_id: member.id,
              role: newRole,
            });
            setShowMemberActions(null);
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: OrganizationMember) => {
    Alert.alert(
      'Remove Member',
      `Remove ${
        member.user?.full_name || member.user?.email
      } from this organization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeMember.mutate({
              membershipId: member.id,
              organizationId: member.organization_id,
            });
            setShowMemberActions(null);
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color={colors.warning} />;
      case 'admin':
        return <Shield size={16} color={colors.primary} />;
      default:
        return <User size={16} color={colors.textSecondary} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return colors.warning;
      case 'admin':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const renderMember = ({ item }: { item: OrganizationMember }) => (
    <View style={[styles.memberItem, { backgroundColor: colors.surface }]}>
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
          <View style={styles.roleContainer}>
            {getRoleIcon(item.role)}
            <Text
              style={[
                styles.memberRole,
                { color: getRoleColor(item.role), marginLeft: 4 },
              ]}
            >
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
          {item.status === 'pending' && (
            <Text style={[styles.statusText, { color: colors.warning }]}>
              Invitation Pending
            </Text>
          )}
        </View>
      </View>

      {item.role !== 'owner' && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() =>
            setShowMemberActions(showMemberActions === item.id ? null : item.id)
          }
        >
          <MoreVertical size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {showMemberActions === item.id && (
        <View
          style={[styles.actionsMenu, { backgroundColor: colors.background }]}
        >
          {item.role === 'member' && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleUpdateRole(item, 'admin')}
            >
              <Shield size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Make Admin
              </Text>
            </TouchableOpacity>
          )}
          {item.role === 'admin' && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => handleUpdateRole(item, 'member')}
            >
              <User size={16} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                Make Member
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => handleRemoveMember(item)}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>
              Remove
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    inviteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    inviteButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: 'relative',
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    avatarText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    memberDetails: {
      flex: 1,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    roleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    memberRole: {
      fontSize: 12,
      fontWeight: '500',
    },
    statusText: {
      fontSize: 12,
      marginTop: 2,
      fontStyle: 'italic',
    },
    moreButton: {
      padding: 8,
    },
    actionsMenu: {
      position: 'absolute',
      right: 16,
      top: 60,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
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
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 120,
    },
    actionText: {
      fontSize: 14,
      marginLeft: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
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
      padding: 20,
      width: '90%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    roleSelector: {
      flexDirection: 'row',
      gap: 12,
    },
    roleOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    roleOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    roleOptionUnselected: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    roleOptionText: {
      fontSize: 14,
      fontWeight: '500',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      padding: 20,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Members ({members.length})</Text>
        {showInviteButton && (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
          >
            <UserPlus size={16} color="white" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      {members.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            No members in this organization yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <TouchableOpacity
          style={styles.modal}
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Member</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInviteModal(false)}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    inviteRole === 'member'
                      ? styles.roleOptionSelected
                      : styles.roleOptionUnselected,
                  ]}
                  onPress={() => setInviteRole('member')}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      {
                        color:
                          inviteRole === 'member'
                            ? colors.primary
                            : colors.text,
                      },
                    ]}
                  >
                    Member
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    inviteRole === 'admin'
                      ? styles.roleOptionSelected
                      : styles.roleOptionUnselected,
                  ]}
                  onPress={() => setInviteRole('admin')}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      {
                        color:
                          inviteRole === 'admin' ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleInviteMember}
                disabled={!inviteEmail.trim() || inviteMember.isPending}
              >
                <Text style={[styles.buttonText, { color: 'white' }]}>
                  {inviteMember.isPending ? 'Sending...' : 'Send Invite'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
