import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useSequenceAnalytics,
  SequenceAnalytics,
} from '@/hooks/useSequenceAnalytics';
import {
  Users,
  Mail,
  CheckCircle,
  TrendingUp,
  MousePointer,
  MessageCircle,
} from 'lucide-react-native';

interface SequenceAnalyticsViewProps {
  sequenceId?: string | null;
}

export default function SequenceAnalyticsView({
  sequenceId,
}: SequenceAnalyticsViewProps) {
  const { colors } = useTheme();
  const { data: analytics = [], isLoading } = useSequenceAnalytics(sequenceId);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (analytics.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No analytics data available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {analytics.map((data) => (
        <SequenceAnalyticsCard
          key={data.sequence_id}
          data={data}
          colors={colors}
        />
      ))}
    </ScrollView>
  );
}

interface SequenceAnalyticsCardProps {
  data: SequenceAnalytics;
  colors: any;
}

function SequenceAnalyticsCard({ data, colors }: SequenceAnalyticsCardProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {data.sequence_name}
      </Text>

      {/* Enrollment Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Enrollments
        </Text>
        <View style={styles.statsGrid}>
          <StatItem
            icon={<Users size={20} color={colors.primary} />}
            label="Total"
            value={data.enrollment_count}
            colors={colors}
          />
          <StatItem
            icon={<TrendingUp size={20} color={colors.success} />}
            label="Active"
            value={data.active_count}
            colors={colors}
          />
          <StatItem
            icon={<CheckCircle size={20} color={colors.success} />}
            label="Completed"
            value={data.completed_count}
            colors={colors}
          />
          <StatItem
            icon={<Users size={20} color={colors.textSecondary} />}
            label="Completion Rate"
            value={`${data.completion_rate}%`}
            colors={colors}
          />
        </View>
      </View>

      {/* Email Performance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Email Performance
        </Text>
        <View style={styles.statsGrid}>
          <StatItem
            icon={<Mail size={20} color={colors.primary} />}
            label="Sent"
            value={data.emails_sent}
            colors={colors}
          />
          <StatItem
            icon={<Mail size={20} color={colors.success} />}
            label="Open Rate"
            value={`${data.open_rate}%`}
            colors={colors}
          />
          <StatItem
            icon={<MousePointer size={20} color={colors.primary} />}
            label="Click Rate"
            value={`${data.click_rate}%`}
            colors={colors}
          />
          <StatItem
            icon={<MessageCircle size={20} color={colors.success} />}
            label="Reply Rate"
            value={`${data.reply_rate}%`}
            colors={colors}
          />
        </View>
      </View>
    </View>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colors: any;
}

function StatItem({ icon, label, value, colors }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      {icon}
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
