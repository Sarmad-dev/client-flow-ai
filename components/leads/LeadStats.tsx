import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Target, TrendingUp, Users } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface LeadStatsProps {
  total: number;
  newCount: number;
  qualifiedCount: number;
  convertedCount: number;
}

export function LeadStats({ total, newCount, qualifiedCount, convertedCount }: LeadStatsProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.statsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Target size={20} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.statValue, { color: colors.text }]}>{total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Leads</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <TrendingUp size={20} color={colors.warning} strokeWidth={2} />
          <Text style={[styles.statValue, { color: colors.text }]}>{newCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Users size={20} color={colors.secondary} strokeWidth={2} />
          <Text style={[styles.statValue, { color: colors.text }]}>{qualifiedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Qualified</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Target size={20} color={colors.success} strokeWidth={2} />
          <Text style={[styles.statValue, { color: colors.text }]}>{convertedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Converted</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: { marginBottom: 24 },
  statsScroll: { paddingHorizontal: 24, gap: 16 },
  statCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
});


