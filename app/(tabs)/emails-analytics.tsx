import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import EmailAnalyticsDashboard from '@/components/EmailAnalyticsDashboard';
import EmailEngagementCharts from '@/components/EmailEngagementCharts';
import RecipientEngagementLeaderboard from '@/components/RecipientEngagementLeaderboard';
import TemplatePerformanceView from '@/components/TemplatePerformanceView';
import EmailExportModal from '@/components/EmailExportModal';
import EmailErrorBoundary from '@/components/EmailErrorBoundary';
import { Download, TrendingUp, Users, FileText, X } from 'lucide-react-native';

type TabType = 'overview' | 'engagement' | 'recipients' | 'templates';

export default function EmailsAnalyticsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>(
    'start'
  );
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  const {
    guardAnalyticsAccess,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  const tabs = [
    { key: 'overview' as TabType, label: 'Overview', icon: TrendingUp },
    { key: 'engagement' as TabType, label: 'Engagement', icon: TrendingUp },
    { key: 'recipients' as TabType, label: 'Recipients', icon: Users },
    { key: 'templates' as TabType, label: 'Templates', icon: FileText },
  ];

  const handleDateRangePress = () => {
    setDatePickerMode('start');
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (datePickerMode === 'start') {
        setDateRange((prev) => ({ ...prev, start: selectedDate }));
        if (Platform.OS === 'ios') {
          // On iOS, we'll show both pickers in the modal
        } else {
          // On Android, show end date picker after start date
          setTimeout(() => {
            setDatePickerMode('end');
            setShowDatePicker(true);
          }, 100);
        }
      } else {
        setDateRange((prev) => ({ ...prev, end: selectedDate }));
        if (Platform.OS === 'android') {
          setShowDatePicker(false);
        }
      }
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  // Check if user has access to analytics
  if (!guardAnalyticsAccess()) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.lockedContainer}>
          <Text
            style={[styles.title, { color: colors.text, textAlign: 'center' }]}
          >
            Analytics Access Required
          </Text>
          <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
            Upgrade to Pro to access email analytics and insights.
          </Text>
        </View>
        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          featureName={modalFeatureName}
        />
      </SafeAreaView>
    );
  }

  return (
    <EmailErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header with Export Button */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Email Analytics
          </Text>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowExportModal(true)}
          >
            <Download size={18} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Icon
                  size={16}
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <EmailAnalyticsDashboard
            onDateRangePress={handleDateRangePress}
            dateRange={dateRange}
          />
        )}
        {activeTab === 'engagement' && (
          <EmailEngagementCharts dateRange={dateRange} />
        )}
        {activeTab === 'recipients' && (
          <RecipientEngagementLeaderboard dateRange={dateRange} />
        )}
        {activeTab === 'templates' && (
          <TemplatePerformanceView dateRange={dateRange} />
        )}

        {/* Date Range Picker Modal */}
        {Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={closeDatePicker}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.datePickerModal,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.datePickerHeader}>
                  <Text
                    style={[styles.datePickerTitle, { color: colors.text }]}
                  >
                    Select Date Range
                  </Text>
                  <TouchableOpacity onPress={closeDatePicker}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.datePickerContent}>
                  <Text
                    style={[styles.datePickerLabel, { color: colors.text }]}
                  >
                    Start Date
                  </Text>
                  <DateTimePicker
                    value={dateRange.start}
                    mode="date"
                    display="spinner"
                    onChange={(e, date) => {
                      if (date)
                        setDateRange((prev) => ({ ...prev, start: date }));
                    }}
                    maximumDate={dateRange.end}
                    textColor={colors.text}
                  />

                  <Text
                    style={[
                      styles.datePickerLabel,
                      { color: colors.text, marginTop: 16 },
                    ]}
                  >
                    End Date
                  </Text>
                  <DateTimePicker
                    value={dateRange.end}
                    mode="date"
                    display="spinner"
                    onChange={(e, date) => {
                      if (date)
                        setDateRange((prev) => ({ ...prev, end: date }));
                    }}
                    minimumDate={dateRange.start}
                    maximumDate={new Date()}
                    textColor={colors.text}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.datePickerButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={closeDatePicker}
                >
                  <Text style={styles.datePickerButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          showDatePicker && (
            <DateTimePicker
              value={
                datePickerMode === 'start' ? dateRange.start : dateRange.end
              }
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={
                datePickerMode === 'start' ? dateRange.end : new Date()
              }
              minimumDate={
                datePickerMode === 'end' ? dateRange.start : undefined
              }
            />
          )
        )}

        {/* Export Modal */}
        <EmailExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          dateRange={dateRange}
        />

        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          featureName={modalFeatureName}
        />
      </SafeAreaView>
    </EmailErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedText: {
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  datePickerContent: {
    marginBottom: 24,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  datePickerButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
