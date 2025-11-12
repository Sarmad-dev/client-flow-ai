import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import {
  X,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  ArrowLeft,
  TriangleAlert as AlertTriangle,
  Users,
  Link2,
  Wand2,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTaskTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCreateTaskFromTemplate,
  useShareTemplate,
  useDuplicateTemplate,
  useTemplateVariables,
  useTemplateStats,
} from '@/hooks/useTaskTemplates';
import type { TaskTemplate, TemplateVariable } from '@/types/task-management';

interface TaskTemplateProps {
  visible: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'use' | 'browse';
  template?: TaskTemplate;
  onTemplateUsed?: (taskId: string) => void;
  clients?: Array<{ id: string; name: string; company: string }>;
}

interface TemplateFormData {
  name: string;
  description: string;
  task: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tag: 'follow-up' | 'proposal' | 'meeting' | 'call' | 'research' | 'design';
    estimated_hours: number | null;
  };
  subtasks: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tag: 'follow-up' | 'proposal' | 'meeting' | 'call' | 'research' | 'design';
    estimated_hours: number | null;
  }>;
  dependencies: Array<{ from: number; to: number }>;
  is_public: boolean;
}

const WIZARD_STEPS = [
  {
    id: 'basic',
    title: 'Basic Info',
    description: 'Template name and description',
  },
  { id: 'task', title: 'Main Task', description: 'Primary task details' },
  { id: 'subtasks', title: 'Subtasks', description: 'Add subtasks (optional)' },
  {
    id: 'dependencies',
    title: 'Dependencies',
    description: 'Task relationships (optional)',
  },
  { id: 'settings', title: 'Settings', description: 'Sharing and visibility' },
  { id: 'preview', title: 'Preview', description: 'Review and save' },
];

const TAGS: (
  | 'follow-up'
  | 'proposal'
  | 'meeting'
  | 'call'
  | 'research'
  | 'design'
)[] = ['follow-up', 'proposal', 'meeting', 'call', 'research', 'design'];
const PRIORITIES = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'urgent', label: 'Urgent', color: '#DC2626' },
];

