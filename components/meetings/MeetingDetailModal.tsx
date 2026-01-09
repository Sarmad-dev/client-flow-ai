import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  Video,
  Mic,
  Edit,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { VoiceRecorder } from '../VoiceRecorder';
import { MeetingEditModal } from '@/components/meetings/MeetingEditModal';
import { EnrichedMeeting } from '@/types/meeting-management';

interface MeetingDetailModalProps {
  visible: boolean;
  meeting: EnrichedMeeting | null;
  onClose: () => void;
  onSummaryUpdated?: (meetingId: string, summary: string) => void;
  onMeetingUpdated?: (meeting: EnrichedMeeting) => void;
}

export function MeetingDetailModal({
  visible,
  meeting,
  onClose,
  onSummaryUpdated,
  onMeetingUpdated,
}: MeetingDetailModalProps) {
  const { colors } = useTheme();
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<EnrichedMeeting | null>(
    meeting
  );

  // Update currentMeeting when meeting prop changes
  useEffect(() => {
    setCurrentMeeting(meeting);
  }, [meeting]);

  if (!currentMeeting) return null;

  // Helper function to safely parse dates
  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    // Try different date parsing approaches
    let date = new Date(dateString);

    // If the first attempt fails, try parsing as ISO string
    if (isNaN(date.getTime())) {
      date = new Date(dateString + 'Z'); // Add Z for UTC if missing
    }

    // If still fails, try parsing as timestamp
    if (isNaN(date.getTime())) {
      const timestamp = parseInt(dateString);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }

    // If still fails, try parsing with different formats
    if (isNaN(date.getTime())) {
      // Try parsing as date with timezone offset
      const dateWithOffset = dateString.replace(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
        '$1Z'
      );
      date = new Date(dateWithOffset);
    }

    // If all attempts fail, return current date as fallback
    if (isNaN(date.getTime())) {
      console.warn('Failed to parse date:', dateString);
      return new Date();
    }

    return date;
  };

  const isCompleted = currentMeeting.status === 'completed';
  const isScheduled = currentMeeting.status === 'scheduled';

  // Determine if meeting is upcoming or past based on current time
  const getMeetingStatus = () => {
    if (isCompleted) return 'completed';

    const now = new Date();
    const startTime = parseDate(currentMeeting.start_time);

    // If start time is invalid, return scheduled
    if (isNaN(startTime.getTime())) return 'scheduled';

    // If meeting hasn't started yet, it's upcoming
    if (startTime > now) return 'upcoming';

    // If meeting has started, it's past
    return 'past';
  };

  const meetingStatus = getMeetingStatus();

  const handleSummaryCreated = (summary: string) => {
    // Update local state
    setCurrentMeeting({ ...currentMeeting, summary });
    setShowVoiceRecorder(false);
    // Notify parent
    onSummaryUpdated?.(currentMeeting.id, summary);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Meeting Details
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowEditModal(true)}
              >
                <Edit size={18} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Meeting Info */}
            <View
              style={[styles.infoCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.meetingTitle, { color: colors.text }]}>
                {currentMeeting.title}
              </Text>

              <View style={styles.infoRow}>
                <User size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  {currentMeeting.client_name || 'No Client Assigned'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar
                  size={16}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  {(() => {
                    const startDate = parseDate(currentMeeting.start_time);
                    return isNaN(startDate.getTime())
                      ? 'Invalid Date'
                      : `${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}`;
                  })()}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Clock size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  {(() => {
                    const startDate = parseDate(currentMeeting.start_time);
                    const endDate = parseDate(currentMeeting.end_time);
                    if (
                      isNaN(startDate.getTime()) ||
                      isNaN(endDate.getTime())
                    ) {
                      return 'Invalid Duration';
                    }
                    const duration = Math.max(
                      1,
                      Math.round(
                        (endDate.getTime() - startDate.getTime()) / 60000
                      )
                    );
                    return `${duration} min`;
                  })()}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      meetingStatus === 'completed'
                        ? colors.success
                        : meetingStatus === 'upcoming'
                        ? colors.primary
                        : meetingStatus === 'past'
                        ? colors.error || '#FF6B6B'
                        : colors.warning,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {meetingStatus === 'completed'
                    ? 'Completed'
                    : meetingStatus === 'upcoming'
                    ? 'Upcoming'
                    : meetingStatus === 'past'
                    ? 'Past'
                    : 'Scheduled'}
                </Text>
              </View>
            </View>

            {/* Summary Section */}
            <View
              style={[styles.summaryCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.summaryHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Meeting Summary
                </Text>
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setShowVoiceRecorder(!showVoiceRecorder)}
                >
                  <Mic size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.recordButtonText}>
                    {currentMeeting.summary
                      ? 'Update Summary'
                      : 'Record Summary'}
                  </Text>
                </TouchableOpacity>
              </View>

              {currentMeeting.summary ? (
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  {currentMeeting.summary}
                </Text>
              ) : (
                <Text
                  style={[styles.emptySummary, { color: colors.textSecondary }]}
                >
                  No summary recorded yet. Use the voice recorder to add a
                  meeting summary.
                </Text>
              )}

              {/* Voice Recorder */}
              {showVoiceRecorder && (
                <View style={styles.voiceRecorderContainer}>
                  <VoiceRecorder
                    mode="summary"
                    meetingId={currentMeeting.id}
                    onSummaryCreated={handleSummaryCreated}
                  />
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.closeActionButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.closeActionText, { color: colors.text }]}>
                Close
              </Text>
            </TouchableOpacity>
            {(meetingStatus === 'upcoming' ||
              meetingStatus === 'scheduled') && (
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: colors.primary }]}
              >
                <Video size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.joinButtonText}>Join Meeting</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Edit Modal */}
          <MeetingEditModal
            visible={showEditModal}
            onClose={() => setShowEditModal(false)}
            meeting={currentMeeting}
            onUpdated={(updatedMeeting) => {
              // Convert MeetingRecord back to EnrichedMeeting for state update
              const enrichedMeeting: EnrichedMeeting = {
                ...updatedMeeting,
                client_name: currentMeeting?.client_name || null,
              };
              setCurrentMeeting(enrichedMeeting);
              setShowEditModal(false);
              onMeetingUpdated?.(enrichedMeeting);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    paddingTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    position: 'relative',
  },
  meetingTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  emptySummary: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  voiceRecorderContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  closeActionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
