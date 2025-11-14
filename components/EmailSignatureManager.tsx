import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { useTheme } from '@/hooks/useTheme';
import {
  useEmailSignatures,
  useCreateSignature,
  useUpdateSignature,
  useDeleteSignature,
  useSetDefaultSignature,
  type EmailSignature,
} from '@/hooks/useEmailSignatures';
import {
  Plus,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Edit3,
} from 'lucide-react-native';

interface EmailSignatureManagerProps {
  onClose?: () => void;
}

export default function EmailSignatureManager({
  onClose,
}: EmailSignatureManagerProps) {
  const { colors } = useTheme();
  const { data: signatures = [], isLoading } = useEmailSignatures();
  const createSignature = useCreateSignature();
  const updateSignature = useUpdateSignature();
  const deleteSignature = useDeleteSignature();
  const setDefaultSignature = useSetDefaultSignature();

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingSignature, setEditingSignature] =
    useState<EmailSignature | null>(null);
  const [name, setName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [autoInsert, setAutoInsert] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const richRef = useRef<RichEditor>(null);

  const editorCssText = `body{padding:8px;font-size:14px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  useEffect(() => {
    if (mode === 'edit' && editingSignature) {
      setName(editingSignature.name);
      setHtmlContent(editingSignature.html_content);
      setAutoInsert(editingSignature.auto_insert);
      setIsDefault(editingSignature.is_default);
      try {
        richRef.current?.setContentHTML(editingSignature.html_content);
      } catch (error) {
        console.error('Failed to load signature HTML:', error);
      }
    } else if (mode === 'create') {
      setName('');
      setHtmlContent('');
      setAutoInsert(true);
      setIsDefault(false);
      try {
        richRef.current?.setContentHTML('');
      } catch {}
    }
  }, [mode, editingSignature]);

  const handleCreateSignature = () => {
    setMode('create');
    setEditingSignature(null);
  };

  const handleEditSignature = (signature: EmailSignature) => {
    setEditingSignature(signature);
    setMode('edit');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a signature name');
      return;
    }

    if (!htmlContent.trim()) {
      Alert.alert('Error', 'Please enter signature content');
      return;
    }

    try {
      // Convert HTML to plain text for text_content
      const textContent = htmlContent
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();

      if (mode === 'create') {
        await createSignature.mutateAsync({
          name: name.trim(),
          html_content: htmlContent,
          text_content: textContent,
          is_default: isDefault,
          auto_insert: autoInsert,
        });
        Alert.alert('Success', 'Signature created successfully');
      } else if (mode === 'edit' && editingSignature) {
        await updateSignature.mutateAsync({
          id: editingSignature.id,
          name: name.trim(),
          html_content: htmlContent,
          text_content: textContent,
          is_default: isDefault,
          auto_insert: autoInsert,
        });
        Alert.alert('Success', 'Signature updated successfully');
      }

      setMode('list');
      setEditingSignature(null);
    } catch (error) {
      console.error('Failed to save signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    }
  };

  const handleDelete = (signature: EmailSignature) => {
    Alert.alert(
      'Delete Signature',
      `Are you sure you want to delete "${signature.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSignature.mutateAsync(signature.id);
            } catch (error) {
              console.error('Failed to delete signature:', error);
              Alert.alert('Error', 'Failed to delete signature');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (signature: EmailSignature) => {
    try {
      await setDefaultSignature.mutateAsync(signature.id);
    } catch (error) {
      console.error('Failed to set default signature:', error);
      Alert.alert('Error', 'Failed to set default signature');
    }
  };

  const handleCancel = () => {
    setMode('list');
    setEditingSignature(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (mode === 'list') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Email Signatures
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateSignature}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.createButtonText}>New Signature</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list}>
          {signatures.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No signatures yet. Create your first signature to get started.
              </Text>
            </View>
          ) : (
            signatures.map((signature) => (
              <View
                key={signature.id}
                style={[
                  styles.signatureCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.signatureHeader}>
                  <View style={styles.signatureInfo}>
                    <View style={styles.signatureNameRow}>
                      <Text
                        style={[styles.signatureName, { color: colors.text }]}
                      >
                        {signature.name}
                      </Text>
                      {signature.is_default && (
                        <View
                          style={[
                            styles.defaultBadge,
                            { backgroundColor: colors.primary },
                          ]}
                        >
                          <Star size={12} color="#fff" fill="#fff" />
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.signaturePreview,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {signature.text_content}
                    </Text>
                  </View>
                </View>

                <View style={styles.signatureActions}>
                  {!signature.is_default && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(signature)}
                    >
                      <Star size={18} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.actionButtonText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Set Default
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditSignature(signature)}
                  >
                    <Edit3 size={18} color={colors.primary} />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(signature)}
                  >
                    <Trash2 size={18} color={colors.error} />
                    <Text
                      style={[styles.actionButtonText, { color: colors.error }]}
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'create' ? 'Create Signature' : 'Edit Signature'}
        </Text>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            Signature Name
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Professional, Casual"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.text }]}>
              Signature Content
            </Text>
            <TouchableOpacity
              style={styles.previewToggle}
              onPress={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <EyeOff size={18} color={colors.primary} />
              ) : (
                <Eye size={18} color={colors.primary} />
              )}
              <Text style={[styles.previewText, { color: colors.primary }]}>
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Text>
            </TouchableOpacity>
          </View>

          {!showPreview ? (
            <>
              <RichToolbar
                editor={richRef}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertLink,
                  actions.setStrikethrough,
                  actions.alignLeft,
                  actions.alignCenter,
                  actions.alignRight,
                ]}
                iconTint={colors.text}
                selectedIconTint={colors.primary}
                style={[
                  styles.richToolbar,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              />
              <RichEditor
                ref={richRef}
                style={[
                  styles.richEditor,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                editorStyle={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  placeholderColor: colors.textSecondary,
                  contentCSSText: editorCssText,
                }}
                placeholder="Enter your signature..."
                onChange={(html) => setHtmlContent(html)}
                initialHeight={200}
              />
            </>
          ) : (
            <View
              style={[
                styles.previewContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <RichEditor
                ref={richRef}
                style={styles.previewEditor}
                editorStyle={{
                  backgroundColor: colors.surface,
                  color: colors.text,
                  contentCSSText: editorCssText,
                }}
                disabled
                initialHeight={200}
              />
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={[styles.label, { color: colors.text }]}>
                Auto-insert in new emails
              </Text>
              <Text
                style={[
                  styles.switchDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Automatically add this signature to new emails
              </Text>
            </View>
            <Switch
              value={autoInsert}
              onValueChange={setAutoInsert}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={[styles.label, { color: colors.text }]}>
                Set as default
              </Text>
              <Text
                style={[
                  styles.switchDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Use this as your default signature
              </Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              { borderColor: colors.border },
            ]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleSave}
            disabled={createSignature.isPending || updateSignature.isPending}
          >
            {createSignature.isPending || updateSignature.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Signature</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  signatureCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  signatureHeader: {
    marginBottom: 12,
  },
  signatureInfo: {
    flex: 1,
  },
  signatureNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  signaturePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  signatureActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  richToolbar: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    minHeight: 50,
  },
  richEditor: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    minHeight: 200,
  },
  previewContainer: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 200,
  },
  previewEditor: {
    minHeight: 200,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
