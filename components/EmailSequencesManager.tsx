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
  Switch,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useEmailSequences,
  useEmailSequence,
  useCreateEmailSequence,
  useUpdateEmailSequence,
  useDeleteEmailSequence,
  useValidateSequence,
  EmailSequence,
  EmailSequenceWithSteps,
} from '@/hooks/useEmailSequences';
import { useSequenceEnrollmentStats } from '@/hooks/useSequenceEnrollments';
import { useAlert } from '@/contexts/CustomAlertContext';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Users,
  Mail,
  ChevronRight,
  X,
  Save,
} from 'lucide-react-native';
import SequenceStepBuilder from './SequenceStepBuilder';
import SequenceEnrollmentManager from './SequenceEnrollmentManager';

interface EmailSequencesManagerProps {
  onSelectSequence?: (sequence: EmailSequence) => void;
  mode?: 'select' | 'manage';
}

export default function EmailSequencesManager({
  onSelectSequence,
  mode = 'manage',
}: EmailSequencesManagerProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [showEditor, setShowEditor] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(
    null
  );
  const [showStepBuilder, setShowStepBuilder] = useState(false);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(
    null
  );
  const [showEnrollmentManager, setShowEnrollmentManager] = useState(false);
  const [selectedSequenceForEnrollment, setSelectedSequenceForEnrollment] =
    useState<{ id: string; name: string } | null>(null);

  // Form state
  const [sequenceName, setSequenceName] = useState('');
  const [sequenceDescription, setSequenceDescription] = useState('');

  // Hooks
  const { data: sequences = [], isLoading } = useEmailSequences();
  const createSequence = useCreateEmailSequence();
  const updateSequence = useUpdateEmailSequence();
  const deleteSequence = useDeleteEmailSequence();
  const validateSequence = useValidateSequence();

  const handleCreateNew = () => {
    setEditingSequence(null);
    setSequenceName('');
    setSequenceDescription('');
    setShowEditor(true);
  };

  const handleEdit = (sequence: EmailSequence) => {
    setEditingSequence(sequence);
    setSequenceName(sequence.name);
    setSequenceDescription(sequence.description || '');
    setShowEditor(true);
  };

  const handleManageSteps = (sequenceId: string) => {
    setSelectedSequenceId(sequenceId);
    setShowStepBuilder(true);
  };

  const handleManageEnrollments = (
    sequenceId: string,
    sequenceName: string
  ) => {
    setSelectedSequenceForEnrollment({ id: sequenceId, name: sequenceName });
    setShowEnrollmentManager(true);
  };

  const handleSelect = (sequence: EmailSequence) => {
    if (mode === 'select' && onSelectSequence) {
      onSelectSequence(sequence);
    }
  };

  const handleSave = async () => {
    if (!sequenceName.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Sequence name is required.',
      });
      return;
    }

    try {
      if (editingSequence) {
        await updateSequence.mutateAsync({
          id: editingSequence.id,
          name: sequenceName.trim(),
          description: sequenceDescription.trim() || null,
        });
        showAlert({
          title: 'Success',
          message: 'Sequence updated successfully.',
        });
      } else {
        const newSequence = await createSequence.mutateAsync({
          name: sequenceName.trim(),
          description: sequenceDescription.trim() || null,
          active: false,
        });
        showAlert({
          title: 'Success',
          message: 'Sequence created successfully. Now add steps to it.',
        });
        // Open step builder for new sequence
        setSelectedSequenceId(newSequence.id);
        setShowStepBuilder(true);
      }
      setShowEditor(false);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to save sequence. Please try again.',
      });
    }
  };

  const handleToggleActive = async (sequence: EmailSequence) => {
    if (!sequence.active) {
      // Validate before activating
      try {
        const validation = await validateSequence.mutateAsync(sequence.id);
        if (!validation.isValid) {
          showAlert({
            title: 'Validation Failed',
            message: validation.errors.join('\n'),
          });
          return;
        }
      } catch (error) {
        showAlert({
          title: 'Error',
          message: 'Failed to validate sequence.',
        });
        return;
      }
    }

    try {
      await updateSequence.mutateAsync({
        id: sequence.id,
        active: !sequence.active,
      });
      showAlert({
        title: 'Success',
        message: `Sequence ${
          !sequence.active ? 'activated' : 'deactivated'
        } successfully.`,
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to update sequence status.',
      });
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingSequence(null);
  };

  const handleCloseStepBuilder = () => {
    setShowStepBuilder(false);
    setSelectedSequenceId(null);
  };

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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Email Sequences
        </Text>
        {mode === 'manage' && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateNew}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.createButtonText}>New Sequence</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sequence List */}
      <ScrollView style={styles.listContainer}>
        {sequences.length === 0 ? (
          <View style={styles.emptyState}>
            <Mail size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No sequences yet
            </Text>
            {mode === 'manage' && (
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleCreateNew}
              >
                <Text style={styles.emptyButtonText}>Create Sequence</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          sequences.map((sequence) => (
            <SequenceCard
              key={sequence.id}
              sequence={sequence}
              colors={colors}
              mode={mode}
              onEdit={handleEdit}
              onManageSteps={handleManageSteps}
              onManageEnrollments={handleManageEnrollments}
              onToggleActive={handleToggleActive}
              onSelect={handleSelect}
            />
          ))
        )}
      </ScrollView>

      {/* Editor Modal */}
      <Modal
        visible={showEditor}
        animationType="slide"
        onRequestClose={handleCloseEditor}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={handleCloseEditor}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingSequence ? 'Edit Sequence' : 'New Sequence'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={createSequence.isPending || updateSequence.isPending}
            >
              {createSequence.isPending || updateSequence.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Save size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editorForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Sequence Name *
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
                placeholder="e.g., Lead Nurture Campaign"
                placeholderTextColor={colors.textSecondary}
                value={sequenceName}
                onChangeText={setSequenceName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Describe the purpose of this sequence..."
                placeholderTextColor={colors.textSecondary}
                value={sequenceDescription}
                onChangeText={setSequenceDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Step Builder Modal */}
      {selectedSequenceId && (
        <Modal
          visible={showStepBuilder}
          animationType="slide"
          onRequestClose={handleCloseStepBuilder}
        >
          <SequenceStepBuilder
            sequenceId={selectedSequenceId}
            onClose={handleCloseStepBuilder}
          />
        </Modal>
      )}

      {/* Enrollment Manager Modal */}
      {selectedSequenceForEnrollment && (
        <Modal
          visible={showEnrollmentManager}
          animationType="slide"
          onRequestClose={() => setShowEnrollmentManager(false)}
        >
          <SequenceEnrollmentManager
            sequenceId={selectedSequenceForEnrollment.id}
            sequenceName={selectedSequenceForEnrollment.name}
            onClose={() => setShowEnrollmentManager(false)}
          />
        </Modal>
      )}
    </View>
  );
}

// Sequence Card Component
interface SequenceCardProps {
  sequence: EmailSequence;
  colors: any;
  mode: 'select' | 'manage';
  onEdit: (sequence: EmailSequence) => void;
  onManageSteps: (sequenceId: string) => void;
  onManageEnrollments: (sequenceId: string, sequenceName: string) => void;
  onToggleActive: (sequence: EmailSequence) => void;
  onSelect: (sequence: EmailSequence) => void;
}

function SequenceCard({
  sequence,
  colors,
  mode,
  onEdit,
  onManageSteps,
  onManageEnrollments,
  onToggleActive,
  onSelect,
}: SequenceCardProps) {
  const { showAlert } = useAlert();
  const deleteSequence = useDeleteEmailSequence();
  const { data: stats } = useSequenceEnrollmentStats(sequence.id);
  const { data: sequenceWithSteps } = useEmailSequence(sequence.id);

  const handlePress = () => {
    if (mode === 'select') {
      onSelect(sequence);
    } else {
      onManageSteps(sequence.id);
    }
  };

  const handleDelete = () => {
    if (stats && stats.active > 0) {
      showAlert({
        title: 'Cannot Delete Sequence',
        message: `This sequence has ${stats.active} active enrollment(s). Please cancel all enrollments before deleting.`,
      });
      return;
    }

    showAlert({
      title: 'Delete Sequence',
      message: `Are you sure you want to delete "${sequence.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteSequence.mutateAsync(sequence.id);
          showAlert({
            title: 'Success',
            message: 'Sequence deleted successfully.',
          });
        } catch (error: any) {
          showAlert({
            title: 'Error',
            message: error.message || 'Failed to delete sequence.',
          });
        }
      },
    });
  };

  const stepCount = sequenceWithSteps?.steps?.length || 0;

  return (
    <TouchableOpacity
      style={[
        styles.sequenceCard,
        {
          backgroundColor: colors.surface,
          borderColor: sequence.active ? colors.primary : colors.border,
          borderWidth: sequence.active ? 2 : 1,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.sequenceCardHeader}>
        <View style={styles.sequenceCardTitle}>
          <Mail
            size={20}
            color={sequence.active ? colors.primary : colors.text}
          />
          <Text
            style={[styles.sequenceName, { color: colors.text }]}
            numberOfLines={1}
          >
            {sequence.name}
          </Text>
          {sequence.active && (
            <View
              style={[
                styles.activeBadge,
                { backgroundColor: `${colors.primary}20` },
              ]}
            >
              <Text style={[styles.activeBadgeText, { color: colors.primary }]}>
                Active
              </Text>
            </View>
          )}
        </View>
        {mode === 'manage' && (
          <View style={styles.sequenceCardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(sequence)}
            >
              <Edit size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
              disabled={deleteSequence.isPending}
            >
              {deleteSequence.isPending ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Trash2 size={18} color={colors.error} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {sequence.description && (
        <Text
          style={[styles.sequenceDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {sequence.description}
        </Text>
      )}

      <View style={styles.sequenceStats}>
        <View style={styles.statItem}>
          <Mail size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {stepCount} {stepCount === 1 ? 'step' : 'steps'}
          </Text>
        </View>
        {stats && (
          <View style={styles.statItem}>
            <Users size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {stats.active} active
            </Text>
          </View>
        )}
        <ChevronRight size={16} color={colors.textSecondary} />
      </View>

      {mode === 'manage' && (
        <View style={styles.sequenceCardFooter}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              {
                backgroundColor: sequence.active
                  ? `${colors.warning}20`
                  : `${colors.primary}20`,
              },
            ]}
            onPress={() => onToggleActive(sequence)}
          >
            {sequence.active ? (
              <Pause size={16} color={colors.warning} />
            ) : (
              <Play size={16} color={colors.primary} />
            )}
            <Text
              style={[
                styles.toggleButtonText,
                { color: sequence.active ? colors.warning : colors.primary },
              ]}
            >
              {sequence.active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: `${colors.primary}20` },
            ]}
            onPress={() => onManageEnrollments(sequence.id, sequence.name)}
          >
            <Users size={16} color={colors.primary} />
            <Text style={[styles.toggleButtonText, { color: colors.primary }]}>
              Enrollments
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
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
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
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
  sequenceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sequenceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sequenceCardTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sequenceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sequenceCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  sequenceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  sequenceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
  },
  sequenceCardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
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
  editorForm: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
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
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
