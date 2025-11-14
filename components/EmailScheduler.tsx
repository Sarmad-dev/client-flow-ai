import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  usePendingScheduledEmails,
  useCancelScheduledEmail,
  useUpdateScheduledEmail,
} from '@/hooks/useScheduledEmails';
import { useAlert } from '@/contexts/CustomAlertContext';
import { PlatformDateTimePicker } from '@/components/PlatformDateTimePicker';
import {
  Calendar,
  Clock,
  X,
  Edit2,
  Trash2,
  Mail,
  CheckCircle2,
} from 'lucide-react-native';

interface EmailSchedulerProps {
  onScheduleSelect?: (scheduledAt: Date) => void;
  showScheduledList?: boolean;
  onEditEmail?: (emailId: string) => void;
}

export default function EmailScheduler({
  onScheduleSelect,
  showScheduledList = true,
  onEditEmail,
}: EmailSchedulerProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { data: scheduledEmails = [], isLoading } = usePendingScheduledEmails();
  const cancelEmail = useCancelScheduledEmail();
  const updateEmail = useUpdateScheduledEmail();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);

  // Get user's timezone
  const userTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Format date for display
  const formatScheduledDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If in the past
    if (diffMs < 0) {
      return 'Sending soon...';
    }

    // If less than 1 hour
    if (diffMins < 60) {
      return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    }

    // If less than 24 hours
    if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }

    // If less than 7 days
    if (diffDays < 7) {
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }

    // Otherwise show full date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format full date and time
  const formatFullDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  // Validate that date is in the future
  const validateFutureDate = (date: Date): boolean => {
    const now = new Date();
    return date > now;
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (!validateFutureDate(date)) {
      showAlert({
        title: 'Invalid Date',
        message: 'Please select a date and time in the future.',
      });
      return;
    }

    setSelectedDate(date);
    setShowDatePicker(false);

    if (editingEmailId) {
      // Update existing scheduled email
      handleUpdateSchedule(editingEmailId, date);
    } else if (onScheduleSelect) {
      // Pass selected date to parent component
      onScheduleSelect(date);
    }
  };

  // Handle updating schedule
  const handleUpdateSchedule = async (emailId: string, newDate: Date) => {
    try {
      await updateEmail.mutateAsync({
        id: emailId,
        scheduled_at: newDate.toISOString(),
      });

      showAlert({
        title: 'Schedule Updated',
        message: `Email rescheduled for ${formatFullDateTime(
          newDate.toISOString()
        )}`,
      });

      setEditingEmailId(null);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      showAlert({
        title: 'Update Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update schedule. Please try again.',
      });
    }
  };

  // Handle canceling scheduled email
  const handleCancelEmail = (emailId: string, subject: string | null) => {
    showAlert({
      title: 'Cancel Scheduled Email',
      message: `Are you sure you want to cancel this scheduled email${
        subject ? ` "${subject}"` : ''
      }?`,
      confirmText: 'Cancel Email',
      cancelText: 'Keep',
      onConfirm: async () => {
        try {
          await cancelEmail.mutateAsync(emailId);
          showAlert({
            title: 'Email Cancelled',
            message: 'The scheduled email has been cancelled.',
          });
        } catch (error) {
          console.error('Failed to cancel email:', error);
          showAlert({
            title: 'Cancellation Failed',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to cancel email. Please try again.',
          });
        }
      },
    });
  };

  // Handle editing scheduled email
  const handleEditSchedule = (emailId: string) => {
    setEditingEmailId(emailId);
    setShowDatePicker(true);
  };

  return (
    <View style={styles.container}>
      {/* Date/Time Picker Section */}
      {!showScheduledList && (
        <View style={styles.pickerSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Schedule Email
          </Text>

          <TouchableOpacity
            style={[
              styles.dateButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={colors.textSecondary} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {selectedDate
                ? formatFullDateTime(selectedDate.toISOString())
                : 'Select date and time'}
            </Text>
          </TouchableOpacity>

          {/* Timezone display */}
          <View style={styles.timezoneInfo}>
            <Clock size={14} color={colors.textSecondary} />
            <Text
              style={[styles.timezoneText, { color: colors.textSecondary }]}
            >
              Timezone: {userTimezone}
            </Text>
          </View>

          {/* Date picker modal */}
          {showDatePicker && (
            <PlatformDateTimePicker
              value={selectedDate || new Date()}
              mode="datetime"
              onChange={(date) => {
                if (date) {
                  handleDateSelect(date);
                } else {
                  setShowDatePicker(false);
                  setEditingEmailId(null);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>
      )}

      {/* Scheduled Emails List */}
      {showScheduledList && (
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Scheduled Emails
            </Text>
            {scheduledEmails.length > 0 && (
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Text
                  style={[styles.countBadgeText, { color: colors.primary }]}
                >
                  {scheduledEmails.length}
                </Text>
              </View>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Loading scheduled emails...
              </Text>
            </View>
          ) : scheduledEmails.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Mail size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Scheduled Emails
              </Text>
              <Text
                style={[styles.emptyMessage, { color: colors.textSecondary }]}
              >
                Schedule emails to send them at a specific time
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.emailList}
              showsVerticalScrollIndicator={false}
            >
              {scheduledEmails.map((email) => (
                <View
                  key={email.id}
                  style={[
                    styles.emailCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Email info */}
                  <View style={styles.emailInfo}>
                    <View style={styles.emailHeader}>
                      <Text
                        style={[styles.emailSubject, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {email.subject || '(no subject)'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.emailRecipient,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      To: {email.recipient_email}
                    </Text>

                    {/* Countdown timer */}
                    <View style={styles.scheduleInfo}>
                      <Clock size={14} color={colors.primary} />
                      <Text
                        style={[styles.scheduleText, { color: colors.primary }]}
                      >
                        Sending {formatScheduledDate(email.scheduled_at)}
                      </Text>
                    </View>

                    {/* Full date/time */}
                    <Text
                      style={[
                        styles.fullDateTime,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatFullDateTime(email.scheduled_at)}
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.emailActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleEditSchedule(email.id)}
                      disabled={updateEmail.isPending}
                    >
                      {updateEmail.isPending && editingEmailId === email.id ? (
                        <ActivityIndicator
                          size={16}
                          color={colors.textSecondary}
                        />
                      ) : (
                        <Edit2 size={16} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleCancelEmail(email.id, email.subject)}
                      disabled={cancelEmail.isPending}
                    >
                      {cancelEmail.isPending ? (
                        <ActivityIndicator size={16} color="#EF4444" />
                      ) : (
                        <Trash2 size={16} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Date picker modal for editing */}
          {showDatePicker && editingEmailId && (
            <PlatformDateTimePicker
              value={
                scheduledEmails.find((e) => e.id === editingEmailId)
                  ?.scheduled_at
                  ? new Date(
                      scheduledEmails.find(
                        (e) => e.id === editingEmailId
                      )!.scheduled_at
                    )
                  : new Date()
              }
              mode="datetime"
              onChange={(date) => {
                if (date) {
                  handleDateSelect(date);
                } else {
                  setShowDatePicker(false);
                  setEditingEmailId(null);
                }
              }}
              minimumDate={new Date()}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pickerSection: {
    gap: 12,
  },
  listSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    flex: 1,
  },
  timezoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  timezoneText: {
    fontSize: 13,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  emailList: {
    flex: 1,
  },
  emailCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  emailInfo: {
    flex: 1,
    gap: 6,
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  emailRecipient: {
    fontSize: 14,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  scheduleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullDateTime: {
    fontSize: 12,
    marginTop: 2,
  },
  emailActions: {
    gap: 8,
    justifyContent: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
