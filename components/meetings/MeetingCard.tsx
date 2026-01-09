import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Play,
  MoveVertical as MoreVertical,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { EnrichedMeeting } from '@/types/meeting-management';

interface MeetingCardProps {
  meeting: EnrichedMeeting;
  onPress?: (meeting: EnrichedMeeting) => void; // Add onPress callback
}

export function MeetingCard({ meeting, onPress }: MeetingCardProps) {
  const { colors } = useTheme();

  // Helper function to safely parse dates
  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    let date = new Date(dateString);

    if (isNaN(date.getTime())) {
      date = new Date(dateString + 'Z');
    }

    if (isNaN(date.getTime())) {
      const timestamp = parseInt(dateString);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }

    if (isNaN(date.getTime())) {
      const dateWithOffset = dateString.replace(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,
        '$1Z'
      );
      date = new Date(dateWithOffset);
    }

    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  };

  // Calculate duration from start and end times
  const getDuration = () => {
    const startDate = parseDate(meeting.start_time);
    const endDate = parseDate(meeting.end_time);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Unknown';
    }
    const duration = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    );
    return `${duration} min`;
  };

  // Determine if meeting is upcoming based on current time
  const isUpcoming = () => {
    if (meeting.status === 'completed') return false;
    const now = new Date();
    const startTime = parseDate(meeting.start_time);
    return !isNaN(startTime.getTime()) && startTime > now;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        isUpcoming() && { borderLeftColor: colors.primary, borderLeftWidth: 4 },
      ]}
      onPress={() => onPress?.(meeting)}
    >
      <View style={styles.header}>
        <View style={styles.meetingInfo}>
          <Text style={[styles.title, { color: colors.text }]}>
            {meeting.title}
          </Text>

          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <User size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
              >
                {meeting.client_name || 'No Client'}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <Calendar
                size={14}
                color={colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
              >
                {parseDate(meeting.start_time).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.metadataItem}>
              <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
              >
                {getDuration()}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical
            size={20}
            color={colors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      {meeting.summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <FileText size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.summaryTitle, { color: colors.primary }]}>
              Summary
            </Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {meeting.summary}
          </Text>
        </View>
      )}

      {isUpcoming() && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Play size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.actionText}>Join Meeting</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  meetingInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  metadata: {
    gap: 6,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '400',
  },
  moreButton: {
    padding: 4,
    marginLeft: 12,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
