import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Mail,
  CheckCircle,
  Eye,
  MousePointer,
  MessageSquare,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useEmailAnalytics } from '@/hooks/useEmailAnalytics';

interface EmailAnalyticsDashboardProps {
  onDateRangePress?: () => void;
  dateRange?: { start: Date; end: Date };
}

export default function EmailAnalyticsDashboard({
  onDateRangePress,
  dateRange: externalDateRange,
}: EmailAnalyticsDashboardProps) {
  const { colors } = useTheme();

  // Use external date range if provided, otherwise default to last 30 days
  const dateRange = useMemo(() => {
    if (externalDateRange) return externalDateRange;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  }, [externalDateRange]);

  const { data: analytics, isLoading } = useEmailAnalytics(dateRange);

  const dateRangeText = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };
    return `${dateRange.start.toLocaleDateString(
      'en-US',
      options
    )} - ${dateRange.end.toLocaleDateString('en-US', options)}`;
  }, [dateRange]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <Mail size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No email data available
        </Text>
      </View>
    );
  }

  const metricCards = [
    {
      icon: Mail,
      title: 'Sent',
      value: analytics.totalSent.toString(),
      color: colors.primary,
      subtitle: 'total emails',
    },
    {
      icon: CheckCircle,
      title: 'Delivered',
      value: analytics.delivered.toString(),
      percentage: analytics.deliveryRate,
      color: colors.success,
      subtitle: `${analytics.deliveryRate.toFixed(1)}% rate`,
    },
    {
      icon: Eye,
      title: 'Opened',
      value: analytics.opened.toString(),
      percentage: analytics.openRate,
      color: '#3B82F6',
      subtitle: `${analytics.openRate.toFixed(1)}% rate`,
    },
    {
      icon: MousePointer,
      title: 'Clicked',
      value: analytics.clicked.toString(),
      percentage: analytics.clickRate,
      color: '#8B5CF6',
      subtitle: `${analytics.clickRate.toFixed(1)}% rate`,
    },
    {
      icon: MessageSquare,
      title: 'Replied',
      value: analytics.replied.toString(),
      percentage: analytics.replyRate,
      color: '#10B981',
      subtitle: `${analytics.replyRate.toFixed(1)}% rate`,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Range Selector */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Email Analytics
        </Text>
        <TouchableOpacity
          style={[styles.dateRangeButton, { backgroundColor: colors.surface }]}
          onPress={onDateRangePress}
        >
          <Calendar size={16} color={colors.primary} />
          <Text style={[styles.dateRangeText, { color: colors.text }]}>
            {dateRangeText}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Overview Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Overview
        </Text>
        <View style={styles.cardsGrid}>
          {metricCards.map((card, index) => (
            <View
              key={index}
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: `${card.color}15` },
                ]}
              >
                <card.icon size={20} color={card.color} strokeWidth={2} />
              </View>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {card.value}
              </Text>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
                {card.title}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textSecondary }]}
              >
                {card.subtitle}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Key Metrics Summary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Performance Summary
        </Text>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Delivery Rate
            </Text>
            <View style={styles.summaryValueContainer}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {analytics.deliveryRate.toFixed(1)}%
              </Text>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: `${colors.success}20` },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.success,
                      width: `${Math.min(analytics.deliveryRate, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Open Rate
            </Text>
            <View style={styles.summaryValueContainer}>
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
                {analytics.openRate.toFixed(1)}%
              </Text>
              <View
                style={[styles.progressBar, { backgroundColor: '#3B82F620' }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: '#3B82F6',
                      width: `${Math.min(analytics.openRate, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Click Rate
            </Text>
            <View style={styles.summaryValueContainer}>
              <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>
                {analytics.clickRate.toFixed(1)}%
              </Text>
              <View
                style={[styles.progressBar, { backgroundColor: '#8B5CF620' }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: '#8B5CF6',
                      width: `${Math.min(analytics.clickRate, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Reply Rate
            </Text>
            <View style={styles.summaryValueContainer}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {analytics.replyRate.toFixed(1)}%
              </Text>
              <View
                style={[styles.progressBar, { backgroundColor: '#10B98120' }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: '#10B981',
                      width: `${Math.min(analytics.replyRate, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Engagement Funnel */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Engagement Funnel
        </Text>
        <View style={[styles.funnelCard, { backgroundColor: colors.surface }]}>
          <View style={styles.funnelStep}>
            <View style={styles.funnelStepHeader}>
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>
                Sent
              </Text>
              <Text style={[styles.funnelStepValue, { color: colors.text }]}>
                {analytics.totalSent}
              </Text>
            </View>
            <View
              style={[
                styles.funnelBar,
                { backgroundColor: colors.primary, width: '100%' },
              ]}
            />
          </View>

          <View style={styles.funnelStep}>
            <View style={styles.funnelStepHeader}>
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>
                Delivered
              </Text>
              <Text style={[styles.funnelStepValue, { color: colors.text }]}>
                {analytics.delivered}
              </Text>
            </View>
            <View
              style={[
                styles.funnelBar,
                {
                  backgroundColor: colors.success,
                  width: `${analytics.deliveryRate}%`,
                },
              ]}
            />
          </View>

          <View style={styles.funnelStep}>
            <View style={styles.funnelStepHeader}>
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>
                Opened
              </Text>
              <Text style={[styles.funnelStepValue, { color: colors.text }]}>
                {analytics.opened}
              </Text>
            </View>
            <View
              style={[
                styles.funnelBar,
                {
                  backgroundColor: '#3B82F6',
                  width: `${(analytics.opened / analytics.totalSent) * 100}%`,
                },
              ]}
            />
          </View>

          <View style={styles.funnelStep}>
            <View style={styles.funnelStepHeader}>
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>
                Clicked
              </Text>
              <Text style={[styles.funnelStepValue, { color: colors.text }]}>
                {analytics.clicked}
              </Text>
            </View>
            <View
              style={[
                styles.funnelBar,
                {
                  backgroundColor: '#8B5CF6',
                  width: `${(analytics.clicked / analytics.totalSent) * 100}%`,
                },
              ]}
            />
          </View>

          <View style={styles.funnelStep}>
            <View style={styles.funnelStepHeader}>
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>
                Replied
              </Text>
              <Text style={[styles.funnelStepValue, { color: colors.text }]}>
                {analytics.replied}
              </Text>
            </View>
            <View
              style={[
                styles.funnelBar,
                {
                  backgroundColor: '#10B981',
                  width: `${(analytics.replied / analytics.totalSent) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  summaryValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 50,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  funnelCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  funnelStep: {
    marginBottom: 16,
  },
  funnelStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  funnelStepLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  funnelStepValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  funnelBar: {
    height: 24,
    borderRadius: 6,
    minWidth: 40,
  },
});
