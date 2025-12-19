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
import { MeetingForm } from '@/components/MeetingForm';
import { useClients } from '@/hooks/useClients';
import { useMeetings, useCreateMeeting } from '@/hooks/useMeetings';
import type { EnrichedMeeting } from '@/types/meeting-management';
import { MeetingFormData } from '@/lib/validation';
import { CustomAlert } from '@/components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MeetingDetailModal } from '@/components/MeetingDetailModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';

export default function MeetingsScreen() {
  const { colors } = useTheme();
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<EnrichedMeeting | null>(null);
  const [showMeetingDetail, setShowMeetingDetail] = useState(false);
  const { data: meetings = [] } = useMeetings();
  const { data: clients = [] } = useClients();
  const createMeeting = useCreateMeeting();

  const {
    guardMeetingsAccess,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
    });
  };

  const handleCreateMeeting = async (form: MeetingFormData) => {
    try {
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
        voice_recording_id: null,
        google_calendar_event_id: null,
        zoom_meeting_id: null,
        teams_meeting_id: null,
        meet_link: null,
        template_id: null,
        engagement_score: null,
        preparation_sent: false,
        follow_up_sent: false,
        status: 'scheduled' as const,
      };
      await createMeeting.mutateAsync(payload);
      setShowMeetingForm(false);
    } catch (error) {
      console.error('Error creating meeting:', error);
      showAlert('Error', 'Failed to create meeting. Please try again.');
    }
  };

  const handleMeetingPress = (meeting: EnrichedMeeting) => {
    setSelectedMeeting(meeting);
    setShowMeetingDetail(true);
  };

  const handleSummaryUpdated = (meetingId: string, summary: string) => {
    // Update the selected meeting with the new summary
    if (selectedMeeting) {
      setSelectedMeeting({
        ...selectedMeeting,
        summary: summary,
      });
    }
    // Keep the modal open to show the updated summary
  };

  const handleMeetingUpdated = (updatedMeeting: EnrichedMeeting) => {
    // Update the selected meeting with any changes
    setSelectedMeeting(updatedMeeting);
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
        onMeetingUpdated={handleMeetingUpdated}
      />

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideAlert}
        onConfirm={alertConfig.onConfirm}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Meetings</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (guardMeetingsAccess()) {
                setShowMeetingForm((prev) => !prev);
              }
            }}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Upcoming ({upcomingMeetings.length})
              </Text>
              {upcomingMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
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
                meeting={meeting}
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
