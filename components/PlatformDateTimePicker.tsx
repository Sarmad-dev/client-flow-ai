import React from 'react';
import {
  Platform,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Calendar, Clock } from 'lucide-react-native';

interface PlatformDateTimePickerProps {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  minimumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onBackdropPress?: () => void;
}

export function PlatformDateTimePicker({
  value,
  onChange,
  minimumDate,
  mode = 'datetime',
  display = 'default',
  onBackdropPress,
}: PlatformDateTimePickerProps) {
  const { colors } = useTheme();

  // For web platform, show a custom date/time picker
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        style={styles.webContainer}
        activeOpacity={1}
        onPress={onBackdropPress}
      >
        <TouchableOpacity
          style={styles.webPickerContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.webPicker, { backgroundColor: colors.surface }]}>
            <Text style={[styles.webTitle, { color: colors.text }]}>
              Select Date & Time
            </Text>

            {/* Date Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Date:
              </Text>
              <input
                type="date"
                value={value.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  newDate.setHours(value.getHours());
                  newDate.setMinutes(value.getMinutes());
                  onChange({ type: 'set' }, newDate);
                }}
                min={minimumDate?.toISOString().split('T')[0]}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  fontSize: 16,
                  width: '100%',
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }}
              />
            </View>

            {/* Time Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Time:
              </Text>
              <input
                type="time"
                value={`${value.getHours().toString().padStart(2, '0')}:${value
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value
                    .split(':')
                    .map(Number);
                  const newDate = new Date(value);
                  newDate.setHours(hours);
                  newDate.setMinutes(minutes);
                  onChange({ type: 'set' }, newDate);
                }}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  fontSize: 16,
                  width: '100%',
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                }}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[
                  styles.quickButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  const now = new Date();
                  onChange({ type: 'set' }, now);
                }}
              >
                <Text style={styles.quickButtonText}>Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickButton,
                  { backgroundColor: colors.secondary },
                ]}
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  onChange({ type: 'set' }, tomorrow);
                }}
              >
                <Text style={styles.quickButtonText}>Tomorrow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  // For native platforms, use the modal DateTimePicker for consistency
  const DateTimePickerModal = require('react-native-modal-datetime-picker').default;

  const handleNativeChange = (selectedDate: Date) => {
    // Call the original onChange with a consistent event structure
    onChange({ type: 'set' }, selectedDate);
  };

  const handleCancel = () => {
    // Call onChange with dismiss event
    onChange({ type: 'dismissed' });
  };

  return (
    <DateTimePickerModal
      isVisible={true}
      mode={mode}
      onConfirm={handleNativeChange}
      onCancel={handleCancel}
      minimumDate={minimumDate}
      display={display}
    />
  );
}

const styles = StyleSheet.create({
  webContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  webPickerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPicker: {
    padding: 24,
    borderRadius: 16,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quickButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
