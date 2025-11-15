import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useSequenceEnrollmentsWithDetails,
  useCreateSequenceEnrollment,
  useBulkEnrollContacts,
  useCancelSequenceEnrollment,
  usePauseSequenceEnrollment,
  useResumeSequenceEnrollment,
  SequenceEnrollmentWithDetails,
} from '@/hooks/useSequenceEnrollments';
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';
import { useAlert } from '@/contexts/CustomAlertContext';
import {
  Plus,
  X,
  Users,
  Mail,
  Clock,
  CheckCircle,
  Pause,
  Play,
  XCircle,
  Search,
} from 'lucide-react-native';

interface SequenceEnrollmentManagerProps {
  sequenceId: string;
  sequenceName: string;
  onClose: () => void;
}

export default function SequenceEnrollmentManager({
  sequenceId,
  sequenceName,
  onClose,
}: SequenceEnrollmentManagerProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Hooks
  const { data: enrollments = [], isLoading } =
    useSequenceEnrollmentsWithDetails(sequenceId);
  const { data: clients = [] } = useClients();
  const { data: leads = [] } = useLeads();
  const createEnrollment = useCreateSequenceEnrollment();
  const bulkEnroll = useBulkEnrollContacts();
  const cancelEnrollment = useCancelSequenceEnrollment();
  const pauseEnrollment = usePauseSequenceEnrollment();
  const resumeEnrollment = useResumeSequenceEnrollment();

  const handleEnrollSingle = async () => {
    if (!enrollEmail.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter an email address.',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(enrollEmail.trim())) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    try {
      // Find matching client or lead
      const client = clients.find(
        (c) => c.email?.toLowerCase() === enrollEmail.toLowerCase()
      );
      const lead = leads.find(
        (l) => l.email?.toLowerCase() === enrollEmail.toLowerCase()
      );

      await createEnrollment.mutateAsync({
        sequence_id: sequenceId,
        contact_email: enrollEmail.trim(),
        client_id: client?.id || null,
        lead_id: lead?.id || null,
        current_step: 0,
        status: 'active',
        last_email_sent_at: null,
        next_email_scheduled_at: null,
      });

      showAlert({
        title: 'Success',
        message: 'Contact enrolled successfully.',
      });
      setEnrollEmail('');
      setShowEnrollModal(false);
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to enroll contact.',
      });
    }
  };

  const handleBulkEnroll = async (selectedContacts: any[]) => {
    if (selectedContacts.length === 0) {
      showAlert({
        title: 'Validation Error',
        message: 'Please select at least one contact.',
      });
      return;
    }

    try {
      const contacts = selectedContacts.map((contact) => ({
        email: contact.email,
        client_id: contact.type === 'client' ? contact.id : null,
        lead_id: contact.type === 'lead' ? contact.id : null,
      }));

      const result = await bulkEnroll.mutateAsync({
        sequenceId,
        contacts,
      });

      showAlert({
        title: 'Success',
        message: `Enrolled ${result.enrolled} contact(s). ${
          result.skipped > 0
            ? `Skipped ${result.skipped} (already enrolled or suppressed).`
            : ''
        }`,
      });
      setShowBulkEnrollModal(false);
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to enroll contacts.',
      });
    }
  };

  const handleCancel = (enrollmentId: string) => {
    showAlert({
      title: 'Cancel Enrollment',
      message: 'Are you sure you want to cancel this enrollment?',
      confirmText: 'Cancel Enrollment',
      cancelText: 'Keep',
      onConfirm: async () => {
        try {
          await cancelEnrollment.mutateAsync(enrollmentId);
          showAlert({
            title: 'Success',
            message: 'Enrollment cancelled successfully.',
          });
        } catch (error) {
          showAlert({
            title: 'Error',
            message: 'Failed to cancel enrollment.',
          });
        }
      },
    });
  };

  const handlePause = async (enrollmentId: string) => {
    try {
      await pauseEnrollment.mutateAsync(enrollmentId);
      showAlert({
        title: 'Success',
        message: 'Enrollment paused successfully.',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to pause enrollment.',
      });
    }
  };

  const handleResume = async (enrollmentId: string) => {
    try {
      await resumeEnrollment.mutateAsync(enrollmentId);
      showAlert({
        title: 'Success',
        message: 'Enrollment resumed successfully.',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to resume enrollment.',
      });
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      enrollment.contact_email.toLowerCase().includes(query) ||
      enrollment.contact_name?.toLowerCase().includes(query)
    );
  });

  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const completedCount = enrollments.filter(
    (e) => e.status === 'completed'
  ).length;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>
            {sequenceName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {enrollments.length} enrollment(s)
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowEnrollModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Users size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {activeCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Active
          </Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {completedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Completed
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search enrollments..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.bulkButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowBulkEnrollModal(true)}
        >
          <Users size={18} color="#fff" />
          <Text style={styles.bulkButtonText}>Bulk</Text>
        </TouchableOpacity>
      </View>

      {/* Enrollments List */}
      <ScrollView style={styles.listContainer}>
        {filteredEnrollments.length === 0 ? (
          <View style={styles.emptyState}>
            <Mail size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim()
                ? 'No enrollments found'
                : 'No enrollments yet'}
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => setShowEnrollModal(true)}
              >
                <Text style={styles.emptyButtonText}>Enroll Contact</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredEnrollments.map((enrollment) => (
            <EnrollmentCard
              key={enrollment.id}
              enrollment={enrollment}
              colors={colors}
              onCancel={handleCancel}
              onPause={handlePause}
              onResume={handleResume}
            />
          ))
        )}
      </ScrollView>

      {/* Single Enroll Modal */}
      <Modal
        visible={showEnrollModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEnrollModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Enroll Contact
              </Text>
              <TouchableOpacity onPress={() => setShowEnrollModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: colors.text }]}>
                Email Address *
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
                placeholder="contact@example.com"
                placeholderTextColor={colors.textSecondary}
                value={enrollEmail}
                onChangeText={setEnrollEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleEnrollSingle}
                disabled={createEnrollment.isPending}
              >
                {createEnrollment.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Enroll</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Enroll Modal */}
      {showBulkEnrollModal && (
        <BulkEnrollModal
          visible={showBulkEnrollModal}
          onClose={() => setShowBulkEnrollModal(false)}
          clients={clients}
          leads={leads}
          onEnroll={handleBulkEnroll}
          isLoading={bulkEnroll.isPending}
          colors={colors}
        />
      )}
    </View>
  );
}

