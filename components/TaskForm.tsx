import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  X,
  Calendar,
  User,
  Tag,
  TriangleAlert as AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (task: any) => void;
  clients: Array<{ id: string; name: string; company: string }>;
  initialData?: {
    title?: string;
    description?: string;
    selectedClient?: string;
    dueDate?: Date;
    selectedTag?: string;
    priority?: 'low' | 'medium' | 'high';
  };
}

export function TaskForm({
  visible,
  onClose,
  onSubmit,
  clients,
  initialData,
}: TaskFormProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [selectedClient, setSelectedClient] = useState<string>(
    initialData?.selectedClient || ''
  );
  const [dueDate, setDueDate] = useState<Date>(
    initialData?.dueDate || new Date()
  );
  const [selectedTag, setSelectedTag] = useState(
    initialData?.selectedTag || 'follow-up'
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
    initialData?.priority || 'medium'
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(true);
  const gc = useGoogleCalendar();

  const tags = [
    'follow-up',
    'proposal',
    'meeting',
    'call',
    'research',
    'design',
  ];
  const priorities = [
    { value: 'low', label: 'Low', color: colors.success },
    { value: 'medium', label: 'Medium', color: colors.warning },
    { value: 'high', label: 'High', color: colors.error },
  ];

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    const task = {
      user_id: user?.id,
      title: title.trim(),
      description: description.trim(),
      client_id: selectedClient,
      due_date: dueDate.toISOString(),
      tag: selectedTag,
      status: 'pending',
      priority,
      created_at: new Date().toISOString(),
    };

    // Add to Google Calendar if enabled
    if (addToCalendar) {
      await addToGoogleCalendar(task);
    }

    onSubmit(task);
    resetForm();
    onClose();
  };

  const addToGoogleCalendar = async (task: any) => {
    try {
      // Ensure Google connected
      if (!gc.isConnected) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Connect Google Calendar',
            'To add this task to your Google Calendar, please connect your Google account.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Connect',
                style: 'default',
                onPress: async () => {
                  await gc.connect();
                  resolve(true);
                },
              },
            ]
          );
        });
        if (!proceed) return;
      }

      const start = new Date(task.due_date || task.dueDate || new Date());
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      await gc.createCalendarEvent({
        summary: task.title,
        description: task.description,
        start: { dateTime: start.toISOString(), timeZone: 'UTC' },
        end: { dateTime: end.toISOString(), timeZone: 'UTC' },
      });
    } catch (error) {
      console.error('Error adding to calendar:', error);
    }
  };

  const resetForm = () => {
    setTitle(initialData?.title || '');
    setDescription(initialData?.description || '');
    setSelectedClient(initialData?.selectedClient || '');
    setDueDate(initialData?.dueDate || new Date());
    setSelectedTag(initialData?.selectedTag || 'follow-up');
    setPriority(initialData?.priority || 'medium');
  };

  const selectedClientData = clients.find((c) => c.id === selectedClient);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Task
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Task Title *
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
              placeholder="Enter task title..."
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              multiline
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
              placeholder="Add task details..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Client Selection */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Client *</Text>
            <TouchableOpacity
              style={[
                styles.picker,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowClientPicker(true)}
            >
              <User size={20} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[
                  styles.pickerText,
                  {
                    color: selectedClient ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                {selectedClientData
                  ? `${selectedClientData.name} - ${selectedClientData.company}`
                  : 'Select client'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Due Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Due Date</Text>
            <TouchableOpacity
              style={[
                styles.picker,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar
                size={20}
                color={colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {dueDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tag Selection */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Tag</Text>
            <View style={styles.tagGrid}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagOption,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    selectedTag === tag && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedTag(tag)}
                >
                  <Tag
                    size={16}
                    color={
                      selectedTag === tag ? '#FFFFFF' : colors.textSecondary
                    }
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.tagText,
                      { color: selectedTag === tag ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority Selection */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
            <View style={styles.priorityGrid}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityOption,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    priority === p.value && {
                      backgroundColor: p.color,
                      borderColor: p.color,
                    },
                  ]}
                  onPress={() =>
                    setPriority(p.value as 'low' | 'medium' | 'high')
                  }
                >
                  <AlertTriangle
                    size={16}
                    color={priority === p.value ? '#FFFFFF' : p.color}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.priorityText,
                      { color: priority === p.value ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
            {addToCalendar && !gc.isConnected && (
              <TouchableOpacity style={{ marginTop: 8 }} onPress={gc.connect}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  Connect Google Calendar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitText}>Create Task</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          onConfirm={(date) => {
            setDueDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
          minimumDate={new Date()}
        />

        {/* Client Picker Modal */}
        <Modal
          visible={showClientPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowClientPicker(false)}
        >
          <View
            style={[styles.pickerModal, { backgroundColor: colors.background }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Select Client
              </Text>
              <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                <X size={24} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.clientList}>
              {clients.map((client) => (
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
              ))}
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
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
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  priorityText: {
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
  pickerModal: {
    flex: 1,
    paddingTop: 60,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  clientList: {
    flex: 1,
    paddingHorizontal: 24,
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
});
