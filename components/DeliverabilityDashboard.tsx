import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Mail, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks/useTheme';
import {
  useDeliverabilityMetrics,
  useDeliverabilityTrends,
  useBounceDetails,
} from '@/hooks/useDeliverability';

const screenWidth = Dimensions.get('window').width;

interface DeliverabilityDashboardProps {
  dateRange?: { start: Date; end: Date };
}

export default function DeliverabilityDashboard({
  dateRange,
}: DeliverabilityDashboardProps) {
  const { colors } = useTheme();

  // Default to last 30 days if no date range provided
  const defaultDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  }, []);

  const effectiveDateRange = dateRange || defaultDateRange;

  const { data: metrics, isLoading: metricsLoading } =
    useDeliverabilityMetrics(effectiveDateRange);
  const { data: trends, isLoading: trendsLoading } = useDeliverabilityTrends(
    effectiveDateRange.start,
    effectiveDateRange.end
  );
  const { data: bounceDetails } = useBounceDetails(effectiveDateRange);

  // Check for high bounce rate warning (>5%)
  const showBounceWarning = metrics && metrics.bounceRate > 5;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) return null;
    return {
      sentData: trends.map((t) => ({ value: t.sent })),
      deliveredData: trends.map((t) => ({ value: t.delivered })),
      bouncedData: trends.map((t) => ({ value: t.bounced })),
    };
  }, [trends]);

  if (metricsLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading deliverability metrics...
        </Text>
      </View>
    );
  }

  if (!metrics) {
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

  const overviewCards = [
    {
      icon: Mail,
      title: 'Total Sent',
      value: metrics.totalSent.toString(),
      color: colors.primary,
      subtitle: 'emails',
    },
    {
      icon: CheckCircle,
      title: 'Delivery Rate',
      value: `${metrics.deliveryRate.toFixed(1)}%`,
      color: colors.success,
      subtitle: `${metrics.delivered} delivered`,
    },
    {
      icon: XCircle,
      title: 'Bounce Rate',
      value: `${metrics.bounceRate.toFixed(1)}%`,
      color: metrics.bounceRate > 5 ? colors.error : colors.warning,
      subtitle: `${metrics.bounced} bounced`,
    },
    {
      icon: AlertTriangle,
      title: 'Spam Rate',
      value: `${metrics.spamRate.toFixed(1)}%`,
      color: metrics.spamRate > 0.1 ? colors.error : colors.textSecondary,
      subtitle: `${metrics.spamComplaints} complaints`,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* High Bounce Rate Warning */}
      {showBounceWarning && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: `${colors.error}15` },
          ]}
        >
          <AlertTriangle size={20} color={colors.error} />
          <Text style={[styles.warningText, { color: colors.error }]}>
            High bounce rate detected ({metrics.bounceRate.toFixed(1)}%). Review
            your email list quality.
          </Text>
        </View>
      )}

      {/* Overview Cards */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Overview
        </Text>
        <View style={styles.cardsGrid}>
          {overviewCards.map((card, index) => (
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

      {/* Bounce Type Breakdown */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Bounce Breakdown
        </Text>
        <View style={[styles.bounceCard, { backgroundColor: colors.surface }]}>
          <View style={styles.bounceRow}>
            <View style={styles.bounceInfo}>
              <View
                style={[styles.bounceDot, { backgroundColor: colors.error }]}
              />
              <Text style={[styles.bounceLabel, { color: colors.text }]}>
                Hard Bounces
              </Text>
            </View>
            <Text style={[styles.bounceValue, { color: colors.text }]}>
              {metrics.hardBounces}
            </Text>
          </View>
          <View style={styles.bounceRow}>
            <View style={styles.bounceInfo}>
              <View
                style={[styles.bounceDot, { backgroundColor: colors.warning }]}
              />
              <Text style={[styles.bounceLabel, { color: colors.text }]}>
                Soft Bounces
              </Text>
            </View>
            <Text style={[styles.bounceValue, { color: colors.text }]}>
              {metrics.softBounces}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.bounceRow}>
            <Text style={[styles.bounceTotal, { color: colors.textSecondary }]}>
              Total Bounces
            </Text>
            <Text style={[styles.bounceValue, { color: colors.text }]}>
              {metrics.bounced}
            </Text>
          </View>
        </View>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          Hard bounces indicate invalid email addresses. Soft bounces are
          temporary delivery issues.
        </Text>
      </View>

      {/* Daily Trends Chart */}
      {!trendsLoading && chartData && trends && trends.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Daily Trends
          </Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Sent
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: colors.success },
                  ]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Delivered
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.error }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Bounced
                </Text>
              </View>
            </View>
            <LineChart
              data={chartData.sentData}
              data2={chartData.deliveredData}
              data3={chartData.bouncedData}
              height={200}
              width={screenWidth - 80}
              color={colors.primary}
              color2={colors.success}
              color3={colors.error}
              thickness={2}
              hideDataPoints
              curved
              areaChart={false}
              hideRules
              hideYAxisText
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              backgroundColor={colors.surface}
              noOfSections={4}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 10,
              }}
            />
          </View>
        </View>
      )}

      {/* Recent Bounces */}
      {bounceDetails && bounceDetails.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Bounces
          </Text>
          {bounceDetails.slice(0, 5).map((bounce) => (
            <View
              key={bounce.id}
              style={[
                styles.bounceDetailCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.bounceDetailHeader}>
                <View
                  style={[
                    styles.bounceTypeBadge,
                    {
                      backgroundColor:
                        bounce.bounceType === 'hard'
                          ? `${colors.error}15`
                          : `${colors.warning}15`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bounceTypeBadgeText,
                      {
                        color:
                          bounce.bounceType === 'hard'
                            ? colors.error
                            : colors.warning,
                      },
                    ]}
                  >
                    {bounce.bounceType.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[styles.bounceDate, { color: colors.textSecondary }]}
                >
                  {new Date(bounce.occurredAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.bounceEmail, { color: colors.text }]}>
                {bounce.email}
              </Text>
              {bounce.emailSubject && (
                <Text
                  style={[
                    styles.bounceSubject,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {bounce.emailSubject}
                </Text>
              )}
              {bounce.reason && (
                <Text
                  style={[styles.bounceReason, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {bounce.reason}
                </Text>
              )}
            </View>
          ))}
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
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
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
  bounceCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bounceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bounceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bounceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bounceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  bounceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  bounceTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bounceDetailCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bounceDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bounceTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bounceTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bounceDate: {
    fontSize: 12,
  },
  bounceEmail: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bounceSubject: {
    fontSize: 12,
    marginBottom: 4,
  },
  bounceReason: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
