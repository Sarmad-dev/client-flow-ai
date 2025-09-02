import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { CalendarList } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useMeetings } from '@/hooks/useMeetings';
import { useTasks } from '@/hooks/useTasks';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const meetings = useMeetings().data ?? [];
  const tasks = useTasks().data ?? [];
  const google = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const dayItems = useMemo(() => {
    const items: { date: string; title: string; kind: 'task' | 'meeting' }[] =
      [];
    for (const t of tasks) {
      if (!t.due_date) continue;
      items.push({
        date: t.due_date.slice(0, 10),
        title: `Task: ${t.title}`,
        kind: 'task',
      });
    }
    for (const m of meetings) {
      if (!m.start_time) continue;
      items.push({
        date: m.start_time.slice(0, 10),
        title: `Meeting: ${m.title}`,
        kind: 'meeting',
      });
    }
    return items;
  }, [tasks, meetings]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const it of dayItems) {
      marks[it.date] = {
        ...(marks[it.date] || {}),
        marked: true,
        dotColor: it.kind === 'task' ? colors.primary : colors.secondary,
      };
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: colors.primary,
    };
    return marks;
  }, [dayItems, selectedDate, colors.primary, colors.secondary]);

  const selectedItems = useMemo(
    () => dayItems.filter((d) => d.date === selectedDate),
    [dayItems, selectedDate]
  );

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
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        pastScrollRange={3}
        futureScrollRange={6}
        markedDates={markedDates}
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

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {selectedItems.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No items</Text>
        ) : (
          selectedItems.map((it, idx) => (
            <View
              key={idx}
              style={[
                styles.listItem,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={{ color: colors.text }}>{it.title}</Text>
            </View>
          ))
        )}
      </ScrollView>
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
});
