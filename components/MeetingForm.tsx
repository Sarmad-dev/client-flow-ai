import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { X, Calendar, Clock, User, MapPin, Video } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import * as CalendarAPI from 'expo-calendar';

interface MeetingFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (meeting: any) => void;
  clients: Array<{ id: string; name: string; company: string }>;
  initialData?: {
    title?: string;
    description?: string;
    selectedClient?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    meetingType?: 'in-person' | 'video' | 'phone';
    agenda?: string;
  };
}

export function MeetingForm({
  visible,
  onClose,
  onSubmit,
  clients,
  initialData,
}: MeetingFormProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [selectedClient, setSelectedClient] = useState<string>(
    initialData?.selectedClient || ''
  );
  const [startDate, setStartDate] = useState<Date>(
    initialData?.startDate || new Date()
  );
  const [endDate, setEndDate] = useState<Date>(
    initialData?.endDate || new Date(Date.now() + 60 * 60 * 1000)
  ); // 1 hour later
  const [location, setLocation] = useState(initialData?.location || '');
  const [meetingType, setMeetingType] = useState<
    'in-person' | 'video' | 'phone'
  >(initialData?.meetingType || 'video');
  const [agenda, setAgenda] = useState(initialData?.agenda || '');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(true);

  // Update form state when initialData changes
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setSelectedClient(initialData.selectedClient || '');
      setStartDate(initialData.startDate || new Date());
      setEndDate(initialData.endDate || new Date(Date.now() + 60 * 60 * 1000));
      setLocation(initialData.location || '');
      setMeetingType(initialData.meetingType || 'video');
      setAgenda(initialData.agenda || '');
    }
  }, [initialData]);

  const meetingTypes = [
    { value: 'video', label: 'Video Call', icon: Video },
    { value: 'phone', label: 'Phone Call', icon: Clock },
    { value: 'in-person', label: 'In Person', icon: MapPin },
  ];

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    const meetingData = {
      title: title.trim(),
      description: description.trim(),
      clientId: selectedClient,
      startDate: startDate,
      endDate: endDate,
      location: location.trim(),
      meetingType: meetingType,
      agenda: agenda.trim(),
    };

    // Add to Google Calendar if enabled
    if (addToCalendar) {
      await addToGoogleCalendar({
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        clientId: selectedClient,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: location.trim(),
        type: meetingType,
        agenda: agenda.trim(),
        status: 'upcoming',
        createdAt: new Date().toISOString(),
      });
    }

    onSubmit(meetingData);
    resetForm();
    onClose();
  };

  const addToGoogleCalendar = async (meeting: any) => {
    try {
      const { status } = await CalendarAPI.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await CalendarAPI.getCalendarsAsync();
        const defaultCalendar = calendars.find(
          (cal) => cal.source.name === 'Default'
        );

        if (defaultCalendar) {
          await CalendarAPI.createEventAsync(defaultCalendar.id, {
            title: meeting.title,
            notes: `${meeting.description}\n\nAgenda:\n${meeting.agenda}`,
            location: meeting.location,
            startDate: new Date(meeting.startDate),
            endDate: new Date(meeting.endDate),
            allDay: false,
          });
        }
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
    }
  };

  const resetForm = () => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setSelectedClient(initialData.selectedClient || '');
      setStartDate(initialData.startDate || new Date());
      setEndDate(initialData.endDate || new Date(Date.now() + 60 * 60 * 1000));
      setLocation(initialData.location || '');
      setMeetingType(initialData.meetingType || 'video');
      setAgenda(initialData.agenda || '');
    } else {
      // Reset to default values if no initialData
      setTitle('');
      setDescription('');
      setSelectedClient('');
      setStartDate(new Date());
      setEndDate(new Date(Date.now() + 60 * 60 * 1000));
      setLocation('');
      setMeetingType('video');
      setAgenda('');
    }
  };

  const selectedClientData = clients.find((c) => c.id === selectedClient);

  return (
    <>
      {/* Client Picker Sheet - Full Screen Modal */}
      <Modal
        visible={showClientPicker}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowClientPicker(false)}
      >
        <SafeAreaView
          style={[
            styles.pickerFullScreen,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>
              Select Client
            </Text>
            <TouchableOpacity onPress={() => setShowClientPicker(false)}>
              <X size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.clientList}
            showsVerticalScrollIndicator={false}
          >
            {clients.length > 0 ? (
              clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientOption,
                    { backgroundColor: colors.surface },
                    selectedClient === client.id && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedClient(client.id);
                    setShowClientPicker(false);
                  }}
                >
                  <View
                    style={[
                      styles.clientAvatar,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <User size={16} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text
                      style={[
                        styles.clientName,
                        {
                          color:
                            selectedClient === client.id
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {client.name}
                    </Text>
                    <Text
                      style={[
                        styles.clientCompany,
                        {
                          color:
                            selectedClient === client.id
                              ? '#FFFFFF'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {client.company}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  No clients found. Please add clients first.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
                Schedule Meeting
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Meeting Title */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Meeting Title *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Enter meeting title..."
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Client Selection */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Client *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.picker,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowClientPicker(true)}
                >
                  <User
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.pickerText,
                      {
                        color: selectedClient
                          ? colors.text
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {selectedClientData
                      ? `${selectedClientData.name} - ${selectedClientData.company}`
                      : 'Select client'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Meeting Type */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Meeting Type
                </Text>
                <View style={styles.typeGrid}>
                  {meetingTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        meetingType === type.value && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setMeetingType(
                          type.value as 'in-person' | 'video' | 'phone'
                        )
                      }
                    >
                      <type.icon
                        size={16}
                        color={
                          meetingType === type.value
                            ? '#FFFFFF'
                            : colors.textSecondary
                        }
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.typeText,
                          {
                            color:
                              meetingType === type.value
                                ? '#FFFFFF'
                                : colors.text,
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Start Date & Time */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Start Date & Time
                </Text>
                <TouchableOpacity
                  style={[
                    styles.picker,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Calendar
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text style={[styles.pickerText, { color: colors.text }]}>
                    {startDate.toLocaleDateString()} at{' '}
                    {startDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* End Date & Time */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  End Date & Time
                </Text>
                <TouchableOpacity
                  style={[
                    styles.picker,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Clock
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text style={[styles.pickerText, { color: colors.text }]}>
                    {endDate.toLocaleDateString()} at{' '}
                    {endDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Location */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {meetingType === 'video'
                    ? 'Meeting Link'
                    : meetingType === 'phone'
                    ? 'Phone Number'
                    : 'Location'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder={
                    meetingType === 'video'
                      ? 'Enter Zoom/Teams link...'
                      : meetingType === 'phone'
                      ? 'Enter phone number...'
                      : 'Enter meeting location...'
                  }
                  placeholderTextColor={colors.textSecondary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Description
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Add meeting description..."
                  placeholderTextColor={colors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Agenda */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Agenda
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Meeting agenda and topics to discuss..."
                  placeholderTextColor={colors.textSecondary}
                  value={agenda}
                  onChangeText={setAgenda}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Calendar Integration */}
              <View style={styles.field}>
                <TouchableOpacity
                  style={styles.calendarToggle}
                  onPress={() => setAddToCalendar(!addToCalendar)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.border },
                      addToCalendar && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    {addToCalendar && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.calendarText, { color: colors.text }]}>
                    Add to Google Calendar
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: colors.surface },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitText}>Schedule Meeting</Text>
              </TouchableOpacity>
            </View>

            {/* Date Pickers */}
            <DateTimePickerModal
              isVisible={showStartDatePicker}
              mode="datetime"
              onConfirm={(date) => {
                setStartDate(date);
                // Auto-adjust end date to be 1 hour later
                setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
                setShowStartDatePicker(false);
              }}
              onCancel={() => setShowStartDatePicker(false)}
              minimumDate={new Date()}
            />

            <DateTimePickerModal
              isVisible={showEndDatePicker}
              mode="datetime"
              onConfirm={(date) => {
                setEndDate(date);
                setShowEndDatePicker(false);
              }}
              onCancel={() => setShowEndDatePicker(false)}
              minimumDate={startDate}
            />
          </View>
        </View>
      </Modal>
    </>
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
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  textArea: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '400',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  calendarText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerFullScreen: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  clientList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientCompany: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
});
