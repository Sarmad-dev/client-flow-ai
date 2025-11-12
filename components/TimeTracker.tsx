import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import {
  Play,
  Pause,
  Square,
  Clock,
  Plus,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useTimerDisplay,
  useStartTimer,
  useStopTimer,
  usePauseTimer,
  useTaskTimeEntries,
  useCreateManualTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from '@/hooks/useTimeTracking';
import type { TimeEntry } from '@/types/task-management';

interface TimeTrackerProps {
  taskId: string;
  taskTitle?: string;
  showHistory?: boolean;
  compact?: boolean;
}

interface ManualTimeEntryForm {
  start_time: Date;
  end_time: Date;
  description: string;
}

// Simple date/time picker component for manual entry
function SimpleDateTimePicker({
  value,
  onChange,
  label,
}: {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
}) {
  const { colors } = useTheme();

  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.datePickerContainer}>
      <Text style={[styles.datePickerLabel, { color: colors.text }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[
          styles.datePickerButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
        onPress={() => {
          // For now, just set to current time - in a real app you'd show a proper date picker
          onChange(new Date());
        }}
      >
        <Text style={[styles.datePickerText, { color: colors.text }]}>
          {formatDateTime(value)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TimeTracker({
  taskId,
  taskTitle = 'Task',
  showHistory = true,
  compact = false,
}: TimeTrackerProps) {
  const { colors } = useTheme();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [manualForm, setManualForm] = useState<ManualTimeEntryForm>({
    start_time: new Date(),
    end_time: new Date(),
    description: '',
  });

  // Hooks for timer functionality
  const { activeTimer, formattedTime, isRunning } = useTimerDisplay();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const pauseTimer = usePauseTimer();

  // Hooks for time entries
  const { data: timeEntries = [], isLoading: entriesLoading } =
    useTaskTimeEntries(taskId);
  const createManualEntry = useCreateManualTimeEntry();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const isActiveForThisTask = activeTimer?.task_id === taskId;

  const handleStartTimer = async () => {
    try {
      await startTimer.mutateAsync(taskId);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer.mutateAsync({});
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to stop timer');
    }
  };

  const handlePauseTimer = async () => {
    try {
      await pauseTimer.mutateAsync();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pause timer');
    }
  };

  const handleCreateManualEntry = async () => {
    if (manualForm.end_time <= manualForm.start_time) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      await createManualEntry.mutateAsync({
        task_id: taskId,
        start_time: manualForm.start_time.toISOString(),
        end_time: manualForm.end_time.toISOString(),
        description: manualForm.description.trim() || undefined,
      });

      setShowManualEntry(false);
      setManualForm({
        start_time: new Date(),
        end_time: new Date(),
        description: '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create time entry');
    }
  };

  const handleUpdateEntry = async (entry: TimeEntry) => {
    if (!editingEntry) return;

    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        description: editingEntry.description || undefined,
      });
      setEditingEntry(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update time entry');
    }
  };

  const handleDeleteEntry = async (entry: TimeEntry) => {
    Alert.alert(
      'Delete Time Entry',
      'Are you sure you want to delete this time entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry.mutateAsync({
                id: entry.id,
                task_id: taskId,
              });
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to delete time entry'
              );
            }
          },
        },
      ]
    );
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalTime = timeEntries.reduce(
    (sum, entry) => sum + (entry.duration_minutes || 0),
    0
  );

  if (compact) {
    return (
      <View
        style={[styles.compactContainer, { backgroundColor: colors.surface }]}
      >
        <View style={styles.compactTimer}>
          <Clock size={16} color={colors.text} />
          <Text style={[styles.compactTime, { color: colors.text }]}>
            {isActiveForThisTask ? formattedTime : formatDuration(totalTime)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={isActiveForThisTask ? handlePauseTimer : handleStartTimer}
          style={[
            styles.compactButton,
            {
              backgroundColor: isActiveForThisTask
                ? colors.warning
                : colors.primary,
            },
          ]}
          disabled={startTimer.isPending || pauseTimer.isPending}
        >
          {isActiveForThisTask ? (
            <Pause size={14} color="white" />
          ) : (
            <Play size={14} color="white" />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Timer Display */}
      <View style={styles.timerSection}>
        <View style={styles.timerDisplay}>
          <Clock size={24} color={colors.primary} />
          <Text style={[styles.timerText, { color: colors.text }]}>
            {isActiveForThisTask ? formattedTime : '0:00'}
          </Text>
          {isActiveForThisTask && (
            <View
              style={[
                styles.activeIndicator,
                { backgroundColor: colors.success },
              ]}
            />
          )}
        </View>

        <View style={styles.timerControls}>
          {!isActiveForThisTask ? (
            <TouchableOpacity
              onPress={handleStartTimer}
              style={[styles.timerButton, { backgroundColor: colors.success }]}
              disabled={startTimer.isPending}
            >
              <Play size={20} color="white" />
              <Text style={styles.timerButtonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={handlePauseTimer}
                style={[
                  styles.timerButton,
                  { backgroundColor: colors.warning },
                ]}
                disabled={pauseTimer.isPending}
              >
                <Pause size={20} color="white" />
                <Text style={styles.timerButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStopTimer}
                style={[styles.timerButton, { backgroundColor: colors.error }]}
                disabled={stopTimer.isPending}
              >
                <Square size={20} color="white" />
                <Text style={styles.timerButtonText}>Stop</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Total Time */}
      <View style={styles.totalTimeSection}>
        <Text style={[styles.totalTimeLabel, { color: colors.textSecondary }]}>
          Total Time Tracked
        </Text>
        <Text style={[styles.totalTimeValue, { color: colors.text }]}>
          {formatDuration(totalTime)}
        </Text>
      </View>

      {/* Manual Entry Button */}
      <TouchableOpacity
        onPress={() => setShowManualEntry(true)}
        style={[styles.manualEntryButton, { borderColor: colors.border }]}
      >
        <Plus size={16} color={colors.primary} />
        <Text style={[styles.manualEntryButtonText, { color: colors.primary }]}>
          Add Manual Entry
        </Text>
      </TouchableOpacity>

      {/* Time Entries History */}
      {showHistory && (
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            Time Entries
          </Text>
          {entriesLoading ? (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading entries...
            </Text>
          ) : timeEntries.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No time entries yet
            </Text>
          ) : (
            <ScrollView
              style={styles.entriesList}
              showsVerticalScrollIndicator={false}
            >
              {timeEntries.map((entry) => (
                <View
                  key={entry.id}
                  style={[
                    styles.entryItem,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.entryInfo}>
                      <Text
                        style={[styles.entryDuration, { color: colors.text }]}
                      >
                        {formatDuration(entry.duration_minutes)}
                      </Text>
                      <Text
                        style={[
                          styles.entryDate,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDateTime(entry.start_time)}
                        {entry.end_time &&
                          ` - ${formatDateTime(entry.end_time)}`}
                      </Text>
                      {entry.is_manual && (
                        <Text
                          style={[
                            styles.manualBadge,
                            { color: colors.primary },
                          ]}
                        >
                          Manual
                        </Text>
                      )}
                    </View>
                    <View style={styles.entryActions}>
                      <TouchableOpacity
                        onPress={() => setEditingEntry(entry)}
                        style={styles.actionButton}
                      >
                        <Edit3 size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEntry(entry)}
                        style={styles.actionButton}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {entry.description && (
                    <Text
                      style={[
                        styles.entryDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {entry.description}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setShowManualEntry(false)}>
              <Text
                style={[styles.modalCancelButton, { color: colors.primary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Time Entry
            </Text>
            <TouchableOpacity
              onPress={handleCreateManualEntry}
              disabled={createManualEntry.isPending}
            >
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <SimpleDateTimePicker
              value={manualForm.start_time}
              onChange={(date) =>
                setManualForm({ ...manualForm, start_time: date })
              }
              label="Start Time"
            />

            <SimpleDateTimePicker
              value={manualForm.end_time}
              onChange={(date) =>
                setManualForm({ ...manualForm, end_time: date })
              }
              label="End Time"
            />

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Description (Optional)
              </Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={manualForm.description}
                onChangeText={(text) =>
                  setManualForm({ ...manualForm, description: text })
                }
                placeholder="What did you work on?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.durationPreview}>
              <Text
                style={[styles.durationLabel, { color: colors.textSecondary }]}
              >
                Duration:
              </Text>
              <Text style={[styles.durationValue, { color: colors.text }]}>
                {formatDuration(
                  Math.max(
                    0,
                    Math.round(
                      (manualForm.end_time.getTime() -
                        manualForm.start_time.getTime()) /
                        (1000 * 60)
                    )
                  )
                )}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        visible={!!editingEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingEntry(null)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setEditingEntry(null)}>
              <Text
                style={[styles.modalCancelButton, { color: colors.primary }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Time Entry
            </Text>
            <TouchableOpacity
              onPress={() => editingEntry && handleUpdateEntry(editingEntry)}
              disabled={updateEntry.isPending}
            >
              <Text style={[styles.modalSaveButton, { color: colors.primary }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={editingEntry?.description || ''}
                onChangeText={(text) =>
                  setEditingEntry(
                    editingEntry ? { ...editingEntry, description: text } : null
                  )
                }
                placeholder="What did you work on?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  compactTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  timerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  totalTimeSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  totalTimeLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalTimeValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  manualEntryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  historySection: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  entriesList: {
    maxHeight: 300,
  },
  entryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryInfo: {
    flex: 1,
  },
  entryDuration: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  manualBadge: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  entryDescription: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCancelButton: {
    fontSize: 16,
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  durationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  durationLabel: {
    fontSize: 16,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  datePickerText: {
    fontSize: 16,
  },
});
