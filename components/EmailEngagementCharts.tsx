import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '@/hooks/useTheme';
import {
  useEmailActivity,
  useDayOfWeekEngagement,
  useHourlyEngagement,
} from '@/hooks/useEmailAnalytics';

const screenWidth = Dimensions.get('window').width;

interface EmailEngagementChartsProps {
  dateRange: { start: Date; end: Date };
}

export default function EmailEngagementCharts({
  dateRange,
}: EmailEngagementChartsProps) {
  const { colors } = useTheme();

  const { data: dailyActivity, isLoading: dailyLoading } = useEmailActivity(
    dateRange.start,
    dateRange.end
  );
  const { data: dayOfWeekData, isLoading: dowLoading } =
    useDayOfWeekEngagement(dateRange);
  const { data: hourlyData, isLoading: hourlyLoading } =
    useHourlyEngagement(dateRange);

  // Prepare daily trend chart data
  const dailyChartData = useMemo(() => {
    if (!dailyActivity || dailyActivity.length === 0) return null;

    return {
      opened: dailyActivity.map((d) => ({ value: d.opened })),
      clicked: dailyActivity.map((d) => ({ value: d.clicked })),
      replied: dailyActivity.map((d) => ({ value: d.replied })),
      labels: dailyActivity.map((d) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
    };
  }, [dailyActivity]);

  // Prepare day of week bar chart data
  const dayOfWeekChartData = useMemo(() => {
    if (!dayOfWeekData || dayOfWeekData.length === 0) return null;

    return dayOfWeekData.map((d) => ({
      value: d.opened,
      label: d.dayName.substring(0, 3),
      frontColor: '#3B82F6',
    }));
  }, [dayOfWeekData]);

  // Prepare hour of day heatmap data
  const hourlyChartData = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return null;

    // Find max value for normalization
    const maxOpens = Math.max(...hourlyData.map((h) => h.opens));

    return hourlyData.map((h) => ({
      hour: h.hour,
      opens: h.opens,
      intensity: maxOpens > 0 ? h.opens / maxOpens : 0,
    }));
  }, [hourlyData]);

  if (dailyLoading || dowLoading || hourlyLoading) {
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Daily Engagement Trend */}
      {dailyChartData && dailyChartData.opened.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Daily Engagement Trend
          </Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: '#3B82F6' }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Opens
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Clicks
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: '#10B981' }]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  Replies
                </Text>
              </View>
            </View>
            <LineChart
              data={dailyChartData.opened}
              data2={dailyChartData.clicked}
              data3={dailyChartData.replied}
              height={220}
              width={screenWidth - 80}
              color="#3B82F6"
              color2="#8B5CF6"
              color3="#10B981"
              thickness={2}
              hideDataPoints={dailyChartData.opened.length > 15}
              curved
              areaChart={false}
              hideRules
              hideYAxisText={false}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              backgroundColor={colors.surface}
              noOfSections={4}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 9,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        </View>
      )}

      {/* Day of Week Analysis */}
      {dayOfWeekChartData && dayOfWeekChartData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Day of Week Analysis
          </Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.chartSubtitle, { color: colors.textSecondary }]}
            >
              Email opens by day of week
            </Text>
            <BarChart
              data={dayOfWeekChartData}
              height={200}
              width={screenWidth - 100}
              barWidth={32}
              spacing={16}
              roundedTop
              hideRules
              hideYAxisText={false}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              noOfSections={4}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 11,
              }}
            />
            {dayOfWeekData && (
              <View style={styles.insightBox}>
                <Text
                  style={[styles.insightLabel, { color: colors.textSecondary }]}
                >
                  Best Day:
                </Text>
                <Text style={[styles.insightValue, { color: colors.text }]}>
                  {
                    dayOfWeekData.reduce((best, current) =>
                      current.opened > best.opened ? current : best
                    ).dayName
                  }
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Hour of Day Heatmap */}
      {hourlyChartData && hourlyChartData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Optimal Send Times
          </Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text
              style={[styles.chartSubtitle, { color: colors.textSecondary }]}
            >
              Email opens by hour of day
            </Text>
            <View style={styles.heatmapContainer}>
              {hourlyChartData.map((item) => {
                const opacity = 0.2 + item.intensity * 0.8;
                const hour12 =
                  item.hour === 0
                    ? 12
                    : item.hour > 12
                    ? item.hour - 12
                    : item.hour;
                const ampm = item.hour < 12 ? 'AM' : 'PM';

                return (
                  <View key={item.hour} style={styles.heatmapItem}>
                    <View
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heatmapValue,
                          {
                            color:
                              item.intensity > 0.5 ? '#FFFFFF' : colors.text,
                          },
                        ]}
                      >
                        {item.opens}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.heatmapLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {hour12}
                      {ampm}
                    </Text>
                  </View>
                );
              })}
            </View>
            {hourlyData && (
              <View style={styles.insightBox}>
                <Text
                  style={[styles.insightLabel, { color: colors.textSecondary }]}
                >
                  Peak Hour:
                </Text>
                <Text style={[styles.insightValue, { color: colors.text }]}>
                  {(() => {
                    const peakHour = hourlyData.reduce((best, current) =>
                      current.opens > best.opens ? current : best
                    ).hour;
                    const hour12 =
                      peakHour === 0
                        ? 12
                        : peakHour > 12
                        ? peakHour - 12
                        : peakHour;
                    const ampm = peakHour < 12 ? 'AM' : 'PM';
                    return `${hour12}:00 ${ampm}`;
                  })()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Engagement Insights */}
      {dayOfWeekData && dayOfWeekData.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Engagement Insights
          </Text>
          <View
            style={[styles.insightCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.insightRow}>
              <Text
                style={[
                  styles.insightRowLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Average Open Rate
              </Text>
              <Text style={[styles.insightRowValue, { color: colors.text }]}>
                {(
                  dayOfWeekData.reduce((sum, d) => sum + d.openRate, 0) /
                  dayOfWeekData.length
                ).toFixed(1)}
                %
              </Text>
            </View>
            <View style={styles.insightRow}>
              <Text
                style={[
                  styles.insightRowLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Most Active Day
              </Text>
              <Text style={[styles.insightRowValue, { color: colors.text }]}>
                {
                  dayOfWeekData.reduce((best, current) =>
                    current.sent > best.sent ? current : best
                  ).dayName
                }
              </Text>
            </View>
            <View style={styles.insightRow}>
              <Text
                style={[
                  styles.insightRowLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Best Engagement Day
              </Text>
              <Text style={[styles.insightRowValue, { color: colors.text }]}>
                {
                  dayOfWeekData.reduce((best, current) =>
                    current.openRate > best.openRate ? current : best
                  ).dayName
                }
              </Text>
            </View>
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  chartSubtitle: {
    fontSize: 12,
    marginBottom: 12,
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
  heatmapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  heatmapItem: {
    alignItems: 'center',
    width: '14%',
  },
  heatmapCell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  heatmapLabel: {
    fontSize: 8,
    marginTop: 4,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  insightRowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightRowValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
