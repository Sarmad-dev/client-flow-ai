import React, { useState } from 'react';
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
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { VoiceRecorder } from './VoiceRecorder';

interface Meeting {
  id: string;
  title: string;
  client: string;
  date: string;
  duration: string;
  summary: string;
  status: 'upcoming' | 'completed';
}

interface MeetingDetailModalProps {
  visible: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onSummaryUpdated?: (meetingId: string, summary: string) => void;
}

export function MeetingDetailModal({
  visible,
  meeting,
  onClose,
  onSummaryUpdated,
}: MeetingDetailModalProps) {
  const { colors } = useTheme();
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  if (!meeting) return null;

  const isCompleted = meeting.status === 'completed';

  const handleSummaryCreated = (summary: string) => {
    onSummaryUpdated?.(meeting.id, summary);
    setShowVoiceRecorder(false);
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
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
                {meeting.title}
              </Text>

              <View style={styles.infoRow}>
                <User size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  {meeting.client}
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
                  {new Date(meeting.date).toLocaleDateString()} at{' '}
                  {new Date(meeting.date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Clock size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text
                  style={[styles.infoText, { color: colors.textSecondary }]}
                >
                  {meeting.duration}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isCompleted
                      ? colors.success
                      : colors.warning,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {isCompleted ? 'Completed' : 'Upcoming'}
                </Text>
              </View>
            </View>

            {/* Summary Section */}
            {isCompleted && (
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.summaryHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Meeting Summary
                  </Text>
                  {!meeting.summary && (
                    <TouchableOpacity
                      style={[
                        styles.recordButton,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setShowVoiceRecorder(!showVoiceRecorder)}
                    >
                      <Mic size={16} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.recordButtonText}>
                        Record Summary
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {meeting.summary ? (
                  <Text style={[styles.summaryText, { color: colors.text }]}>
                    {meeting.summary}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.emptySummary,
                      { color: colors.textSecondary },
                    ]}
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
                      meetingId={meeting.id}
                      onSummaryCreated={handleSummaryCreated}
                    />
                  </View>
                )}
              </View>
            )}
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
            {!isCompleted && (
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: colors.primary }]}
              >
                <Video size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.joinButtonText}>Join Meeting</Text>
              </TouchableOpacity>
            )}
          </View>
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
