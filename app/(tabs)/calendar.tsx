import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { CalendarList } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useMeetings, type EnrichedMeeting } from '@/hooks/useMeetings';
import { useTasks, type TaskRecord } from '@/hooks/useTasks';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { MeetingDetailModal } from '@/components/MeetingDetailModal';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const meetings = useMeetings().data ?? [];
  const tasks = useTasks().data ?? [];
  const google = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskRecord[]> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      const d = t.due_date.slice(0, 10);
      map[d] = map[d] ? [...map[d], t] : [t];
    }
    return map;
  }, [tasks]);

  const meetingsByDate = useMemo(() => {
    const map: Record<string, EnrichedMeeting[]> = {};
    for (const m of meetings) {
      if (!m.start_time) continue;
      const d = m.start_time.slice(0, 10);
      map[d] = map[d] ? [...map[d], m] : [m];
    }
    return map;
  }, [meetings]);

  const firstItemTitleByDate = useMemo(() => {
    const map: Record<string, string> = {};
    const dateKeys = new Set<string>([
      ...Object.keys(tasksByDate),
      ...Object.keys(meetingsByDate),
    ]);
    for (const d of dateKeys) {
      const t = tasksByDate[d]?.[0];
      const m = meetingsByDate[d]?.[0];
      const chosen = t ?? m;
      if (!chosen) continue;
      const prefix = t ? 'Task: ' : 'Meeting: ';
      map[d] = `${prefix}${(chosen as any).title}`;
    }
    return map;
  }, [tasksByDate, meetingsByDate]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const d of Object.keys(tasksByDate)) {
      marks[d] = {
        ...(marks[d] || {}),
        marked: true,
        dotColor: colors.primary,
      };
    }
    for (const d of Object.keys(meetingsByDate)) {
      marks[d] = {
        ...(marks[d] || {}),
        marked: true,
        dotColor: colors.secondary,
      };
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: colors.primary,
    };
    return marks;
  }, [
    tasksByDate,
    meetingsByDate,
    selectedDate,
    colors.primary,
    colors.secondary,
  ]);

  const [showDateDialog, setShowDateDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<EnrichedMeeting | null>(null);
  const [showMeetingDetail, setShowMeetingDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [showTaskEdit, setShowTaskEdit] = useState(false);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
        {!google.isConnected && (
          <TouchableOpacity
            onPress={google.connect}
            style={[styles.connectBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Connect Google Calendar
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <CalendarList
        onDayPress={(day: DateData) => {
          setSelectedDate(day.dateString);
          setShowDateDialog(true);
        }}
        pastScrollRange={3}
        futureScrollRange={6}
        markedDates={markedDates}
        dayComponent={({ date }) => {
          if (!date) return null;
          const d = date.dateString;
          const title = firstItemTitleByDate[d];
          const isSelected = d === selectedDate;
          return (
            <TouchableOpacity
              onPress={() => {
                setSelectedDate(d);
                setShowDateDialog(true);
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 4,
                borderRadius: 8,
                backgroundColor: isSelected ? colors.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#fff' : colors.text,
                  fontWeight: '700',
                  marginBottom: title ? 4 : 0,
                  textAlign: 'center',
                }}
              >
                {date.day}
              </Text>
              {title ? (
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    color: isSelected ? '#fff' : colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {title}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
        theme={{
          calendarBackground: colors.background,
          dayTextColor: colors.text,
          monthTextColor: colors.text,
          textMonthFontWeight: '800',
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#fff',
          todayTextColor: colors.primary,
          dotColor: colors.primary,
          selectedDotColor: '#fff',
          arrowColor: colors.text,
        }}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      />

      {/* Date items dialog */}
      <Modal visible={showDateDialog} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Items on {selectedDate}
            </Text>

            <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 12 }}>
              <View>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  Tasks ({tasksByDate[selectedDate]?.length ?? 0})
                </Text>
                {(tasksByDate[selectedDate] ?? []).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      setSelectedTask(t);
                      setShowTaskEdit(true);
                      setShowDateDialog(false);
                    }}
                    style={[
                      styles.listItem,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ color: colors.text }}
                    >
                      {t.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  Meetings ({meetingsByDate[selectedDate]?.length ?? 0})
                </Text>
                {(meetingsByDate[selectedDate] ?? []).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => {
                      setSelectedMeeting(m);
                      setShowMeetingDetail(true);
                      setShowDateDialog(false);
                    }}
                    style={[
                      styles.listItem,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ color: colors.text }}
                    >
                      {m.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowDateDialog(false)}
              style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meeting Detail */}
      <MeetingDetailModal
        meeting={selectedMeeting}
        visible={showMeetingDetail}
        onClose={() => setShowMeetingDetail(false)}
      />

      {/* Task Edit (acts as detail) */}
      <TaskEditModal
        visible={showTaskEdit}
        onClose={() => setShowTaskEdit(false)}
        task={selectedTask}
        onUpdated={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800' },
  connectBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  listItem: { borderWidth: 1, borderRadius: 10, padding: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
