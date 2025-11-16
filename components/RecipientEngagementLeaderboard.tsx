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
  Trophy,
  Eye,
  MousePointer,
  MessageSquare,
  TrendingUp,
  User,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useRecipientEngagement } from '@/hooks/useEmailAnalytics';

type SortBy = 'score' | 'opens' | 'clicks' | 'replies';

interface RecipientEngagementLeaderboardProps {
  dateRange?: { start: Date; end: Date };
  limit?: number;
}

export default function RecipientEngagementLeaderboard({
  dateRange,
  limit = 20,
}: RecipientEngagementLeaderboardProps) {
  const { colors } = useTheme();
  const [sortBy, setSortBy] = useState<SortBy>('score');

  const { data: recipients, isLoading } = useRecipientEngagement(dateRange);

  // Sort recipients based on selected criteria
  const sortedRecipients = useMemo(() => {
    if (!recipients) return [];

    const sorted = [...recipients];
    switch (sortBy) {
      case 'opens':
        sorted.sort((a, b) => b.opens - a.opens);
        break;
      case 'clicks':
        sorted.sort((a, b) => b.clicks - a.clicks);
        break;
      case 'replies':
        sorted.sort((a, b) => b.replies - a.replies);
        break;
      case 'score':
      default:
        sorted.sort((a, b) => b.engagementScore - a.engagementScore);
        break;
    }

    return sorted.slice(0, limit);
  }, [recipients, sortBy, limit]);

  const sortOptions: Array<{ key: SortBy; label: string; icon: any }> = [
    { key: 'score', label: 'Score', icon: TrendingUp },
    { key: 'opens', label: 'Opens', icon: Eye },
    { key: 'clicks', label: 'Clicks', icon: MousePointer },
    { key: 'replies', label: 'Replies', icon: MessageSquare },
  ];

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
          Loading engagement data...
        </Text>
      </View>
    );
  }

  if (!recipients || recipients.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <User size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No recipient engagement data available
        </Text>
      </View>
    );
  }

  const getRankColor = (index: number) => {
    if (index === 0) return '#FFD700'; // Gold
    if (index === 1) return '#C0C0C0'; // Silver
    if (index === 2) return '#CD7F32'; // Bronze
    return colors.textSecondary;
  };

  const getRankIcon = (index: number) => {
    if (index < 3) return Trophy;
    return null;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Top Engaged Recipients
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Ranked by engagement activity
        </Text>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>
          Sort by:
        </Text>
        <View style={styles.sortButtons}>
          {sortOptions.map((option) => {
            const isActive = sortBy === option.key;
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setSortBy(option.key)}
              >
                <Icon
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.sortButtonText,
                    {
                      color: isActive ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Leaderboard */}
      <View style={styles.leaderboard}>
        {sortedRecipients.map((recipient, index) => {
          const RankIcon = getRankIcon(index);
          const rankColor = getRankColor(index);

          return (
            <View
              key={recipient.email}
              style={[
                styles.recipientCard,
                { backgroundColor: colors.surface },
                index < 3 && styles.topRecipientCard,
              ]}
            >
              {/* Rank */}
              <View style={styles.rankContainer}>
                {RankIcon ? (
                  <RankIcon size={20} color={rankColor} strokeWidth={2} />
                ) : (
                  <Text style={[styles.rankNumber, { color: rankColor }]}>
                    {index + 1}
                  </Text>
                )}
              </View>

              {/* Recipient Info */}
              <View style={styles.recipientInfo}>
                <Text
                  style={[styles.recipientName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {recipient.displayName || recipient.email}
                </Text>
                {recipient.displayName && (
                  <Text
                    style={[
                      styles.recipientEmail,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {recipient.email}
                  </Text>
                )}
                <Text
                  style={[
                    styles.recipientStats,
                    { color: colors.textSecondary },
                  ]}
                >
                  {recipient.totalEmails} emails sent
                </Text>
              </View>

              {/* Engagement Metrics */}
              <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                  <Eye size={14} color="#3B82F6" strokeWidth={2} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {recipient.opens}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <MousePointer size={14} color="#8B5CF6" strokeWidth={2} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {recipient.clicks}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <MessageSquare size={14} color="#10B981" strokeWidth={2} />
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {recipient.replies}
                  </Text>
                </View>
              </View>

              {/* Engagement Score */}
              <View
                style={[
                  styles.scoreContainer,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <TrendingUp size={12} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.scoreValue, { color: colors.primary }]}>
                  {recipient.engagementScore}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.surface }]}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>
          Engagement Score
        </Text>
        <Text style={[styles.legendText, { color: colors.textSecondary }]}>
          Opens × 1 + Clicks × 2 + Replies × 3
        </Text>
        <View style={styles.legendMetrics}>
          <View style={styles.legendMetricItem}>
            <Eye size={14} color="#3B82F6" strokeWidth={2} />
            <Text
              style={[styles.legendMetricText, { color: colors.textSecondary }]}
            >
              Opens
            </Text>
          </View>
          <View style={styles.legendMetricItem}>
            <MousePointer size={14} color="#8B5CF6" strokeWidth={2} />
            <Text
              style={[styles.legendMetricText, { color: colors.textSecondary }]}
            >
              Clicks
            </Text>
          </View>
          <View style={styles.legendMetricItem}>
            <MessageSquare size={14} color="#10B981" strokeWidth={2} />
            <Text
              style={[styles.legendMetricText, { color: colors.textSecondary }]}
            >
              Replies
            </Text>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  sortContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboard: {
    paddingHorizontal: 24,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topRecipientCard: {
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  recipientInfo: {
    flex: 1,
    marginRight: 12,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  recipientEmail: {
    fontSize: 11,
    marginBottom: 2,
  },
  recipientStats: {
    fontSize: 10,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginRight: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  legendText: {
    fontSize: 12,
    marginBottom: 12,
  },
  legendMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  legendMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendMetricText: {
    fontSize: 11,
  },
});
