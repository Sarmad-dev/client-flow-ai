import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  Clock,
  CheckSquare,
  AlertTriangle,
  Users,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasks';
import TaskOptimization from '@/components/tasks/TaskOptimization';
import {
  LineChart,
  BarChart,
  PieChart as GiftedPieChart,
} from 'react-native-gifted-charts';
import type { TaskFilters } from '@/types/task-management';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64;

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface AnalyticsFilters extends TaskFilters {
  date_range?: DateRange;
}

interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByClient: Record<string, number>;
  completionTrend: Array<{ date: string; completed: number; created: number }>;
  timeSpentByDay: Array<{ date: string; hours: number }>;
  productivityScore: number;
}

const DATE_RANGES: DateRange[] = [
  {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 7 days',
  },
  {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 30 days',
  },
  {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 3 months',
  },
  {
    start: new Date(new Date().getFullYear(), 0, 1),
    end: new Date(),
    label: 'This year',
  },
];

export default function TaskAnalyticsScreen() {
  const { colors } = useTheme();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(
    DATE_RANGES[1]
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    date_range: selectedDateRange,
  });

  const tasksQuery = useTasks();
  const tasks = tasksQuery.data?.filter((task) => !task.parent_task_id) ?? [];

  // Calculate analytics data
  const analytics = useMemo((): TaskAnalytics => {
    const filteredTasks = tasks.filter((task) => {
      const taskDate = new Date(task.created_at);
      const inDateRange =
        taskDate >= selectedDateRange.start &&
        taskDate <= selectedDateRange.end;

      if (!inDateRange) return false;

      // Apply additional filters
      if (filters.status && !filters.status.includes(task.status as any))
        return false;
      if (filters.priority && !filters.priority.includes(task.priority as any))
        return false;
      if (filters.client_id && filters.client_id.length > 0) {
        if (!task.client_id || !filters.client_id.includes(task.client_id))
          return false;
      }

      return true;
    });

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(
      (t) => t.status === 'completed'
    ).length;
    const pendingTasks = filteredTasks.filter(
      (t) => t.status === 'pending'
    ).length;
    const overdueTasks = filteredTasks.filter((t) => {
      return (
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        t.status !== 'completed'
      );
    }).length;

    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time
    const completedTasksWithDates = filteredTasks.filter(
      (t) => t.status === 'completed' && t.created_at && t.updated_at
    );

    const averageCompletionTime =
      completedTasksWithDates.length > 0
        ? completedTasksWithDates.reduce((acc, task) => {
            const created = new Date(task.created_at);
            const completed = new Date(task.updated_at);
            return acc + (completed.getTime() - created.getTime());
          }, 0) /
          completedTasksWithDates.length /
          (1000 * 60 * 60 * 24) // Convert to days
        : 0;

    // Group by priority
    const tasksByPriority = filteredTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by status
    const tasksByStatus = filteredTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by client
    const tasksByClient = filteredTasks.reduce((acc, task) => {
      const clientName =
        task.clients?.name || task.clients?.company || 'No Client';
      acc[clientName] = (acc[clientName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate completion trend data
    const completionTrend = [];
    const days = Math.ceil(
      (selectedDateRange.end.getTime() - selectedDateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(
        selectedDateRange.start.getTime() + i * 24 * 60 * 60 * 1000
      );
      const dateStr = date.toISOString().split('T')[0];

      const completed = filteredTasks.filter(
        (t) =>
          t.status === 'completed' &&
          t.updated_at &&
          new Date(t.updated_at).toISOString().split('T')[0] === dateStr
      ).length;

      const created = filteredTasks.filter(
        (t) => new Date(t.created_at).toISOString().split('T')[0] === dateStr
      ).length;

      completionTrend.push({
        date: dateStr,
        completed,
        created,
      });
    }

    // Generate time spent data (mock data since we don't have actual time tracking yet)
    const timeSpentByDay = completionTrend.map((item) => ({
      date: item.date,
      hours: item.completed * 2 + Math.random() * 3, // Mock calculation
    }));

    // Calculate productivity score
    const productivityScore = Math.min(
      100,
      Math.round(
        completionRate * 0.4 +
          Math.max(0, 100 - overdueTasks * 10) * 0.3 +
          Math.min(100, (completedTasks / Math.max(1, days)) * 10) * 0.3
      )
    );

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      averageCompletionTime,
      tasksByPriority,
      tasksByStatus,
      tasksByClient,
      completionTrend,
      timeSpentByDay,
      productivityScore,
    };
  }, [tasks, selectedDateRange, filters]);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setSelectedDateRange(range);
    setFilters((prev) => ({ ...prev, date_range: range }));
  }, []);

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'json' | 'pdf') => {
    // Mock export functionality
    console.log(`Exporting analytics data as ${format}`);
    setShowExportModal(false);
  }, []);

  // Prepare chart data
  const lineChartData = analytics.completionTrend.map((item, index) => ({
    value: item.completed,
    label: new Date(item.date).getDate().toString(),
    dataPointText: item.completed.toString(),
  }));

  const barChartData = Object.entries(analytics.tasksByPriority).map(
    ([priority, count]) => ({
      value: count,
      label: priority,
      frontColor: getPriorityColor(priority),
    })
  );

  const pieChartData = Object.entries(analytics.tasksByStatus).map(
    ([status, count]) => ({
      value: count,
      color: getStatusColor(status),
      text: `${status}\n${count}`,
    })
  );

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'blocked':
        return '#EF4444';
      case 'pending':
        return '#6B7280';
      default:
        return colors.textSecondary;
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Task Analytics
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
            ]}
            onPress={() => setShowExportModal(true)}
          >
            <Download size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Range Selector */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Time Period
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateRangeContainer}>
              {DATE_RANGES.map((range) => (
                <TouchableOpacity
                  key={range.label}
                  style={[
                    styles.dateRangeButton,
                    { borderColor: colors.border },
                    selectedDateRange.label === range.label && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleDateRangeChange(range)}
                >
                  <Text
                    style={[
                      styles.dateRangeText,
                      { color: colors.text },
                      selectedDateRange.label === range.label && {
                        color: 'white',
                      },
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Key Metrics */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Key Metrics
          </Text>

          <View style={styles.metricsGrid}>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[styles.metricIcon, { backgroundColor: '#10B98115' }]}
              >
                <CheckSquare size={20} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {analytics.completedTasks}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Completed
              </Text>
            </View>

            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[styles.metricIcon, { backgroundColor: '#3B82F615' }]}
              >
                <Activity size={20} color="#3B82F6" strokeWidth={2} />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(analytics.completionRate)}%
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Completion Rate
              </Text>
            </View>

            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[styles.metricIcon, { backgroundColor: '#EF444415' }]}
              >
                <AlertTriangle size={20} color="#EF4444" strokeWidth={2} />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {analytics.overdueTasks}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Overdue
              </Text>
            </View>

            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[styles.metricIcon, { backgroundColor: '#F59E0B15' }]}
              >
                <TrendingUp size={20} color="#F59E0B" strokeWidth={2} />
              </View>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {analytics.productivityScore}
              </Text>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                Productivity Score
              </Text>
            </View>
          </View>
        </View>

        {/* Chart Type Selector */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Task Completion Trend
            </Text>
            <View style={styles.chartTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  { borderColor: colors.border },
                  chartType === 'line' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setChartType('line')}
              >
                <Activity
                  size={16}
                  color={chartType === 'line' ? 'white' : colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  { borderColor: colors.border },
                  chartType === 'bar' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setChartType('bar')}
              >
                <BarChart3
                  size={16}
                  color={chartType === 'bar' ? 'white' : colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chartTypeButton,
                  { borderColor: colors.border },
                  chartType === 'pie' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setChartType('pie')}
              >
                <PieChart
                  size={16}
                  color={chartType === 'pie' ? 'white' : colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {chartType === 'line' && lineChartData.length > 0 && (
              <LineChart
                data={lineChartData}
                width={chartWidth}
                height={200}
                color={colors.primary}
                thickness={3}
                dataPointsColor={colors.primary}
                textColor={colors.textSecondary}
                textFontSize={12}
                hideRules
                hideYAxisText
                curved
                animateOnDataChange
                animationDuration={1000}
              />
            )}

            {chartType === 'bar' && barChartData.length > 0 && (
              <BarChart
                data={barChartData}
                width={chartWidth}
                height={200}
                barWidth={40}
                spacing={20}
                roundedTop
                roundedBottom
                hideRules
                hideYAxisText
                xAxisThickness={0}
                yAxisThickness={0}
                isAnimated
                animationDuration={1000}
              />
            )}

            {chartType === 'pie' && pieChartData.length > 0 && (
              <View style={styles.pieChartContainer}>
                <GiftedPieChart
                  data={pieChartData}
                  radius={80}
                  innerRadius={30}
                  centerLabelComponent={() => (
                    <View style={styles.pieChartCenter}>
                      <Text
                        style={[
                          styles.pieChartCenterText,
                          { color: colors.text },
                        ]}
                      >
                        {analytics.totalTasks}
                      </Text>
                      <Text
                        style={[
                          styles.pieChartCenterLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Total
                      </Text>
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        </View>

        {/* Additional Analytics */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Task Breakdown
          </Text>

          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownSection}>
              <Text style={[styles.breakdownTitle, { color: colors.text }]}>
                By Priority
              </Text>
              {Object.entries(analytics.tasksByPriority).map(
                ([priority, count]) => (
                  <View key={priority} style={styles.breakdownItem}>
                    <View style={styles.breakdownItemLeft}>
                      <View
                        style={[
                          styles.breakdownIndicator,
                          { backgroundColor: getPriorityColor(priority) },
                        ]}
                      />
                      <Text
                        style={[styles.breakdownLabel, { color: colors.text }]}
                      >
                        {priority}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.breakdownValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )
              )}
            </View>

            <View style={styles.breakdownSection}>
              <Text style={[styles.breakdownTitle, { color: colors.text }]}>
                By Status
              </Text>
              {Object.entries(analytics.tasksByStatus).map(
                ([status, count]) => (
                  <View key={status} style={styles.breakdownItem}>
                    <View style={styles.breakdownItemLeft}>
                      <View
                        style={[
                          styles.breakdownIndicator,
                          { backgroundColor: getStatusColor(status) },
                        ]}
                      />
                      <Text
                        style={[styles.breakdownLabel, { color: colors.text }]}
                      >
                        {status}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.breakdownValue,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        </View>

        {/* Performance Insights */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Performance Insights
          </Text>

          <View style={styles.insightsContainer}>
            <View
              style={[
                styles.insightCard,
                { backgroundColor: colors.background },
              ]}
            >
              <Clock size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.insightTitle, { color: colors.text }]}>
                Average Completion Time
              </Text>
              <Text
                style={[styles.insightValue, { color: colors.textSecondary }]}
              >
                {analytics.averageCompletionTime.toFixed(1)} days
              </Text>
            </View>

            <View
              style={{ backgroundColor: colors.background, borderRadius: 12 }}
            >
              <View style={styles.insightCard}>
                <Users size={20} color={colors.secondary} strokeWidth={2} />
                <Text style={[styles.insightTitle, { color: colors.text }]}>
                  Most Active Client
                </Text>
              </View>
              <Text
                style={[
                  styles.insightValue,
                  {
                    color: colors.textSecondary,
                    paddingInline: 16,
                    paddingBottom: 10,
                  },
                ]}
              >
                {Object.entries(analytics.tasksByClient).sort(
                  ([, a], [, b]) => b - a
                )[0]?.[0] || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Task Optimization */}
        <TaskOptimization onRefresh={() => tasksQuery.refetch()} />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Export Analytics
            </Text>

            <View style={styles.exportOptions}>
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => handleExport('csv')}
              >
                <Text style={[styles.exportButtonText, { color: colors.text }]}>
                  Export as CSV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => handleExport('json')}
              >
                <Text style={[styles.exportButtonText, { color: colors.text }]}>
                  Export as JSON
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.exportButton,
                  { backgroundColor: colors.background },
                ]}
                onPress={() => handleExport('pdf')}
              >
                <Text style={[styles.exportButtonText, { color: colors.text }]}>
                  Export as PDF
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                { backgroundColor: colors.border },
              ]}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },

  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  dateRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '500',
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTypeSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  chartTypeButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenter: {
    alignItems: 'center',
  },
  pieChartCenterText: {
    fontSize: 18,
    fontWeight: '700',
  },
  pieChartCenterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  breakdownContainer: {
    gap: 20,
  },
  breakdownSection: {
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  exportOptions: {
    gap: 12,
  },
  exportButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
