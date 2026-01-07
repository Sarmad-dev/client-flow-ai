import React, { useState, useRef, useMemo } from 'react';
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
  useEmailTemplates,
  useSearchEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useTemplateUsageStats,
  useTemplateSequenceUsage,
  EmailTemplate,
} from '@/hooks/useEmailTemplates';
import { useAlert } from '@/contexts/CustomAlertContext';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
  FileText,
  AlertCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EmailTemplatesManagerProps {
  onSelectTemplate?: (template: EmailTemplate) => void;
  mode?: 'select' | 'manage';
}

export default function EmailTemplatesManager({
  onSelectTemplate,
  mode = 'manage',
}: EmailTemplatesManagerProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(
    null
  );

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBodyHtml, setTemplateBodyHtml] = useState('');
  const richRef = useRef<RichEditor>(null);

  // Hooks
  const { data: allTemplates = [], isLoading } = useEmailTemplates();
  const { data: searchResults = [] } = useSearchEmailTemplates(
    searchQuery.trim().length > 2 ? searchQuery : undefined
  );
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  // Determine which templates to display
  const displayedTemplates = useMemo(() => {
    if (searchQuery.trim().length > 2) {
      return searchResults;
    }
    return allTemplates;
  }, [searchQuery, searchResults, allTemplates]);

  const editorCssText = `body{padding:8px;font-size:16px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateBodyHtml('');
    setTimeout(() => {
      richRef.current?.setContentHTML('');
    }, 100);
    setShowEditor(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateSubject(template.subject || '');
    setTemplateBodyHtml(template.body_html || '');
    setTimeout(() => {
      richRef.current?.setContentHTML(template.body_html || '');
    }, 100);
    setShowEditor(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleSelect = (template: EmailTemplate) => {
    if (mode === 'select' && onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Template name is required.',
      });
      return;
    }

    try {
      const htmlContent = await richRef.current?.getContentHtml();
      const textContent = htmlContent?.replace(/<[^>]*>/g, '') || '';

      if (editingTemplate) {
        // Update existing template
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          name: templateName.trim(),
          subject: templateSubject.trim() || null,
          body_text: textContent.trim() || null,
          body_html: htmlContent?.trim() || null,
        });
        showAlert({
          title: 'Success',
          message: 'Template updated successfully.',
        });
      } else {
        // Create new template
        await createTemplate.mutateAsync({
          name: templateName.trim(),
          subject: templateSubject.trim() || null,
          body_text: textContent.trim() || null,
          body_html: htmlContent?.trim() || null,
        });
        showAlert({
          title: 'Success',
          message: 'Template created successfully.',
        });
      }
      setShowEditor(false);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to save template. Please try again.',
      });
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewTemplate(null);
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
      {/* Header with Search and Create Button */}
      <View style={styles.header}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search templates..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {mode === 'manage' && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateNew}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Template List */}
      <ScrollView style={styles.listContainer}>
        {displayedTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim().length > 2
                ? 'No templates found'
                : 'No templates yet'}
            </Text>
            {mode === 'manage' && searchQuery.trim().length === 0 && (
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleCreateNew}
              >
                <Text style={styles.emptyButtonText}>Create Template</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              colors={colors}
              mode={mode}
              onEdit={handleEdit}
              onPreview={handlePreview}
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
        <SafeAreaView>
          <KeyboardAvoidingView
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Editor Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity onPress={handleCloseEditor}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                {createTemplate.isPending || updateTemplate.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Save size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Editor Form */}
            <ScrollView style={styles.editorForm}>
              <View style={styles.formGroup}>
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
                  placeholder="e.g., Follow-up Email"
                  placeholderTextColor={colors.textSecondary}
                  value={templateName}
                  onChangeText={setTemplateName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Subject
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
                  value={templateSubject}
                  onChangeText={setTemplateSubject}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Body Content
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
                      actions.undo,
                      actions.redo,
                      actions.setBold,
                      actions.setItalic,
                      actions.setUnderline,
                      actions.setStrikethrough,
                      actions.heading1,
                      actions.heading2,
                      actions.heading3,
                      actions.insertBulletsList,
                      actions.insertOrderedList,
                      actions.checkboxList,
                      actions.alignLeft,
                      actions.alignCenter,
                      actions.alignRight,
                      actions.blockquote,
                      actions.code,
                      actions.insertLink,
                      actions.removeFormat,
                    ]}
                    iconMap={{
                      [actions.heading1]: ({
                        selected,
                      }: {
                        selected?: boolean;
                      }) => (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: selected
                              ? `${colors.primary}20`
                              : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? colors.primary : colors.text,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            H1
                          </Text>
                        </View>
                      ),
                      [actions.heading2]: ({
                        selected,
                      }: {
                        selected?: boolean;
                      }) => (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: selected
                              ? `${colors.primary}20`
                              : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? colors.primary : colors.text,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            H2
                          </Text>
                        </View>
                      ),
                      [actions.heading3]: ({
                        selected,
                      }: {
                        selected?: boolean;
                      }) => (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: selected
                              ? `${colors.primary}20`
                              : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? colors.primary : colors.text,
                              fontWeight: '800',
                              fontSize: 12,
                            }}
                          >
                            H3
                          </Text>
                        </View>
                      ),
                    }}
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
                    onChange={(html) => setTemplateBodyHtml(html)}
                    initialContentHTML={templateBodyHtml}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={handleClosePreview}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Preview Header */}
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={handleClosePreview}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Template Preview
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Preview Content */}
          {previewTemplate && (
            <ScrollView style={styles.previewContent}>
              <View style={styles.previewSection}>
                <Text
                  style={[styles.previewLabel, { color: colors.textSecondary }]}
                >
                  Template Name
                </Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>
                  {previewTemplate.name}
                </Text>
              </View>

              {previewTemplate.subject && (
                <View style={styles.previewSection}>
                  <Text
                    style={[
                      styles.previewLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Subject
                  </Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>
                    {previewTemplate.subject}
                  </Text>
                </View>
              )}

              <View style={styles.previewSection}>
                <Text
                  style={[styles.previewLabel, { color: colors.textSecondary }]}
                >
                  Body Content
                </Text>
                <View
                  style={[
                    styles.previewBody,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <RichEditor
                    disabled
                    initialContentHTML={previewTemplate.body_html || ''}
                    editorStyle={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      contentCSSText: editorCssText,
                    }}
                  />
                </View>
              </View>

              <TemplateUsageInfo
                templateId={previewTemplate.id}
                colors={colors}
              />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Template Card Component
interface TemplateCardProps {
  template: EmailTemplate;
  colors: any;
  mode: 'select' | 'manage';
  onEdit: (template: EmailTemplate) => void;
  onPreview: (template: EmailTemplate) => void;
  onSelect: (template: EmailTemplate) => void;
}

function TemplateCard({
  template,
  colors,
  mode,
  onEdit,
  onPreview,
  onSelect,
}: TemplateCardProps) {
  const handlePress = () => {
    if (mode === 'select') {
      onSelect(template);
    } else {
      onPreview(template);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.templateCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.templateCardContent}>
        <View style={styles.templateCardHeader}>
          <FileText size={20} color={colors.primary} />
          <Text
            style={[styles.templateName, { color: colors.text }]}
            numberOfLines={1}
          >
            {template.name}
          </Text>
        </View>
        {template.subject && (
          <Text
            style={[styles.templateSubject, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {template.subject}
          </Text>
        )}
        {template.body_text && (
          <Text
            style={[styles.templatePreview, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {template.body_text}
          </Text>
        )}
      </View>
      {mode === 'manage' && (
        <View style={styles.templateCardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onPreview(template)}
          >
            <Eye size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(template)}
          >
            <Edit size={20} color={colors.primary} />
          </TouchableOpacity>
          <DeleteTemplateButton
            template={template}
            colors={colors}
            onDeleteSuccess={() => {}}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

// Template Usage Info Component
interface TemplateUsageInfoProps {
  templateId: string;
  colors: any;
}

function TemplateUsageInfo({ templateId, colors }: TemplateUsageInfoProps) {
  const { data: usageStats, isLoading: usageLoading } =
    useTemplateUsageStats(templateId);
  const { data: sequenceUsage, isLoading: sequenceLoading } =
    useTemplateSequenceUsage(templateId);

  if (usageLoading || sequenceLoading) {
    return (
      <View style={styles.previewSection}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.previewSection}>
        <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
          Usage Statistics
        </Text>
        <Text style={[styles.previewValue, { color: colors.text }]}>
          Used {usageStats?.usage_count || 0} times
        </Text>
        {usageStats?.last_used_at && (
          <Text
            style={[styles.previewSubtext, { color: colors.textSecondary }]}
          >
            Last used: {new Date(usageStats.last_used_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      {sequenceUsage?.is_used && (
        <View style={[styles.previewSection, styles.warningSection]}>
          <View style={styles.warningHeader}>
            <AlertCircle size={20} color={colors.warning} />
            <Text style={[styles.previewLabel, { color: colors.warning }]}>
              Active Sequences
            </Text>
          </View>
          <Text style={[styles.previewValue, { color: colors.text }]}>
            This template is used in {sequenceUsage.sequences.length} active
            sequence(s):
          </Text>
          {sequenceUsage.sequences.map((seq: any, index: number) => (
            <Text
              key={index}
              style={[styles.previewSubtext, { color: colors.textSecondary }]}
            >
              • {seq.name}
            </Text>
          ))}
          <Text
            style={[
              styles.previewSubtext,
              { color: colors.warning, marginTop: 8 },
            ]}
          >
            Remove from sequences before deleting this template.
          </Text>
        </View>
      )}
    </>
  );
}

// Delete Template Button Component
interface DeleteTemplateButtonProps {
  template: EmailTemplate;
  colors: any;
  onDeleteSuccess: () => void;
}

function DeleteTemplateButton({
  template,
  colors,
  onDeleteSuccess,
}: DeleteTemplateButtonProps) {
  const { showAlert } = useAlert();
  const deleteTemplate = useDeleteEmailTemplate();
  const { data: sequenceUsage } = useTemplateSequenceUsage(template.id);

  const handleDelete = () => {
    // Check if template is used in active sequences
    if (sequenceUsage?.is_used) {
      const sequenceNames = sequenceUsage.sequences
        .map((s: any) => s.name)
        .join(', ');
      showAlert({
        title: 'Cannot Delete Template',
        message: `This template is currently used in active sequences: ${sequenceNames}. Please remove it from these sequences before deleting.`,
      });
      return;
    }

    // Show confirmation dialog
    showAlert({
      title: 'Delete Template',
      message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteTemplate.mutateAsync(template.id);
          showAlert({
            title: 'Success',
            message: 'Template deleted successfully.',
          });
          onDeleteSuccess();
        } catch (error: any) {
          showAlert({
            title: 'Error',
            message: 'Failed to delete template. Please try again.',
          });
        }
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handleDelete}
      disabled={deleteTemplate.isPending}
    >
      {deleteTemplate.isPending ? (
        <ActivityIndicator size="small" color={colors.error} />
      ) : (
        <Trash2 size={20} color={colors.error} />
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
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  templateCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  templateCardContent: {
    flex: 1,
    gap: 6,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  templateSubject: {
    fontSize: 14,
    fontWeight: '500',
  },
  templatePreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  templateCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
  richEditorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 300,
  },
  richEditor: {
    minHeight: 250,
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  previewValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  previewSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  previewBody: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 200,
  },
  warningSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
});
