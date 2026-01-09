import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { X, Search, Calendar, User, Building } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import { PlatformDateTimePicker } from '../PlatformDateTimePicker';

interface Client {
  id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
}

interface ClientSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onClientSelected: (client: Client, dueDate: Date) => void;
  suggestedClientName?: string;
  suggestedDueDate?: string;
  taskTitle: string;
  taskDescription?: string;
}

export function ClientSelectionModal({
  visible,
  onClose,
  onClientSelected,
  suggestedClientName,
  suggestedDueDate,
  taskTitle,
  taskDescription,
}: ClientSelectionModalProps) {
  const { colors } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState(suggestedClientName || '');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dueDate, setDueDate] = useState<Date>(() => {
    if (suggestedDueDate) {
      const parsed = new Date(suggestedDueDate);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadClients();
    }
  }, [visible]);

  useEffect(() => {
    if (suggestedClientName && clients.length > 0) {
      setSearchQuery(suggestedClientName);
      filterClients(suggestedClientName);
    }
  }, [suggestedClientName, clients]);

  // Additional effect to handle initial filtering when clients are loaded
  useEffect(() => {
    if (clients.length > 0 && suggestedClientName) {
      // Small delay to ensure state is properly set
      const timer = setTimeout(() => {
        setSearchQuery(suggestedClientName);
        filterClients(suggestedClientName);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [clients, suggestedClientName]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company, email, phone')
        .order('name');

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const filterClients = (query: string) => {
    if (!query.trim()) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query.toLowerCase()) ||
        client.company.toLowerCase().includes(query.toLowerCase()) ||
        client.email?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredClients(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterClients(text);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Handle Android dismiss
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    // Handle iOS dismiss
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      setDueDate(selectedDate);
      // Close picker on iOS and web after selection
      if (Platform.OS === 'ios' || Platform.OS === 'web') {
        setShowDatePicker(false);
      }
    }
  };

  const handleBackdropPress = () => {
    if (Platform.OS === 'web') {
      setShowDatePicker(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    onClientSelected(selectedClient, dueDate);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Assign Task to Client
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Task Info */}
        <View style={[styles.taskInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.taskTitle, { color: colors.text }]}>
            {taskTitle}
          </Text>
          {taskDescription && (
            <Text
              style={[styles.taskDescription, { color: colors.textSecondary }]}
            >
              {taskDescription}
            </Text>
          )}
        </View>

        {/* Search Bar */}
        <View
          style={[styles.searchContainer, { backgroundColor: colors.surface }]}
        >
          <Search size={20} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search clients..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        </View>

        {/* Client List */}
        <ScrollView
          style={styles.clientList}
          showsVerticalScrollIndicator={false}
        >
          {filteredClients.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={[
                styles.clientItem,
                { backgroundColor: colors.surface },
                selectedClient?.id === client.id && {
                  backgroundColor: colors.primary + '20',
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => handleClientSelect(client)}
            >
              <View
                style={[
                  styles.clientAvatar,
                  { backgroundColor: colors.primary },
                ]}
              >
                <User size={20} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {client.name}
                </Text>
                <Text
                  style={[
                    styles.clientCompany,
                    { color: colors.textSecondary },
                  ]}
                >
                  {client.company}
                </Text>
                {client.email && (
                  <Text
                    style={[
                      styles.clientEmail,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {client.email}
                  </Text>
                )}
              </View>
              {selectedClient?.id === client.id && (
                <View
                  style={[
                    styles.selectedIndicator,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Due Date Selection */}
        <View
          style={[styles.dateContainer, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.dateLabel, { color: colors.text }]}>
            Due Date
          </Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDate(dueDate)} at {formatTime(dueDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: colors.primary },
            !selectedClient && { opacity: 0.5 },
          ]}
          onPress={handleConfirm}
          disabled={!selectedClient}
        >
          <Text style={styles.confirmText}>Assign Task</Text>
        </TouchableOpacity>

        {/* Date Picker */}
        {showDatePicker && (
          <PlatformDateTimePicker
            value={dueDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
            onBackdropPress={handleBackdropPress}
          />
        )}
      </View>
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
  taskInfo: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    fontWeight: '400',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  clientList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  clientEmail: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
