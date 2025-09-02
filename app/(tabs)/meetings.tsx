import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { MeetingCard } from '@/components/MeetingCard';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { MeetingForm } from '@/components/MeetingForm';
import { useClients } from '@/hooks/useClients';
import { useMeetings, useCreateMeeting } from '@/hooks/useMeetings';
import { MeetingFormData } from '@/lib/validation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MeetingDetailModal } from '@/components/MeetingDetailModal';

export default function MeetingsScreen() {
  const { colors } = useTheme();
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [showMeetingDetail, setShowMeetingDetail] = useState(false);
  const { data: meetings = [] } = useMeetings();
  const { data: clients = [] } = useClients();
  const createMeeting = useCreateMeeting();

  const handleCreateMeeting = async (form: MeetingFormData) => {
    const payload = {
      client_id: form.clientId,
      title: form.title,
      description: form.description || null,
      meeting_type: form.meetingType,
      start_time: form.startDate.toISOString(),
      end_time: form.endDate.toISOString(),
      location: form.location || null,
      agenda: form.agenda || null,
      summary: null,
    } as const;
    await createMeeting.mutateAsync(payload as any);
  };

  const handleMeetingPress = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowMeetingDetail(true);
  };

  const handleSummaryUpdated = (meetingId: string, summary: string) => {
    // In a real app, you'd want to update the meeting in your data
    // For now, we'll just close the modal and rely on data refetching
    setShowMeetingDetail(false);
    setSelectedMeeting(null);
  };

  const upcomingMeetings = useMemo(
    () => meetings.filter((m) => m.status === 'scheduled'),
    [meetings]
  );
  const pastMeetings = useMemo(
    () => meetings.filter((m) => m.status === 'completed'),
    [meetings]
  );

  return (
    <>
      {/* Meeting Form */}
      <MeetingForm
        visible={showMeetingForm}
        onClose={() => setShowMeetingForm(false)}
        onSubmit={handleCreateMeeting}
        clients={clients.map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company ?? '',
        }))}
      />

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        meeting={selectedMeeting}
        visible={showMeetingDetail}
        onClose={() => setShowMeetingDetail(false)}
        onSummaryUpdated={handleSummaryUpdated}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Meetings</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowMeetingForm((prev) => !prev)}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Voice Recorder for Meeting Summaries */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Record Meeting Summary
            </Text>
            <VoiceRecorder mode="summary" />
          </View>

          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Upcoming ({upcomingMeetings.length})
              </Text>
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={{
                    id: meeting.id,
                    title: meeting.title,
                    client: meeting.client_name || 'Unknown',
                    date: meeting.start_time,
                    duration: `${Math.max(
                      1,
                      Math.round(
                        (new Date(meeting.end_time).getTime() -
                          new Date(meeting.start_time).getTime()) /
                          60000
                      )
                    )} min`,
                    summary: meeting.summary || '',
                    status: 'upcoming',
                  }}
                  onPress={handleMeetingPress}
                />
              ))}
            </View>
          )}

          {/* Past Meetings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Past Meetings ({pastMeetings.length})
            </Text>
            {pastMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={{
                  id: meeting.id,
                  title: meeting.title,
                  client: meeting.client_name || 'Unknown',
                  date: meeting.start_time,
                  duration: `${Math.max(
                    1,
                    Math.round(
                      (new Date(meeting.end_time).getTime() -
                        new Date(meeting.start_time).getTime()) /
                        60000
                    )
                  )} min`,
                  summary: meeting.summary || '',
                  status: 'completed',
                }}
                onPress={handleMeetingPress}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
});
