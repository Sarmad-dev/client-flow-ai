import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  SquareCheck as CheckSquare,
  MoveVertical as MoreVertical,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  last_contact_date: string | null;
  status: 'prospect' | 'active' | 'inactive' | 'closed';
  // Optional fields that might not be in the database
  tasksCount?: number;
}

interface ClientCardProps {
  client: Client;
  onPress?: () => void;
}

export function ClientCard({ client, onPress }: ClientCardProps) {
  const { colors } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'prospect':
        return colors.warning;
      case 'inactive':
        return colors.textSecondary;
      case 'closed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <User size={20} color="#FFFFFF" strokeWidth={2} />
        </View>

        <View style={styles.clientInfo}>
          <Text style={[styles.name, { color: colors.text }]}>
            {client?.name}
          </Text>
          <View style={styles.companyRow}>
            <Building size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.company, { color: colors.textSecondary }]}>
              {client?.company || 'No company'}
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(client?.status) },
            ]}
          />
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical
              size={20}
              color={colors.textSecondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contactInfo}>
        {client.email && (
          <View style={styles.contactItem}>
            <Mail size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {client.email}
            </Text>
          </View>
        )}

        {client.phone && (
          <View style={styles.contactItem}>
            <Phone size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {client.phone}
            </Text>
          </View>
        )}

        {client.address && (
          <View style={styles.contactItem}>
            <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {client.address}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.tasksInfo}>
          <CheckSquare size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.tasksText, { color: colors.text }]}>
            {client.tasksCount || 0} active tasks
          </Text>
        </View>

        {client.last_contact_date && (
          <Text style={[styles.lastContact, { color: colors.textSecondary }]}>
            Last contact:{' '}
            {new Date(client.last_contact_date).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  company: {
    fontSize: 14,
    fontWeight: '400',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreButton: {
    padding: 4,
  },
  contactInfo: {
    marginBottom: 16,
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tasksInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tasksText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastContact: {
    fontSize: 12,
    fontWeight: '400',
  },
});
