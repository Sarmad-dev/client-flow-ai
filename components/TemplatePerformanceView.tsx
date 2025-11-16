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
  FileText,
  Eye,
  MousePointer,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTemplatePerformance } from '@/hooks/useEmailAnalytics';

type SortBy = 'usage' | 'openRate' | 'clickRate' | 'replyRate';

interface TemplatePerformanceViewProps {
  dateRange?: { start: Date; end: Date };
}

export default function TemplatePerformanceView({
  dateRange,
}: TemplatePerformanceViewProps) {
  const { colors } = useTheme();
  const [sortBy, setSortBy] = useState<SortBy>('usage');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const { data: templates, isLoading } = useTemplatePerformance(dateRange);

  // Sort templates based on selected criteria
  const sortedTemplates = useMemo(() => {
    if (!templates) return [];

    const sorted = [...templates];
    switch (sortBy) {
      case 'openRate':
        sorted.sort((a, b) => b.openRate - a.openRate);
        break;
      case 'clickRate':
        sorted.sort((a, b) => b.clickRate - a.clickRate);
        break;
      case 'replyRate':
        sorted.sort((a, b) => b.replyRate - a.replyRate);
        break;
      case 'usage':
      default:
        sorted.sort((a, b) => b.usageCount - a.usageCount);
        break;
    }

    return sorted;
  }, [templates, sortBy]);

  // Calculate average metrics for comparison
  const averageMetrics = useMemo(() => {
    if (!templates || templates.length === 0) return null;

    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
    const avgOpenRate =
      templates.reduce((sum, t) => sum + t.openRate, 0) / templates.length;
    const avgClickRate =
      templates.reduce((sum, t) => sum + t.clickRate, 0) / templates.length;
    const avgReplyRate =
      templates.reduce((sum, t) => sum + t.replyRate, 0) / templates.length;

    return {
      totalUsage,
      avgOpenRate,
      avgClickRate,
      avgReplyRate,
    };
  }, [templates]);

  const toggleTemplateSelection = (templateId: string) => {
    if (selectedTemplates.includes(templateId)) {
      setSelectedTemplates(selectedTemplates.filter((id) => id !== templateId));
    } else {
      if (selectedTemplates.length < 3) {
        setSelectedTemplates([...selectedTemplates, templateId]);
      }
    }
  };

  const getPerformanceIndicator = (value: number, average: number) => {
    const diff = value - average;
    if (Math.abs(diff) < 1) return { icon: Minus, color: colors.textSecondary };
    if (diff > 0) return { icon: TrendingUp, color: colors.success };
    return { icon: TrendingDown, color: colors.error };
  };

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
          Loading template performance...
        </Text>
      </View>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <FileText size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No template performance data available
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Start using email templates to see performance metrics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Template Performance
        </Text>
        <TouchableOpacity
          style={[
            styles.compareModeButton,
            {
              backgroundColor: compareMode ? colors.primary : colors.surface,
            },
          ]}
          onPress={() => {
            setCompareMode(!compareMode);
            if (!compareMode) setSelectedTemplates([]);
          }}
        >
          <Text
            style={[
              styles.compareModeText,
              {
                color: compareMode ? '#FFFFFF' : colors.text,
              },
            ]}
          >
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>
          Sort by:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortButtons}
        >
          {[
            { key: 'usage' as SortBy, label: 'Usage' },
            { key: 'openRate' as SortBy, label: 'Open Rate' },
            { key: 'clickRate' as SortBy, label: 'Click Rate' },
            { key: 'replyRate' as SortBy, label: 'Reply Rate' },
          ].map((option) => {
            const isActive = sortBy === option.key;
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
        </ScrollView>
      </View>

      {/* Average Metrics Summary */}
      {averageMetrics && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Average Performance
          </Text>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <FileText size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {averageMetrics.totalUsage}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Total Uses
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Eye size={16} color="#3B82F6" strokeWidth={2} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {averageMetrics.avgOpenRate.toFixed(1)}%
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Avg Open
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MousePointer size={16} color="#8B5CF6" strokeWidth={2} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {averageMetrics.avgClickRate.toFixed(1)}%
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Avg Click
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MessageSquare size={16} color="#10B981" strokeWidth={2} />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {averageMetrics.avgReplyRate.toFixed(1)}%
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: colors.textSecondary }]}
                >
                  Avg Reply
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Template List */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Templates
        </Text>
        {compareMode && (
          <Text style={[styles.compareHint, { color: colors.textSecondary }]}>
            Select up to 3 templates to compare
          </Text>
        )}
        {sortedTemplates.map((template) => {
          const isSelected = selectedTemplates.includes(template.templateId);
          const openIndicator = averageMetrics
            ? getPerformanceIndicator(
                template.openRate,
                averageMetrics.avgOpenRate
              )
            : null;
          const clickIndicator = averageMetrics
            ? getPerformanceIndicator(
                template.clickRate,
                averageMetrics.avgClickRate
              )
            : null;
          const replyIndicator = averageMetrics
            ? getPerformanceIndicator(
                template.replyRate,
                averageMetrics.avgReplyRate
              )
            : null;

          return (
            <TouchableOpacity
              key={template.templateId}
              style={[
                styles.templateCard,
                { backgroundColor: colors.surface },
                isSelected && {
                  borderWidth: 2,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() =>
                compareMode && toggleTemplateSelection(template.templateId)
              }
              disabled={!compareMode}
            >
              <View style={styles.templateHeader}>
                <View style={styles.templateTitleContainer}>
                  <FileText size={18} color={colors.primary} strokeWidth={2} />
                  <Text
                    style={[styles.templateName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {template.templateName}
                  </Text>
                </View>
                <View
                  style={[
                    styles.usageBadge,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Text style={[styles.usageText, { color: colors.primary }]}>
                    {template.usageCount} uses
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <View style={styles.metricHeader}>
                    <Eye size={14} color="#3B82F6" strokeWidth={2} />
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Opens
                    </Text>
                    {openIndicator && (
                      <openIndicator.icon
                        size={12}
                        color={openIndicator.color}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {template.openRate.toFixed(1)}%
                  </Text>
                  <Text
                    style={[
                      styles.metricCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {template.opens} opens
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <View style={styles.metricHeader}>
                    <MousePointer size={14} color="#8B5CF6" strokeWidth={2} />
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Clicks
                    </Text>
                    {clickIndicator && (
                      <clickIndicator.icon
                        size={12}
                        color={clickIndicator.color}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {template.clickRate.toFixed(1)}%
                  </Text>
                  <Text
                    style={[
                      styles.metricCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {template.clicks} clicks
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <View style={styles.metricHeader}>
                    <MessageSquare size={14} color="#10B981" strokeWidth={2} />
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Replies
                    </Text>
                    {replyIndicator && (
                      <replyIndicator.icon
                        size={12}
                        color={replyIndicator.color}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {template.replyRate.toFixed(1)}%
                  </Text>
                  <Text
                    style={[
                      styles.metricCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {template.replies} replies
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comparison View */}
      {compareMode && selectedTemplates.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Comparison
          </Text>
          <View
            style={[styles.comparisonCard, { backgroundColor: colors.surface }]}
          >
            {selectedTemplates.map((templateId) => {
              const template = templates.find(
                (t) => t.templateId === templateId
              );
              if (!template) return null;

              return (
                <View key={templateId} style={styles.comparisonRow}>
                  <Text
                    style={[styles.comparisonName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {template.templateName}
                  </Text>
                  <View style={styles.comparisonMetrics}>
                    <Text
                      style={[styles.comparisonMetric, { color: '#3B82F6' }]}
                    >
                      {template.openRate.toFixed(1)}%
                    </Text>
                    <Text
                      style={[styles.comparisonMetric, { color: '#8B5CF6' }]}
                    >
                      {template.clickRate.toFixed(1)}%
                    </Text>
                    <Text
                      style={[styles.comparisonMetric, { color: '#10B981' }]}
                    >
                      {template.replyRate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
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
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  compareModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  compareModeText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  sortButtonText: {
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
  compareHint: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
  },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  templateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  usageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  usageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricCount: {
    fontSize: 10,
  },
  comparisonCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  comparisonName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  comparisonMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  comparisonMetric: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
});
