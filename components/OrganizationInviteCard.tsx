import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Users, Check, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganizationMembers } from '@/hooks/useOrganizations';
import { useAlert } from '@/contexts/CustomAlertContext';
import type { Notification } from '@/types/organization';

interface OrganizationInviteCardProps {
  notification: Notification;
}

export default function OrganizationInviteCard({
  notification,
}: OrganizationInviteCardProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const membershipId = notification.data?.membership_id;
  const orgName = notification.data?.organization_name;

  const { acceptInvite, rejectInvite } = useOrganizationMembers();

  const handleAccept = async () => {
    try {
      await acceptInvite.mutateAsync(membershipId);
      showAlert({
        title: 'Success',
        message: `Joined ${orgName}`,
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to accept invitation',
      });
    }
  };

  const handleReject = async () => {
    try {
      await rejectInvite.mutateAsync(membershipId);
      showAlert({
        title: 'Success',
        message: 'Invitation declined',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to decline invitation',
      });
    }
  };

  const isLoading = acceptInvite.isPending || rejectInvite.isPending;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.primary + '20' },
        ]}
      >
        <Users size={24} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {notification.title}
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {notification.message}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.rejectButton,
              { borderColor: colors.border },
            ]}
            onPress={handleReject}
            disabled={isLoading}
          >
            {rejectInvite.isPending ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <X size={18} color={colors.text} />
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  Decline
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleAccept}
            disabled={isLoading}
          >
            {acceptInvite.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={18} color="#fff" />
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  Accept
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  rejectButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