export function TaskTemplate({
  visible,
  onClose,
  mode,
  template,
  onTemplateUsed,
  clients = [],
}: TaskTemplateProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    task: {
      title: '',
      description: '',
      priority: 'medium',
      tag: 'follow-up',
      estimated_hours: null,
    },
    subtasks: [],
    dependencies: [],
    is_public: false,
  });
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(
    null
  );
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date>(new Date());

  // Hooks
  const { data: templates = [], isLoading } = useTaskTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const createTaskFromTemplate = useCreateTaskFromTemplate();
  const shareTemplate = useShareTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  // Template variables for preview/use mode
  const templateVariables = useTemplateVariables(
    selectedTemplate?.template_data ||
      template?.template_data || {
        task: {},
        subtasks: [],
        dependencies: [],
      }
  );

  // Template stats for selected template
  const { data: templateStats } = useTemplateStats(
    selectedTemplate?.id || template?.id || ''
  );

  // Initialize form data when editing
  useEffect(() => {
    if (mode === 'edit' && template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        task: template.template_data.task as any,
        subtasks: template.template_data.subtasks as any,
        dependencies: template.template_data.dependencies,
        is_public: template.is_public,
      });
    }
  }, [mode, template]);

  const handleClose = () => {
    setCurrentStep(0);
    setFormData({
      name: '',
      description: '',
      task: {
        title: '',
        description: '',
        priority: 'medium',
        tag: 'follow-up',
        estimated_hours: null,
      },
      subtasks: [],
      dependencies: [],
      is_public: false,
    });
    setVariables({});
    setSelectedTemplate(null);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter a template name');
        return;
      }

      if (!formData.task.title.trim()) {
        Alert.alert('Error', 'Please enter a task title');
        return;
      }

      const templateData = {
        name: formData.name,
        description: formData.description,
        template_data: {
          task: formData.task,
          subtasks: formData.subtasks,
          dependencies: formData.dependencies,
        },
        is_public: formData.is_public,
      };

      if (mode === 'edit' && template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          ...templateData,
        });
        Alert.alert('Success', 'Template updated successfully');
      } else {
        await createTemplate.mutateAsync(templateData);
        Alert.alert('Success', 'Template created successfully');
      }

      handleClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save template'
      );
    }
  };

  const handleUseTemplate = async () => {
    try {
      if (!selectedTemplate && !template) {
        Alert.alert('Error', 'No template selected');
        return;
      }

      if (!selectedClient) {
        Alert.alert('Error', 'Please select a client');
        return;
      }

      const templateToUse = selectedTemplate || template!;
      const result = await createTaskFromTemplate.mutateAsync({
        template_id: templateToUse.id,
        client_id: selectedClient,
        variables,
        due_date: dueDate.toISOString(),
      });

      Alert.alert('Success', 'Tasks created from template successfully');
      onTemplateUsed?.(result.parentTask.id);
      handleClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to create tasks from template'
      );
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate.mutateAsync(templateId);
              Alert.alert('Success', 'Template deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const handleShareTemplate = async (templateId: string) => {
    try {
      await shareTemplate.mutateAsync(templateId);
      Alert.alert('Success', 'Template is now public and can be shared');
    } catch (error) {
      Alert.alert('Error', 'Failed to share template');
    }
  };

  const handleDuplicateTemplate = async (templateId: string, name: string) => {
    try {
      await duplicateTemplate.mutateAsync({
        template_id: templateId,
        new_name: `${name} (Copy)`,
      });
      Alert.alert('Success', 'Template duplicated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate template');
    }
  };

  const addSubtask = () => {
    setFormData({
      ...formData,
      subtasks: [
        ...formData.subtasks,
        {
          title: '',
          description: '',
          priority: 'medium',
          tag: 'follow-up',
          estimated_hours: null,
        },
      ],
    });
  };

  const updateSubtask = (
    index: number,
    updates: Partial<(typeof formData.subtasks)[0]>
  ) => {
    const newSubtasks = [...formData.subtasks];
    newSubtasks[index] = { ...newSubtasks[index], ...updates };
    setFormData({ ...formData, subtasks: newSubtasks });
  };

  const removeSubtask = (index: number) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.filter((_, i) => i !== index),
    });
  };

  const renderWizardStep = () => {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case 'basic':
        return renderBasicInfoStep();
      case 'task':
        return renderTaskStep();
      case 'subtasks':
        return renderSubtasksStep();
      case 'dependencies':
        return renderDependenciesStep();
      case 'settings':
        return renderSettingsStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return null;
    }
  };

  const renderBasicInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Template Information
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Give your template a name and description to help identify its purpose.
      </Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>
          Template Name *
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
          placeholder="e.g., Client Onboarding Process"
          placeholderTextColor={colors.textSecondary}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Describe what this template is used for..."
          placeholderTextColor={colors.textSecondary}
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const renderTaskStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Main Task Details
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Define the primary task that will be created from this template.
      </Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Task Title *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="e.g., Initial client consultation"
          placeholderTextColor={colors.textSecondary}
          value={formData.task.title}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              task: { ...formData.task, title: text },
            })
          }
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Describe the task details..."
          placeholderTextColor={colors.textSecondary}
          value={formData.task.description}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              task: { ...formData.task, description: text },
            })
          }
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
          <View
            style={[
              styles.picker,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {PRIORITIES.map((priority) => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityOption,
                  formData.task.priority === priority.value && {
                    backgroundColor: priority.color + '20',
                  },
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    task: { ...formData.task, priority: priority.value as any },
                  })
                }
              >
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: priority.color },
                  ]}
                />
                <Text style={[styles.priorityLabel, { color: colors.text }]}>
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
          <Text style={[styles.label, { color: colors.text }]}>Tag</Text>
          <View
            style={[
              styles.picker,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagOption,
                  formData.task.tag === tag && {
                    backgroundColor: colors.primary + '20',
                  },
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    task: { ...formData.task, tag },
                  })
                }
              >
                <Text style={[styles.tagLabel, { color: colors.text }]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>
          Estimated Hours
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
          placeholder="e.g., 2.5"
          placeholderTextColor={colors.textSecondary}
          value={formData.task.estimated_hours?.toString() || ''}
          onChangeText={(text) =>
            setFormData({
              ...formData,
              task: {
                ...formData.task,
                estimated_hours: text ? parseFloat(text) : null,
              },
            })
          }
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderSubtasksStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Subtasks (Optional)
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Add subtasks that will be created along with the main task.
      </Text>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={addSubtask}
      >
        <Plus size={20} color="white" />
        <Text style={styles.addButtonText}>Add Subtask</Text>
      </TouchableOpacity>

      <ScrollView style={styles.subtasksList}>
        {formData.subtasks.map((subtask, index) => (
          <View
            key={index}
            style={[
              styles.subtaskCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.subtaskHeader}>
              <Text
                style={[styles.subtaskIndex, { color: colors.textSecondary }]}
              >
                Subtask {index + 1}
              </Text>
              <TouchableOpacity onPress={() => removeSubtask(index)}>
                <Trash2 size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Subtask title"
              placeholderTextColor={colors.textSecondary}
              value={subtask.title}
              onChangeText={(text) => updateSubtask(index, { title: text })}
            />

            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Subtask description"
              placeholderTextColor={colors.textSecondary}
              value={subtask.description}
              onChangeText={(text) =>
                updateSubtask(index, { description: text })
              }
              multiline
              numberOfLines={2}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderDependenciesStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Task Dependencies (Optional)
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Define relationships between tasks. Dependencies will be automatically
        handled when creating tasks from this template.
      </Text>

      {formData.subtasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Link2 size={48} color={colors.textSecondary} />
          <Text
            style={[styles.emptyStateText, { color: colors.textSecondary }]}
          >
            Add subtasks first to create dependencies
          </Text>
        </View>
      ) : (
        <View style={styles.dependenciesContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Available Tasks
          </Text>
          <View style={styles.taskList}>
            <View
              style={[styles.taskItem, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.taskItemText, { color: colors.text }]}>
                Main Task: {formData.task.title || 'Untitled'}
              </Text>
            </View>
            {formData.subtasks.map((subtask, index) => (
              <View
                key={index}
                style={[styles.taskItem, { backgroundColor: colors.surface }]}
              >
                <Text style={[styles.taskItemText, { color: colors.text }]}>
                  Subtask {index + 1}: {subtask.title || 'Untitled'}
                </Text>
              </View>
            ))}
          </View>
          <Text
            style={[styles.dependencyNote, { color: colors.textSecondary }]}
          >
            Dependencies will be automatically managed based on task creation
            order.
          </Text>
        </View>
      )}
    </View>
  );

  const renderSettingsStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Template Settings
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Configure sharing and visibility options for this template.
      </Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            Public Template
          </Text>
          <Text
            style={[styles.settingDescription, { color: colors.textSecondary }]}
          >
            Make this template available to other users in your organization
          </Text>
        </View>
        <Switch
          value={formData.is_public}
          onValueChange={(value) =>
            setFormData({ ...formData, is_public: value })
          }
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={formData.is_public ? 'white' : colors.textSecondary}
        />
      </View>

      {formData.is_public && (
        <View
          style={[styles.publicWarning, { backgroundColor: colors.surface }]}
        >
          <AlertTriangle size={20} color={colors.warning} />
          <Text style={[styles.publicWarningText, { color: colors.text }]}>
            Public templates can be viewed and used by other users in your
            organization.
          </Text>
        </View>
      )}
    </View>
  );

  const renderPreviewStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Template Preview
      </Text>
      <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
        Review your template before saving.
      </Text>

      <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.previewTitle, { color: colors.text }]}>
          {formData.name}
        </Text>
        {formData.description && (
          <Text
            style={[styles.previewDescription, { color: colors.textSecondary }]}
          >
            {formData.description}
          </Text>
        )}

        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, { color: colors.text }]}>
            Main Task
          </Text>
          <View
            style={[styles.previewTask, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.previewTaskTitle, { color: colors.text }]}>
              {formData.task.title}
            </Text>
            {formData.task.description && (
              <Text
                style={[
                  styles.previewTaskDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {formData.task.description}
              </Text>
            )}
            <View style={styles.previewTaskMeta}>
              <View style={styles.previewMetaItem}>
                <Text
                  style={[
                    styles.previewMetaLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Priority:
                </Text>
                <Text style={[styles.previewMetaValue, { color: colors.text }]}>
                  {formData.task.priority}
                </Text>
              </View>
              <View style={styles.previewMetaItem}>
                <Text
                  style={[
                    styles.previewMetaLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Tag:
                </Text>
                <Text style={[styles.previewMetaValue, { color: colors.text }]}>
                  {formData.task.tag}
                </Text>
              </View>
              {formData.task.estimated_hours && (
                <View style={styles.previewMetaItem}>
                  <Text
                    style={[
                      styles.previewMetaLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Hours:
                  </Text>
                  <Text
                    style={[styles.previewMetaValue, { color: colors.text }]}
                  >
                    {formData.task.estimated_hours}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {formData.subtasks.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, { color: colors.text }]}>
              Subtasks ({formData.subtasks.length})
            </Text>
            {formData.subtasks.map((subtask, index) => (
              <View
                key={index}
                style={[
                  styles.previewSubtask,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.previewSubtaskTitle, { color: colors.text }]}
                >
                  {subtask.title}
                </Text>
                {subtask.description && (
                  <Text
                    style={[
                      styles.previewSubtaskDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {subtask.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.previewSettings}>
          <Text style={[styles.previewSettingsTitle, { color: colors.text }]}>
            Settings
          </Text>
          <Text
            style={[
              styles.previewSettingsItem,
              { color: colors.textSecondary },
            ]}
          >
            Visibility: {formData.is_public ? 'Public' : 'Private'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  if (mode === 'browse') {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Browse Templates
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <Text
                  style={[styles.loadingText, { color: colors.textSecondary }]}
                >
                  Loading templates...
                </Text>
              </View>
            ) : templates.length === 0 ? (
              <View style={styles.emptyState}>
                <Wand2 size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  No Templates Found
                </Text>
                <Text
                  style={[
                    styles.emptyStateText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Create your first template to get started
                </Text>
              </View>
            ) : (
              <View style={styles.templateGrid}>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTemplate(template)}
                  >
                    <Text
                      style={[styles.templateCardTitle, { color: colors.text }]}
                    >
                      {template.name}
                    </Text>
                    {template.description && (
                      <Text
                        style={[
                          styles.templateCardDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {template.description}
                      </Text>
                    )}
                    <View style={styles.templateCardMeta}>
                      <Text
                        style={[
                          styles.templateCardMetaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {template.template_data.subtasks?.length || 0} subtasks
                      </Text>
                      {template.is_public && (
                        <View style={styles.publicBadge}>
                          <Users size={12} color={colors.primary} />
                          <Text
                            style={[
                              styles.publicBadgeText,
                              { color: colors.primary },
                            ]}
                          >
                            Public
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  if (mode === 'use' && (selectedTemplate || template)) {
    const templateToUse = selectedTemplate || template!;

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Use Template: {templateToUse.name}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>
                Select Client *
              </Text>
              <View
                style={[
                  styles.picker,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientOption,
                      selectedClient === client.id && {
                        backgroundColor: colors.primary + '20',
                      },
                    ]}
                    onPress={() => setSelectedClient(client.id)}
                  >
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
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {templateVariables.length > 0 && (
              <View style={styles.variablesSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Template Variables
                </Text>
                {templateVariables.map((variable) => (
                  <View key={variable.key} style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {variable.label} {variable.required && '*'}
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
                      placeholder={`Enter ${variable.label.toLowerCase()}`}
                      placeholderTextColor={colors.textSecondary}
                      value={variables[variable.key] || ''}
                      onChangeText={(text) =>
                        setVariables({ ...variables, [variable.key]: text })
                      }
                    />
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.useButton,
                { backgroundColor: colors.primary },
                (!selectedClient || createTaskFromTemplate.isPending) && {
                  opacity: 0.5,
                },
              ]}
              onPress={handleUseTemplate}
              disabled={!selectedClient || createTaskFromTemplate.isPending}
            >
              <Text style={styles.useButtonText}>
                {createTaskFromTemplate.isPending
                  ? 'Creating Tasks...'
                  : 'Create Tasks from Template'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {mode === 'edit' ? 'Edit Template' : 'Create Template'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View
          style={[styles.wizardHeader, { backgroundColor: colors.surface }]}
        >
          <View style={styles.stepIndicator}>
            {WIZARD_STEPS.map((step, index) => (
              <View key={step.id} style={styles.stepIndicatorItem}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        index <= currentStep ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color:
                          index <= currentStep ? 'white' : colors.textSecondary,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                {index < WIZARD_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      {
                        backgroundColor:
                          index < currentStep ? colors.primary : colors.border,
                      },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {WIZARD_STEPS[currentStep].title}
          </Text>
          <Text
            style={[styles.stepDescription, { color: colors.textSecondary }]}
          >
            {WIZARD_STEPS[currentStep].description}
          </Text>
        </View>

        <ScrollView style={styles.content}>{renderWizardStep()}</ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.footerButton,
              { backgroundColor: colors.surface },
              currentStep === 0 && { opacity: 0.5 },
            ]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft size={20} color={colors.text} />
            <Text style={[styles.footerButtonText, { color: colors.text }]}>
              Previous
            </Text>
          </TouchableOpacity>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.primaryButton,
                { backgroundColor: colors.primary },
                (createTemplate.isPending || updateTemplate.isPending) && {
                  opacity: 0.5,
                },
              ]}
              onPress={handleSaveTemplate}
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              <Save size={20} color="white" />
              <Text style={styles.primaryButtonText}>
                {createTemplate.isPending || updateTemplate.isPending
                  ? 'Saving...'
                  : mode === 'edit'
                  ? 'Update Template'
                  : 'Create Template'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <ArrowRight size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  wizardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  subtasksList: {
    maxHeight: 400,
  },
  subtaskCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subtaskIndex: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dependenciesContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  taskList: {
    marginBottom: 16,
  },
  taskItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dependencyNote: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  publicWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  publicWarningText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  previewCard: {
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewTask: {
    padding: 12,
    borderRadius: 8,
  },
  previewTaskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewTaskDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  previewTaskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  previewMetaLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  previewMetaValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewSubtask: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  previewSubtaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  previewSubtaskDescription: {
    fontSize: 12,
  },
  previewSettings: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewSettingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewSettingsItem: {
    fontSize: 12,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
  },
  templateGrid: {
    padding: 16,
  },
  templateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateCardDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  templateCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateCardMetaText: {
    fontSize: 12,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  clientOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
  },
  clientCompany: {
    fontSize: 12,
  },
  variablesSection: {
    marginTop: 16,
  },
  useButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  useButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
});
