import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building, Mail, Phone, MapPin, Star, ArrowRight, Target } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  business_type: string;
  website: string;
  rating: number;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  source: 'manual' | 'map_search' | 'referral' | 'website';
  last_contact_date: string;
  created_at: string;
}

interface LeadCardProps {
  lead: Lead;
  onPress?: () => void;
  onConvert?: () => void;
}

export function LeadCard({ lead, onPress, onConvert }: LeadCardProps) {
  const { colors } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return colors.primary;
      case 'contacted': return colors.warning;
      case 'qualified': return colors.secondary;
      case 'converted': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'map_search': return MapPin;
      case 'referral': return Target;
      case 'website': return Building;
      default: return Target;
    }
  };

  const SourceIcon = getSourceIcon(lead.source);

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Building size={20} color="#FFFFFF" strokeWidth={2} />
        </View>
        
        <View style={styles.leadInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{lead.name}</Text>
          <View style={styles.companyRow}>
            <Building size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.company, { color: colors.textSecondary }]}>
              {lead.company}
            </Text>
          </View>
          {lead.business_type && (
            <Text style={[styles.businessType, { color: colors.textSecondary }]}>
              {lead.business_type}
            </Text>
          )}
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(lead.status)}15` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
              {lead.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.contactInfo}>
        {lead.email && (
          <View style={styles.contactItem}>
            <Mail size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {lead.email}
            </Text>
          </View>
        )}
        
        {lead.phone && (
          <View style={styles.contactItem}>
            <Phone size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {lead.phone}
            </Text>
          </View>
        )}
        
        {lead.address && (
          <View style={styles.contactItem}>
            <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>
              {lead.address}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.sourceInfo}>
          <SourceIcon size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.sourceText, { color: colors.text }]}>
            {lead.source.replace('_', ' ')}
          </Text>
          {lead.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Star size={14} color={colors.warning} strokeWidth={2} fill={colors.warning} />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {lead.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        
        {lead.status !== 'converted' && lead.status !== 'rejected' && (
          <TouchableOpacity 
            style={[styles.convertButton, { backgroundColor: colors.success }]}
            onPress={(e) => {
              e.stopPropagation();
              onConvert?.();
            }}
          >
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.convertText}>Convert</Text>
          </TouchableOpacity>
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
  leadInfo: {
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
    marginBottom: 2,
  },
  company: {
    fontSize: 14,
    fontWeight: '400',
  },
  businessType: {
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  convertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});