// Enrollment Card Component
interface EnrollmentCardProps {
  enrollment: SequenceEnrollmentWithDetails;
  colors: any;
  onCancel: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function EnrollmentCard({
  enrollment,
  colors,
  onCancel,
  onPause,
  onResume,
}: EnrollmentCardProps) {
  const getStatusColor = () => {
    switch (enrollment.status) {
      case 'active':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'paused':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (enrollment.status) {
      case 'active':
        return <Play size={14} color={getStatusColor()} />;
      case 'completed':
        return <CheckCircle size={14} color={getStatusColor()} />;
      case 'paused':
        return <Pause size={14} color={getStatusColor()} />;
      case 'cancelled':
        return <XCircle size={14} color={getStatusColor()} />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <View
      style={[
        styles.enrollmentCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.enrollmentHeader}>
        <View style={styles.enrollmentInfo}>
          <Text style={[styles.enrollmentEmail, { color: colors.text }]}>
            {enrollment.contact_name || enrollment.contact_email}
          </Text>
          {enrollment.contact_name && (
            <Text
              style={[
                styles.enrollmentSubtext,
                { color: colors.textSecondary },
              ]}
            >
              {enrollment.contact_email}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor()}20` },
          ]}
        >
          {getStatusIcon()}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {enrollment.status}
          </Text>
        </View>
      </View>

      <View style={styles.enrollmentDetails}>
        <View style={styles.detailRow}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            Step {enrollment.current_step + 1} of {enrollment.total_steps}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Mail size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            Enrolled: {formatDate(enrollment.enrolled_at)}
          </Text>
        </View>
        {enrollment.next_email_scheduled_at && (
          <View style={styles.detailRow}>
            <Clock size={14} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.primary }]}>
              Next: {formatDate(enrollment.next_email_scheduled_at)}
            </Text>
          </View>
        )}
      </View>

      {enrollment.status === 'active' && (
        <View style={styles.enrollmentActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: `${colors.warning}20` },
            ]}
            onPress={() => onPause(enrollment.id)}
          >
            <Pause size={16} color={colors.warning} />
            <Text style={[styles.actionButtonText, { color: colors.warning }]}>
              Pause
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: `${colors.error}20` },
            ]}
            onPress={() => onCancel(enrollment.id)}
          >
            <XCircle size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {enrollment.status === 'paused' && (
        <View style={styles.enrollmentActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: `${colors.primary}20` },
            ]}
            onPress={() => onResume(enrollment.id)}
          >
            <Play size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Resume
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: `${colors.error}20` },
            ]}
            onPress={() => onCancel(enrollment.id)}
          >
            <XCircle size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Bulk Enroll Modal Component
interface BulkEnrollModalProps {
  visible: boolean;
  onClose: () => void;
  clients: any[];
  leads: any[];
  onEnroll: (contacts: any[]) => void;
  isLoading: boolean;
  colors: any;
}

function BulkEnrollModal({
  visible,
  onClose,
  clients,
  leads,
  onEnroll,
  isLoading,
  colors,
}: BulkEnrollModalProps) {
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');

  const allContacts = [
    ...clients
      .filter((c) => c.email)
      .map((c) => ({ ...c, type: 'client', key: `client-${c.id}` })),
    ...leads
      .filter((l) => l.email)
      .map((l) => ({ ...l, type: 'lead', key: `lead-${l.id}` })),
  ];

  const filteredContacts = allContacts.filter((contact) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    );
  });

  const toggleContact = (key: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedContacts(newSelected);
  };

  const handleEnroll = () => {
    const contacts = allContacts.filter((c) => selectedContacts.has(c.key));
    onEnroll(contacts);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: colors.text }]}>
              Bulk Enroll
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {selectedContacts.size} selected
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.enrollButton,
              {
                backgroundColor:
                  selectedContacts.size > 0 ? colors.primary : colors.border,
              },
            ]}
            onPress={handleEnroll}
            disabled={selectedContacts.size === 0 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.enrollButtonText}>Enroll</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search contacts..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.contactItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => toggleContact(item.key)}
            >
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.contactEmail, { color: colors.textSecondary }]}
                >
                  {item.email}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: selectedContacts.has(item.key)
                      ? colors.primary
                      : colors.border,
                    backgroundColor: selectedContacts.has(item.key)
                      ? colors.primary
                      : 'transparent',
                  },
                ]}
              >
                {selectedContacts.has(item.key) && (
                  <CheckCircle size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.contactsList}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  enrollmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  enrollmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  enrollmentInfo: {
    flex: 1,
    gap: 4,
  },
  enrollmentEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  enrollmentSubtext: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  enrollmentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  enrollmentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  enrollButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contactsList: {
    padding: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
    gap: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 13,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
