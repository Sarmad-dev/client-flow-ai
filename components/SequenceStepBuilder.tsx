import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { useTheme } from '@/hooks/useTheme';
import {
  useEmailSequence,
  useCreateSequenceStep,
  useUpdateSequenceStep,
  useDeleteSequenceStep,
  useBulkUpdateSequenceSteps,
  SequenceStep,
} from '@/hooks/useEmailSequences';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useAlert } from '@/contexts/CustomAlertContext';
import {
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Clock,
  Mail,
  FileText,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

interface SequenceStepBuilderProps {
  sequenceId: string;
  onClose: () => void;
}

export default function SequenceStepBuilder({
  sequenceId,
  onClose,
}: SequenceStepBuilderProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Form state
  const [stepOrder, setStepOrder] = useState(0);
  const [delayHours, setDelayHours] = useState('24');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [customSubject, setCustomSubject] = useState('');
  const [customBodyHtml, setCustomBodyHtml] = useState('');
  const richRef = useRef<RichEditor>(null);

  // Hooks
  const { data: sequenceData, isLoading } = useEmailSequence(sequenceId);
  const { data: templates = [] } = useEmailTemplates();
  const createStep = useCreateSequenceStep();
  const updateStep = useUpdateSequenceStep();
  const deleteStep = useDeleteSequenceStep();
  const bulkUpdateSteps = useBulkUpdateSequenceSteps();

  const steps = sequenceData?.steps || [];

  const editorCssText = `body{padding:8px;font-size:16px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  const handleAddStep = () => {
    setEditingStep(null);
    setStepOrder(steps.length);
    setDelayHours('24');
    setSelectedTemplateId(null);
    setCustomSubject('');
    setCustomBodyHtml('');
    setTimeout(() => {
      richRef.current?.setContentHTML('');
    }, 100);
    setShowStepEditor(true);
  };

  const handleEditStep = (step: SequenceStep) => {
    setEditingStep(step);
    setStepOrder(step.step_order);
    setDelayHours(step.delay_hours.toString());
    setSelectedTemplateId(step.template_id);
    setCustomSubject(step.subject || '');
    setCustomBodyHtml(step.body_html || '');
    setTimeout(() => {
      richRef.current?.setContentHTML(step.body_html || '');
    }, 100);
    setShowStepEditor(true);
  };

  const handleSaveStep = async () => {
    const delay = parseInt(delayHours, 10);
    if (isNaN(delay) || delay < 0) {
      showAlert({
        title: 'Validation Error',
        message: 'Delay hours must be a positive number.',
      });
      return;
    }

    // Validate that either template or custom content is provided
    if (!selectedTemplateId && !customSubject.trim()) {
      showAlert({
        title: 'Validation Error',
        message:
          'Please select a template or provide custom subject and content.',
      });
      return;
    }

    try {
      const htmlContent = await richRef.current?.getContentHtml();
      const textContent = htmlContent?.replace(/<[^>]*>/g, '') || '';

      if (editingStep) {
        await updateStep.mutateAsync({
          id: editingStep.id,
          sequence_id: sequenceId,
          step_order: stepOrder,
          delay_hours: delay,
          template_id: selectedTemplateId,
          subject: customSubject.trim() || null,
          body_html: htmlContent?.trim() || null,
          body_text: textContent.trim() || null,
        });
        showAlert({
          title: 'Success',
          message: 'Step updated successfully.',
        });
      } else {
        await createStep.mutateAsync({
          sequence_id: sequenceId,
          step_order: stepOrder,
          delay_hours: delay,
          template_id: selectedTemplateId,
          subject: customSubject.trim() || null,
          body_html: htmlContent?.trim() || null,
          body_text: textContent.trim() || null,
        });
        showAlert({
          title: 'Success',
          message: 'Step added successfully.',
        });
      }
      setShowStepEditor(false);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to save step. Please try again.',
      });
    }
  };

  const handleDeleteStep = (step: SequenceStep) => {
    showAlert({
      title: 'Delete Step',
      message: `Are you sure you want to delete step ${step.step_order + 1}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteStep.mutateAsync({
            stepId: step.id,
            sequenceId,
          });
          showAlert({
            title: 'Success',
            message: 'Step deleted successfully.',
          });
        } catch (error) {
          showAlert({
            title: 'Error',
            message: 'Failed to delete step.',
          });
        }
      },
    });
  };

  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    const currentIndex = steps.findIndex((s) => s.id === stepId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const reorderedSteps = [...steps];
    const [movedStep] = reorderedSteps.splice(currentIndex, 1);
    reorderedSteps.splice(newIndex, 0, movedStep);

    const updates = reorderedSteps.map((step, index) => ({
      id: step.id,
      step_order: index,
    }));

    try {
      await bulkUpdateSteps.mutateAsync({
        steps: updates,
        sequenceId,
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to reorder steps.',
      });
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleCloseEditor = () => {
    setShowStepEditor(false);
    setEditingStep(null);
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.text }]}>
            {sequenceData?.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddStep}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Steps List */}
      <ScrollView style={styles.stepsContainer}>
        {steps.length === 0 ? (
          <View style={styles.emptyState}>
            <Mail size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No steps yet
            </Text>
            <Text
              style={[styles.emptySubtext, { color: colors.textSecondary }]}
            >
              Add steps to build your email sequence
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleAddStep}
            >
              <Text style={styles.emptyButtonText}>Add First Step</Text>
            </TouchableOpacity>
          </View>
        ) : (
          steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              totalSteps={steps.length}
              colors={colors}
              templates={templates}
              isExpanded={expandedSteps.has(step.id)}
              onToggleExpanded={() => toggleStepExpanded(step.id)}
              onEdit={handleEditStep}
              onDelete={handleDeleteStep}
              onMoveUp={() => handleMoveStep(step.id, 'up')}
              onMoveDown={() => handleMoveStep(step.id, 'down')}
            />
          ))
        )}
      </ScrollView>

      {/* Step Editor Modal */}
      <Modal
        visible={showStepEditor}
        animationType="slide"
        onRequestClose={handleCloseEditor}
      >
        <KeyboardAvoidingView
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={handleCloseEditor}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingStep ? 'Edit Step' : 'New Step'}
            </Text>
            <TouchableOpacity
              onPress={handleSaveStep}
              disabled={createStep.isPending || updateStep.isPending}
            >
              {createStep.isPending || updateStep.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Save size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editorForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Delay (hours) *
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
                placeholder="24"
                placeholderTextColor={colors.textSecondary}
                value={delayHours}
                onChangeText={setDelayHours}
                keyboardType="numeric"
              />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Hours to wait before sending this email
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Template (Optional)
              </Text>
              <View
                style={[
                  styles.templateSelector,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.templateButton}
                  onPress={() => {
                    // Show template picker
                  }}
                >
                  <FileText size={20} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.templateButtonText,
                      {
                        color: selectedTemplateId
                          ? colors.text
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {selectedTemplateId
                      ? templates.find((t) => t.id === selectedTemplateId)
                          ?.name || 'Select template'
                      : 'Select template'}
                  </Text>
                </TouchableOpacity>
                {selectedTemplateId && (
                  <TouchableOpacity onPress={() => setSelectedTemplateId(null)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Custom Subject
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
                placeholder="Email subject line"
                placeholderTextColor={colors.textSecondary}
                value={customSubject}
                onChangeText={setCustomSubject}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Custom Body Content
              </Text>
              <View
                style={[
                  styles.richEditorContainer,
                  { borderColor: colors.border },
                ]}
              >
                <RichToolbar
                  editor={richRef}
                  actions={[
                    actions.setBold,
                    actions.setItalic,
                    actions.setUnderline,
                    actions.insertBulletsList,
                    actions.insertOrderedList,
                    actions.insertLink,
                  ]}
                  iconTint={colors.text}
                  selectedIconTint={colors.primary}
                  style={{ backgroundColor: colors.surface }}
                />
                <RichEditor
                  ref={richRef}
                  style={[
                    styles.richEditor,
                    { backgroundColor: colors.surface },
                  ]}
                  editorStyle={{
                    backgroundColor: colors.surface,
                    color: colors.text,
                    contentCSSText: editorCssText,
                  }}
                  placeholder="Enter email body content..."
                  onChange={(html) => setCustomBodyHtml(html)}
                  initialContentHTML={customBodyHtml}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Step Card Component
interface StepCardProps {
  step: SequenceStep;
  index: number;
  totalSteps: number;
  colors: any;
  templates: any[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onEdit: (step: SequenceStep) => void;
  onDelete: (step: SequenceStep) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function StepCard({
  step,
  index,
  totalSteps,
  colors,
  templates,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  const template = templates.find((t) => t.id === step.template_id);

  return (
    <View
      style={[
        styles.stepCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.stepCardHeader}
        onPress={onToggleExpanded}
      >
        <View style={styles.stepCardTitle}>
          <View
            style={[
              styles.stepNumber,
              { backgroundColor: `${colors.primary}20` },
            ]}
          >
            <Text style={[styles.stepNumberText, { color: colors.primary }]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.stepInfo}>
            <View style={styles.stepDelay}>
              <Clock size={14} color={colors.textSecondary} />
              <Text
                style={[styles.stepDelayText, { color: colors.textSecondary }]}
              >
                {step.delay_hours}h delay
              </Text>
            </View>
            {template && (
              <View style={styles.stepTemplate}>
                <FileText size={14} color={colors.primary} />
                <Text
                  style={[styles.stepTemplateText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {template.name}
                </Text>
              </View>
            )}
            {step.subject && !template && (
              <Text
                style={[styles.stepSubject, { color: colors.text }]}
                numberOfLines={1}
              >
                {step.subject}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.stepCardActions}>
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.stepCardContent}>
          {step.subject && (
            <View style={styles.stepDetail}>
              <Text
                style={[
                  styles.stepDetailLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Subject:
              </Text>
              <Text style={[styles.stepDetailValue, { color: colors.text }]}>
                {step.subject}
              </Text>
            </View>
          )}
          {step.body_text && (
            <View style={styles.stepDetail}>
              <Text
                style={[
                  styles.stepDetailLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Content:
              </Text>
              <Text
                style={[styles.stepDetailValue, { color: colors.text }]}
                numberOfLines={3}
              >
                {step.body_text}
              </Text>
            </View>
          )}

          <View style={styles.stepActions}>
            <View style={styles.stepMoveButtons}>
              <TouchableOpacity
                style={[
                  styles.moveButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={onMoveUp}
                disabled={index === 0}
              >
                <GripVertical
                  size={16}
                  color={index === 0 ? colors.textSecondary : colors.text}
                />
                <Text
                  style={[
                    styles.moveButtonText,
                    {
                      color: index === 0 ? colors.textSecondary : colors.text,
                    },
                  ]}
                >
                  Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.moveButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={onMoveDown}
                disabled={index === totalSteps - 1}
              >
                <GripVertical
                  size={16}
                  color={
                    index === totalSteps - 1
                      ? colors.textSecondary
                      : colors.text
                  }
                />
                <Text
                  style={[
                    styles.moveButtonText,
                    {
                      color:
                        index === totalSteps - 1
                          ? colors.textSecondary
                          : colors.text,
                    },
                  ]}
                >
                  Down
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.stepEditButtons}>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: `${colors.primary}20` },
                ]}
                onPress={() => onEdit(step)}
              >
                <Edit size={16} color={colors.primary} />
                <Text
                  style={[styles.editButtonText, { color: colors.primary }]}
                >
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  { backgroundColor: `${colors.error}20` },
                ]}
                onPress={() => onDelete(step)}
              >
                <Trash2 size={16} color={colors.error} />
                <Text
                  style={[styles.deleteButtonText, { color: colors.error }]}
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
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
  stepsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
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
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  stepCardTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepInfo: {
    flex: 1,
    gap: 4,
  },
  stepDelay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDelayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepTemplate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepTemplateText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  stepSubject: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepCardActions: {
    padding: 4,
  },
  stepCardContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  stepDetail: {
    gap: 4,
  },
  stepDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stepDetailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  stepMoveButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  moveButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepEditButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
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
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
  templateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateButtonText: {
    fontSize: 16,
  },
  richEditorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 250,
  },
  richEditor: {
    minHeight: 200,
  },
});
