import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import {
  X,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Calendar,
  SquareCheck as CheckSquare,
  ExternalLink,
  Send,
  PhoneCall,
  Edit,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { ClientEditModal } from '@/components/clients/ClientEditModal';
import { ClientRecord } from '@/hooks/useClients';
import ServerDecryptedEmailList from '@/components/ServerDecryptedEmailList';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmailComposer from './EmailComposer';

interface ClientDetailViewProps {
  visible: boolean;
  onClose: () => void;
  clientId: string;
  onClientUpdated?: () => void;
}

export function ClientDetailView({
  visible,
  onClose,
  clientId,
  onClientUpdated,
}: ClientDetailViewProps) {
  const { colors } = useTheme();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);

  useEffect(() => {
    if (visible && clientId) {
      loadClientData();
    }
  }, [visible, clientId]);

  const loadClientData = async () => {
    try {
      // Load client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData as ClientRecord);

      // Load related tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Load related meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('client_id', clientId)
        .order('start_time', { ascending: false });

      if (meetingsError) throw meetingsError;
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error('Error loading client data:', error);
      Alert.alert('Error', 'Failed to load client details');
    } finally {
    }
  };

  const handlePhoneCall = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  };

  const handleWhatsAppCall = () => {
    if (client?.whatsapp_phone || client?.phone) {
      const phone = (client.whatsapp_phone || client.phone) as string;
      Linking.openURL(`https://wa.me/${phone.replace(/[^\d]/g, '')}`);
    }
  };

  const handleWhatsAppMessage = () => {
    if (client?.whatsapp_phone || client?.phone) {
      const phone = (client.whatsapp_phone || client.phone) as string;
      Linking.openURL(
        `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=Hi ${client.name}!`
      );
    }
  };

  const handleEmail = () => {
    if (client?.email) {
      setShowEmailComposer(true);
    }
  };

  const handleMaps = () => {
    if (client?.address) {
      const encodedAddress = encodeURIComponent(client.address);
      Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'prospect':
        return colors.warning;
      case 'inactive':
        return colors.textSecondary;
      case 'closed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  if (!client) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Client Details
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowEditModal(true)}
            >
              <Edit size={18} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Client Info Card */}
          <View
            style={[styles.clientCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.clientHeader}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <User size={32} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {client.name}
                </Text>
                <View style={styles.companyRow}>
                  <Building
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[styles.company, { color: colors.textSecondary }]}
                  >
                    {client.company || 'No company'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(client.status) },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: colors.text }]}>
                    {client.status.charAt(0).toUpperCase() +
                      client.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonPadded,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handlePhoneCall}
                activeOpacity={0.9}
              >
                <PhoneCall size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  Call
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonPadded,
                  { backgroundColor: '#25D366' },
                ]}
                onPress={handleWhatsAppCall}
                activeOpacity={0.9}
              >
                <Phone size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  WhatsApp
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonPadded,
                  { backgroundColor: '#25D366' },
                ]}
                onPress={handleWhatsAppMessage}
                activeOpacity={0.9}
              >
                <MessageCircle size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  Message
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.actionButtonPadded,
                  { backgroundColor: colors.secondary },
                ]}
                onPress={handleEmail}
                activeOpacity={0.9}
              >
                <Mail size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contact Details */}
            <View style={styles.contactDetails}>
              {client.email && (
                <View style={styles.contactItem}>
                  <Mail
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {client.email}
                  </Text>
                </View>
              )}

              {client.phone && (
                <View style={styles.contactItem}>
                  <Phone
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {client.phone}
                  </Text>
                </View>
              )}

              {client.address && (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={handleMaps}
                >
                  <MapPin
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    {client.address}
                  </Text>
                  <ExternalLink
                    size={14}
                    color={colors.primary}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Notes */}
            {client.notes && (
              <View style={styles.notesSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Notes
                </Text>
                <Text
                  style={[styles.contactText, { color: colors.textSecondary }]}
                >
                  {client.notes}
                </Text>
              </View>
            )}
          </View>

          {/* Tasks Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <CheckSquare size={20} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Tasks ({tasks.length})
              </Text>
            </View>
            {tasks.length > 0 ? (
              tasks.slice(0, 5).map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, { color: colors.text }]}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMeta}>
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: getPriorityColor(task.priority) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.taskMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {task.priority} • {task.tag}
                      </Text>
                      {task.due_date && (
                        <Text
                          style={[
                            styles.taskMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          • Due {new Date(task.due_date).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.taskStatus,
                      {
                        backgroundColor:
                          task.status === 'completed'
                            ? colors.success
                            : colors.warning,
                      },
                    ]}
                  >
                    <Text style={styles.taskStatusText}>
                      {task.status === 'completed' ? '✓' : '○'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tasks yet
              </Text>
            )}
          </View>

          {/* Meetings Section */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={colors.secondary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Meetings ({meetings.length})
              </Text>
            </View>
            {meetings.length > 0 ? (
              meetings.slice(0, 3).map((meeting) => (
                <View key={meeting.id} style={styles.meetingItem}>
                  <Text style={[styles.meetingTitle, { color: colors.text }]}>
                    {meeting.title}
                  </Text>
                  <Text
                    style={[
                      styles.meetingDate,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {new Date(meeting.start_time).toLocaleDateString()} at{' '}
                    {new Date(meeting.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {meeting.summary && (
                    <Text
                      style={[
                        styles.meetingSummary,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {meeting.summary}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No meetings yet
              </Text>
            )}
          </View>

          {/* Email Communications */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Send size={20} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Email History
              </Text>
            </View>
            <View style={{ height: 300 }}>
              <ServerDecryptedEmailList
                clientId={clientId}
                limit={10}
                onEmailPress={(email) => {
                  // Handle email press - could open email detail view
                  console.log('Email pressed:', email);
                }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Edit Modal */}
        <ClientEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          client={client}
          onUpdated={(updatedClient) => {
            setClient(updatedClient);
            setShowEditModal(false);
            onClientUpdated?.();
          }}
        />

        {/* Email Composer Modal */}
        <Modal
          visible={showEmailComposer}
          animationType="slide"
          onRequestClose={() => setShowEmailComposer(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <EmailComposer
              clientId={clientId}
              to={client?.email || undefined}
              onSent={() => setShowEmailComposer(false)}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  clientCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    marginLeft: 16,
    flex: 1,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonPadded: {
    paddingHorizontal: 8,
    minHeight: 40,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 80,
  },
  contactDetails: {
    gap: 12,
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  notesSection: {
    marginTop: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskMetaText: {
    fontSize: 12,
    fontWeight: '400',
  },
  taskStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  meetingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  meetingDate: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
  },
  meetingSummary: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  emailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  emailDirection: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emailDirectionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emailDate: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  emailPreview: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
