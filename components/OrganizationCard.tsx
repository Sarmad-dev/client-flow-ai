import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Users,
  ChevronRight,
  Crown,
  Shield,
  UserCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { Organization } from '@/types/organization';

interface OrganizationCardProps {
  organization: Organization;
  onPress: () => void;
}

export default function OrganizationCard({
  organization,
  onPress,
}: OrganizationCardProps) {
  const { colors } = useTheme();
  const memberCount = organization.member_count || 0;
  const userRole = organization.user_role;

  const getRoleIcon = () => {
    switch (userRole) {
      case 'owner':
        return <Crown size={14} color={colors.primary} />;
      case 'admin':
        return <Shield size={14} color={colors.primary} />;
      case 'member':
        return <UserCircle size={14} color={colors.textSecondary} />;
      default:
        return null;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Member';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: colors.text }]}>
              {organization.name}
            </Text>
            {userRole && (
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor:
                      userRole === 'owner'
                        ? colors.primary + '20'
                        : colors.surface,
                  },
                ]}
              >
                {getRoleIcon()}
                <Text
                  style={[
                    styles.roleText,
                    {
                      color:
                        userRole === 'owner'
                          ? colors.primary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {getRoleLabel()}
                </Text>
              </View>
            )}
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        {organization.description && (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {organization.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.stat}>
            <Users size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
});
