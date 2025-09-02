import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LeadCard } from '@/components/LeadCard';
import { Target } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface LeadListProps<TLead> {
  leads: TLead[];
  onPress: (id: string) => void;
  onConvert: (id: string) => void;
  getId: (lead: TLead) => string;
}

export function LeadList<TLead>({
  leads,
  onPress,
  onConvert,
  getId,
}: LeadListProps<TLead>) {
  const { colors } = useTheme();
  return (
    <View style={styles.leadList}>
      {leads.map((lead: any) => (
        <LeadCard
          key={getId(lead)}
          lead={lead}
          onPress={() => onPress(getId(lead))}
          onConvert={() => onConvert(getId(lead))}
        />
      ))}
      {leads.length === 0 && (
        <View style={styles.emptyState}>
          <Target size={48} color={colors.textSecondary} strokeWidth={1} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No leads found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start by adding leads manually or discover them on the map
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  leadList: { paddingHorizontal: 24, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
