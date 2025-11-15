import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { useTheme } from '@/hooks/useTheme';
import { useSendEmail, useEnhanceEmail } from '@/hooks/useEmails';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import {
  useEmailDraft,
  useAutoSaveDraft,
  useDeleteDraft,
} from '@/hooks/useEmailDrafts';
import { useDefaultSignature } from '@/hooks/useEmailSignatures';
import { useScheduleEmail } from '@/hooks/useScheduledEmails';
import { useAlert } from '@/contexts/CustomAlertContext';
import { PlatformDateTimePicker } from '@/components/PlatformDateTimePicker';
import {
  Mail,
  Type,
  Send,
  Image as ImageIcon,
  X,
  Sparkles,
  Save,
  User,
  Building2,
  FileText,
  File,
  Clock,
} from 'lucide-react-native';

interface EmailComposerProps {
  to?: string;
  defaultSubject?: string;
  defaultBody?: string;
  clientId?: string | null;
  leadId?: string | null;
  draftId?: string | null;
  onSent?: () => void;
  onDraftSaved?: (draftId: string) => void;
  fullScreen?: boolean;
  suggestedRecipients?: {
    email: string;
    name?: string | null;
    type?: 'client' | 'lead';
  }[];
  onRecipientChange?: (value: string) => void;
  inReplyToMessageId?: string | null;
  references?: string[] | null;
}

// Fuzzy search helper function
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match gets highest score
  if (t === q) return 1000;

  // Starts with query gets high score
  if (t.startsWith(q)) return 500;

  // Contains query gets medium score
  if (t.includes(q)) return 250;

  // Fuzzy character matching
  let score = 0;
  let qIndex = 0;
  let lastMatchIndex = -1;

  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) {
      score += 10;
      // Bonus for consecutive matches
      if (lastMatchIndex === i - 1) {
        score += 5;
      }
      lastMatchIndex = i;
      qIndex++;
    }
  }

  // Return 0 if not all query characters were matched
  return qIndex === q.length ? score : 0;
}

export default function EmailComposer({
  to = '',
  defaultSubject = '',
  defaultBody = '',
  clientId = null,
  leadId = null,
  draftId = null,
  onSent,
  onDraftSaved,
  fullScreen,
  suggestedRecipients = [],
  onRecipientChange,
  inReplyToMessageId = null,
  references = null,
}: EmailComposerProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const sendEmail = useSendEmail();
  const enhanceEmail = useEnhanceEmail();
  const deleteDraft = useDeleteDraft();
  const scheduleEmail = useScheduleEmail();
  const { data: templates = [] } = useEmailTemplates();
  const { data: loadedDraft } = useEmailDraft(draftId);
  const { data: defaultSignature } = useDefaultSignature();
  const richRef = useRef<RichEditor>(null);
  const [recipient, setRecipient] = useState(to);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [richHtml, setRichHtml] = useState<string>('');
  const [attachments, setAttachments] = useState<
    {
      uri: string;
      base64: string;
      mime: string;
      size?: number;
      name?: string;
    }[]
  >([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [signatureUsed, setSignatureUsed] = useState<string | null>(null);
  const [signatureAppended, setSignatureAppended] = useState(false);
  const [recipientInputValue, setRecipientInputValue] = useState(to);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const recipientDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Load draft data when draft is fetched
  useEffect(() => {
    if (loadedDraft && !to && !defaultSubject && !defaultBody) {
      setRecipient(loadedDraft.recipient_email || '');
      setSubject(loadedDraft.subject || '');
      setBody(loadedDraft.body_text || '');
      setRichHtml(loadedDraft.body_html || '');

      // Filter attachments to ensure base64 is present
      const validAttachments = (loadedDraft.attachments || []).filter(
        (
          a
        ): a is { uri: string; base64: string; mime: string; size?: number } =>
          !!a.base64
      );
      setAttachments(validAttachments);

      // Update rich editor content
      if (loadedDraft.body_html) {
        try {
          richRef.current?.setContentHTML(loadedDraft.body_html);
        } catch (error) {
          console.error('Failed to load draft HTML:', error);
        }
      }
    }
  }, [loadedDraft, to, defaultSubject, defaultBody]);

  // Auto-save functionality
  const {
    triggerAutoSave,
    saveDraft,
    isSaving,
    currentDraftId: autoSaveDraftId,
  } = useAutoSaveDraft(
    currentDraftId,
    {
      recipient_email: recipient,
      subject: subject,
      body_text: body,
      body_html: richHtml,
      attachments: attachments,
      client_id: clientId,
      lead_id: leadId,
    },
    30000 // 30 seconds
  );

  // Update currentDraftId when auto-save creates a new draft
  useEffect(() => {
    if (autoSaveDraftId && autoSaveDraftId !== currentDraftId) {
      setCurrentDraftId(autoSaveDraftId);
      onDraftSaved?.(autoSaveDraftId);
    }
  }, [autoSaveDraftId, currentDraftId, onDraftSaved]);

  // Trigger auto-save when content changes
  useEffect(() => {
    triggerAutoSave();
  }, [recipient, subject, body, richHtml, attachments, triggerAutoSave]);

  // Auto-append signature when default signature is loaded and auto_insert is enabled
  useEffect(() => {
    if (
      defaultSignature &&
      defaultSignature.auto_insert &&
      !signatureAppended &&
      !loadedDraft
    ) {
      const signatureHtml = `<div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px;">${defaultSignature.html_content}</div>`;

      // Append signature to existing content
      const currentContent =
        richHtml || body
          ? richHtml || `<p>${body.replace(/\n/g, '<br/>')}</p>`
          : '';
      const contentWithSignature = currentContent + signatureHtml;

      setRichHtml(contentWithSignature);
      setSignatureUsed(defaultSignature.name);
      setSignatureAppended(true);

      try {
        richRef.current?.setContentHTML(contentWithSignature);
      } catch (error) {
        console.error('Failed to append signature:', error);
      }
    }
  }, [defaultSignature, signatureAppended, loadedDraft, richHtml, body]);

  const canSend = useMemo(() => {
    return !!recipient && (!!subject || !!body || attachments.length > 0);
  }, [recipient, subject, body, attachments.length]);

  const canEnhance = useMemo(() => {
    return body.length >= 50 && !enhanceEmail.isPending;
  }, [body.length, enhanceEmail.isPending]);

  const charactersUntilEnhance = useMemo(() => {
    return Math.max(0, 50 - body.length);
  }, [body.length]);

  // Debounced recipient change handler
  const handleRecipientChange = useCallback(
    (value: string) => {
      setRecipientInputValue(value);
      setShowSuggestions(value.trim().length > 0);

      // Clear existing timer
      if (recipientDebounceTimer.current) {
        clearTimeout(recipientDebounceTimer.current);
      }

      // Set new timer for debounced update
      recipientDebounceTimer.current = setTimeout(() => {
        setRecipient(value);
        onRecipientChange?.(value);
      }, 150); // 150ms debounce
    },
    [onRecipientChange]
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (recipientDebounceTimer.current) {
        clearTimeout(recipientDebounceTimer.current);
      }
    };
  }, []);

  const normalizedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const items: {
      email: string;
      name?: string | null;
      type?: 'client' | 'lead';
    }[] = [];
    for (const s of suggestedRecipients) {
      const key = (s.email || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push({ email: s.email, name: s.name ?? null, type: s.type });
    }
    return items;
  }, [suggestedRecipients]);

  const filteredSuggestions = useMemo(() => {
    const q = recipientInputValue.trim();
    if (!q) return [];

    // Score each suggestion using fuzzy matching
    const scored = normalizedSuggestions.map((s) => {
      const emailScore = fuzzyMatch(q, s.email);
      const nameScore = s.name ? fuzzyMatch(q, s.name) : 0;
      const maxScore = Math.max(emailScore, nameScore);

      return { ...s, score: maxScore };
    });

    // Filter out non-matches and sort by score
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Show top 8 matches
  }, [recipientInputValue, normalizedSuggestions]);

  const editorCssText = `body{padding:8px;font-size:16px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  // File type validation helper
  const isValidFileType = (mimeType: string): boolean => {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    return validTypes.some((type) => mimeType.startsWith(type));
  };

  // Get file type icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.includes('pdf')) return FileText;
    return File;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate total attachment size
  const totalAttachmentSize = useMemo(() => {
    return attachments.reduce((sum, a) => sum + (a.size || 0), 0);
  }, [attachments]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Permission Required',
        message: 'Please grant permission to access your media library.',
      });
      return;
    }

    // Check if already at max attachments
    if (attachments.length >= 5) {
      showAlert({
        title: 'Maximum Attachments',
        message: 'You can attach a maximum of 5 files per email.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: 'images',
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: Math.min(3, 5 - attachments.length),
    });

    if (result.canceled) return;

    const assets = 'assets' in result ? result.assets : [];
    const newItems: {
      uri: string;
      base64: string;
      mime: string;
      size: number;
      name: string;
    }[] = [];
    const errors: string[] = [];

    for (const asset of assets) {
      if (!asset.base64 || !asset.uri) continue;

      const mime = asset.mimeType || 'image/jpeg';
      const size = asset.base64.length * 0.75; // Approximate size from base64
      const name = asset.fileName || asset.uri.split('/').pop() || 'attachment';

      // Validate file type
      if (!isValidFileType(mime)) {
        errors.push(`${name}: Unsupported file type`);
        continue;
      }

      // Validate file size (10MB per file)
      if (size > 10 * 1024 * 1024) {
        errors.push(`${name}: File exceeds 10MB limit`);
        continue;
      }

      // Check total size won't exceed limit
      if (totalAttachmentSize + size > 10 * 1024 * 1024) {
        errors.push('Total attachment size would exceed 10MB');
        break;
      }

      newItems.push({ uri: asset.uri, base64: asset.base64, mime, size, name });
    }

    if (errors.length > 0) {
      showAlert({
        title: 'Attachment Errors',
        message: errors.join('\n'),
      });
    }

    if (newItems.length > 0) {
      setAttachments((prev) => [...prev, ...newItems].slice(0, 5));
    }
  };

  const handleRemoveAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  };

  const handleTemplateSelect = (template: any) => {
    // Check if there's existing content
    const hasExistingContent =
      subject.trim().length > 0 ||
      body.trim().length > 0 ||
      richHtml.trim().length > 0;

    const applyTemplate = () => {
      if (template.subject) setSubject(template.subject);
      if (template.body_html) {
        setRichHtml(template.body_html);
        setBody(template.body_text || '');
        try {
          richRef.current?.setContentHTML(template.body_html);
        } catch (error) {
          console.error('Failed to apply template HTML:', error);
        }
      } else if (template.body_text) {
        setBody(template.body_text);
        setRichHtml('');
        try {
          richRef.current?.setContentHTML(
            `<p>${template.body_text.replace(/\n/g, '<br/>')}</p>`
          );
        } catch (error) {
          console.error('Failed to apply template text:', error);
        }
      }
    };

    // Show confirmation if there's existing content
    if (hasExistingContent) {
      showAlert({
        title: 'Apply Template',
        message: `Applying this template will replace your current email content. Do you want to continue?`,
        confirmText: 'Apply',
        cancelText: 'Cancel',
        onConfirm: applyTemplate,
      });
    } else {
      applyTemplate();
    }
  };

  const handleEnhanceEmail = async () => {
    if (!canEnhance) return;

    try {
      const enhancedContent = await enhanceEmail.mutateAsync({
        content: body,
        recipient,
        subject,
        tone: 'professional',
      });

      setBody(enhancedContent);
      setRichHtml(`<p>${enhancedContent.replace(/\n/g, '<br/>')}</p>`);

      // Update the rich editor content
      try {
        richRef.current?.setContentHTML(
          `<p>${enhancedContent.replace(/\n/g, '<br/>')}</p>`
        );
      } catch (error) {
        console.error('Failed to update rich editor:', error);
      }

      // Show success feedback
      showAlert({
        title: 'Email Enhanced',
        message: 'Your email content has been improved with AI.',
      });
    } catch (error) {
      console.error('Failed to enhance email:', error);
      showAlert({
        title: 'Enhancement Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to enhance email content. Please check your internet connection and try again.',
      });
    }
  };

  const handleSaveDraft = async () => {
    try {
      const result = await saveDraft();
      if (result) {
        setCurrentDraftId(result.id);
        onDraftSaved?.(result.id);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleSend = async () => {
    if (!canSend) return;

    // Validate attachments before sending
    if (attachments.length > 5) {
      showAlert({
        title: 'Too Many Attachments',
        message: 'You can attach a maximum of 5 files per email.',
      });
      return;
    }

    if (totalAttachmentSize > 10 * 1024 * 1024) {
      showAlert({
        title: 'Attachments Too Large',
        message:
          'Total attachment size cannot exceed 10MB. Please remove some files.',
      });
      return;
    }

    // Validate individual file sizes
    const oversizedFiles = attachments.filter(
      (a) => (a.size || 0) > 10 * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      showAlert({
        title: 'File Too Large',
        message: `${
          oversizedFiles[0].name || 'A file'
        } exceeds the 10MB limit per file.`,
      });
      return;
    }

    const inlineImagesHtml = attachments
      .map(
        (a) =>
          `<div style="margin-top:8px"><img src="data:${a.mime};base64,${a.base64}" style="max-width:100%" /></div>`
      )
      .join('');
    const cleanedTextFromHtml = (html: string) =>
      html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

    const htmlFromPlain = `<div><p>${(body || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')}</p></div>`;

    const composedHtml =
      (richHtml && richHtml.trim().length > 0 ? richHtml : htmlFromPlain) +
      inlineImagesHtml;

    const plainText =
      richHtml && richHtml.trim().length > 0
        ? cleanedTextFromHtml(richHtml)
        : body;
    setBody(plainText);

    try {
      const result = await sendEmail.mutateAsync({
        to: recipient,
        subject: subject || '(no subject)',
        html: composedHtml,
        text: plainText,
        client_id: clientId,
        signature_used: signatureUsed,
        in_reply_to_message_id: inReplyToMessageId,
        references: references,
      });

      // Delete draft after successful send
      if (currentDraftId) {
        try {
          await deleteDraft.mutateAsync(currentDraftId);
          setCurrentDraftId(null);
        } catch (error) {
          console.error('Failed to delete draft after send:', error);
        }
      }

      // Show success message with details
      const recipientName = suggestedRecipients.find(
        (r) => r.email.toLowerCase() === recipient.toLowerCase()
      )?.name;

      showAlert({
        title: '✓ Email Sent Successfully',
        message: `Your email${
          subject ? ` "${subject}"` : ''
        } has been sent to ${recipientName || recipient}.${
          attachments.length > 0
            ? `\n\nAttachments: ${attachments.length} file${
                attachments.length > 1 ? 's' : ''
              } (${formatFileSize(totalAttachmentSize)})`
            : ''
        }`,
        confirmText: 'OK',
      });

      // Clear form
      onSent?.();
      setAttachments([]);
      setRecipient('');
      setRecipientInputValue('');
      setSubject('');
      setBody('');
      setRichHtml('');
      setSignatureAppended(false);
      setSignatureUsed(null);

      try {
        richRef.current?.setContentHTML('');
      } catch (error) {
        console.error('Failed to clear editor:', error);
      }
    } catch (error) {
      console.error('Failed to send email:', error);

      // Provide specific error messages
      let errorMessage = 'Failed to send email. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage =
            'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('invalid')) {
          errorMessage =
            'Invalid email address or content. Please check your input.';
        } else {
          errorMessage = error.message;
        }
      }

      showAlert({
        title: 'Send Failed',
        message: errorMessage,
        confirmText: 'OK',
      });
    }
  };

  const handleSchedule = async (selectedDate: Date) => {
    if (!canSend) return;

    // Validate selectedDate
    if (
      !selectedDate ||
      !(selectedDate instanceof Date) ||
      isNaN(selectedDate.getTime())
    ) {
      showAlert({
        title: 'Invalid Date',
        message: 'Please select a valid date and time for scheduling.',
      });
      return;
    }

    // Validate attachments before scheduling
    if (attachments.length > 5) {
      showAlert({
        title: 'Too Many Attachments',
        message: 'You can attach a maximum of 5 files per email.',
      });
      return;
    }

    if (totalAttachmentSize > 10 * 1024 * 1024) {
      showAlert({
        title: 'Attachments Too Large',
        message:
          'Total attachment size cannot exceed 10MB. Please remove some files.',
      });
      return;
    }

    // Validate individual file sizes
    const oversizedFiles = attachments.filter(
      (a) => (a.size || 0) > 10 * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      showAlert({
        title: 'File Too Large',
        message: `${
          oversizedFiles[0].name || 'A file'
        } exceeds the 10MB limit per file.`,
      });
      return;
    }

    const inlineImagesHtml = attachments
      .map(
        (a) =>
          `<div style="margin-top:8px"><img src="data:${a.mime};base64,${a.base64}" style="max-width:100%" /></div>`
      )
      .join('');
    const cleanedTextFromHtml = (html: string) =>
      html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

    const htmlFromPlain = `<div><p>${(body || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>')}</p></div>`;

    const composedHtml =
      (richHtml && richHtml.trim().length > 0 ? richHtml : htmlFromPlain) +
      inlineImagesHtml;

    const plainText =
      richHtml && richHtml.trim().length > 0
        ? cleanedTextFromHtml(richHtml)
        : body;
    setBody(plainText);

    try {
      await scheduleEmail.mutateAsync({
        to: recipient,
        subject: subject || '(no subject)',
        html: composedHtml,
        text: plainText,
        scheduled_at: selectedDate.toISOString(),
        client_id: clientId,
        lead_id: leadId,
        signature_used: signatureUsed,
      });

      // Delete draft after successful schedule
      if (currentDraftId) {
        try {
          await deleteDraft.mutateAsync(currentDraftId);
          setCurrentDraftId(null);
        } catch (error) {
          console.error('Failed to delete draft after schedule:', error);
        }
      }

      // Show success message with details
      const recipientName = suggestedRecipients.find(
        (r) => r.email.toLowerCase() === recipient.toLowerCase()
      )?.name;

      const scheduledDateStr = selectedDate.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      showAlert({
        title: '✓ Email Scheduled',
        message: `Your email${
          subject ? ` "${subject}"` : ''
        } has been scheduled to send to ${
          recipientName || recipient
        } on ${scheduledDateStr}.`,
        confirmText: 'OK',
      });

      // Clear form
      onSent?.();
      setAttachments([]);
      setRecipient('');
      setRecipientInputValue('');
      setSubject('');
      setBody('');
      setRichHtml('');
      setSignatureAppended(false);
      setSignatureUsed(null);
      setScheduledAt(null);
      setShowSchedulePicker(false);

      try {
        richRef.current?.setContentHTML('');
      } catch (error) {
        console.error('Failed to clear editor:', error);
      }
    } catch (error) {
      console.error('Failed to schedule email:', error);

      // Provide specific error messages
      let errorMessage = 'Failed to schedule email. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('future')) {
          errorMessage = 'Please select a date and time in the future.';
        } else if (error.message.includes('network')) {
          errorMessage =
            'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      showAlert({
        title: 'Schedule Failed',
        message: errorMessage,
        confirmText: 'OK',
        cancelText: 'Cancel',
      });
    }
  };

  return (
    <View
      style={[
        styles.card,
        fullScreen
          ? {
              backgroundColor: colors.background,
              borderColor: 'transparent',
              borderWidth: 0,
              borderRadius: 0,
              paddingHorizontal: 0,
            }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Compose Email</Text>
      {!!templates.length && (
        <View style={styles.templateSection}>
          <View style={styles.templateHeader}>
            <FileText size={16} color={colors.textSecondary} />
            <Text
              style={[
                styles.templateHeaderText,
                { color: colors.textSecondary },
              ]}
            >
              Templates
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.templateScroll}
          >
            <View style={styles.templateList}>
              {templates.slice(0, 10).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => handleTemplateSelect(t)}
                  style={[
                    styles.templateChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <View style={styles.templateChipContent}>
                    <Text
                      style={[styles.templateChipName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {t.name}
                    </Text>
                    {t.subject && (
                      <Text
                        style={[
                          styles.templateChipSubject,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {t.subject}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      <ScrollView
        style={fullScreen ? { flex: 1 } : { maxHeight: 360 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>To</Text>
          <View
            style={[
              styles.inputRow,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Mail size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="recipient@example.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={recipientInputValue}
              onChangeText={handleRecipientChange}
              onFocus={() =>
                setShowSuggestions(recipientInputValue.trim().length > 0)
              }
              onBlur={() => {
                // Delay hiding suggestions to allow tap to register
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
          </View>
        </View>

        {showSuggestions && !!filteredSuggestions.length && (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 10,
              marginTop: -6,
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            {filteredSuggestions.map((s, index) => (
              <TouchableOpacity
                key={s.email}
                onPress={() => {
                  setRecipient(s.email);
                  setRecipientInputValue(s.email);
                  setShowSuggestions(false);
                  onRecipientChange?.(s.email);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: colors.border,
                }}
              >
                {/* Type indicator icon */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      s.type === 'client' ? '#10B98120' : '#3B82F620',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.type === 'client' ? (
                    <Building2 size={16} color="#10B981" />
                  ) : (
                    <User size={16} color="#3B82F6" />
                  )}
                </View>

                {/* Contact info */}
                <View style={{ flex: 1 }}>
                  {s.name ? (
                    <>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: '600',
                          fontSize: 15,
                        }}
                      >
                        {s.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          marginTop: 2,
                        }}
                      >
                        {s.email}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: colors.text, fontSize: 15 }}>
                      {s.email}
                    </Text>
                  )}
                </View>

                {/* Type badge */}
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor:
                      s.type === 'client' ? '#10B98115' : '#3B82F615',
                  }}
                >
                  <Text
                    style={{
                      color: s.type === 'client' ? '#10B981' : '#3B82F6',
                      fontSize: 11,
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {s.type || 'contact'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
          <View
            style={[
              styles.inputRow,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Type size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Subject"
              placeholderTextColor={colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.bodyHeader}>
            <Text style={[styles.label, { color: colors.text }]}>Body</Text>
            <View
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              {signatureAppended && signatureUsed && (
                <TouchableOpacity
                  style={[
                    styles.signatureButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={() => {
                    // Remove signature from content
                    const contentWithoutSignature = richHtml.replace(
                      /<div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px;">[\s\S]*?<\/div>$/,
                      ''
                    );
                    setRichHtml(contentWithoutSignature);
                    setSignatureAppended(false);
                    setSignatureUsed(null);
                    try {
                      richRef.current?.setContentHTML(contentWithoutSignature);
                    } catch {}
                  }}
                >
                  <X size={14} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.signatureButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Remove Signature
                  </Text>
                </TouchableOpacity>
              )}

              {/* AI Enhancement Button with States */}
              {body.length > 0 && (
                <>
                  {canEnhance ? (
                    <TouchableOpacity
                      style={[
                        styles.enhanceButton,
                        {
                          backgroundColor: enhanceEmail.isPending
                            ? colors.surface
                            : colors.primary,
                          borderWidth: enhanceEmail.isPending ? 1 : 0,
                          borderColor: enhanceEmail.isPending
                            ? colors.border
                            : 'transparent',
                        },
                      ]}
                      onPress={handleEnhanceEmail}
                      disabled={enhanceEmail.isPending}
                    >
                      {enhanceEmail.isPending ? (
                        <>
                          <ActivityIndicator size={16} color={colors.primary} />
                          <Text
                            style={[
                              styles.enhanceText,
                              { color: colors.primary },
                            ]}
                          >
                            Enhancing...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} color="#fff" />
                          <Text style={styles.enhanceText}>AI Enhance</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : charactersUntilEnhance > 0 ? (
                    <View
                      style={[
                        styles.enhanceHint,
                        {
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Sparkles size={12} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.enhanceHintText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {charactersUntilEnhance} more for AI
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </View>
          <View
            style={[
              styles.richContainer,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <RichToolbar
              editor={richRef}
              actions={[
                actions.undo,
                actions.redo,
                actions.keyboard,
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.heading1,
                actions.heading2,
                actions.heading3,
                actions.heading4,
                actions.heading5,
                actions.heading6,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.alignLeft,
                actions.alignCenter,
                actions.alignRight,
              ]}
              iconMap={{
                [actions.heading1]: ({ selected }: { selected?: boolean }) => (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: selected ? '#10B98120' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      H1
                    </Text>
                  </View>
                ),
                [actions.heading2]: ({ selected }: { selected?: boolean }) => (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: selected ? '#10B98120' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      H2
                    </Text>
                  </View>
                ),
                [actions.heading3]: ({ selected }: { selected?: boolean }) => (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: selected ? '#10B98120' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      H3
                    </Text>
                  </View>
                ),
                [actions.heading4]: ({ selected }: { selected?: boolean }) => (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: selected ? '#10B98120' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      H4
                    </Text>
                  </View>
                ),
                [actions.heading5]: ({ selected }: { selected?: boolean }) => (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: selected ? '#10B98120' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      H5
                    </Text>
                  </View>
                ),
                [actions.heading6]: ({ selected }: { selected?: boolean }) => (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: selected ? '#10B98120' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      H6
                    </Text>
                  </View>
                ),
              }}
              selectedIconTint={'#10B981'}
              iconTint={colors.textSecondary}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.surface,
              }}
            />
            <View style={{ height: fullScreen ? 300 : 400 }}>
              <RichEditor
                ref={richRef}
                initialContentHTML={
                  body ? `<p>${body.replace(/\n/g, '<br/>')}</p>` : ''
                }
                placeholder="Write your message..."
                onChange={(html) => {
                  setRichHtml(html);
                  const cleaned = html
                    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/\s+/g, ' ')
                    .trim();
                  setBody(cleaned);
                }}
                style={{}}
                editorStyle={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  placeholderColor: colors.textSecondary,
                  cssText: editorCssText,
                }}
              />
            </View>
          </View>
        </View>

        {/* Attachments */}
        <View style={[styles.field, { gap: 8 }]}>
          <TouchableOpacity
            style={[
              styles.attachButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: attachments.length >= 5 ? 0.5 : 1,
              },
            ]}
            onPress={handlePickImage}
            disabled={attachments.length >= 5}
          >
            <ImageIcon size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
              Attach files
            </Text>
            {!!attachments.length && (
              <View
                style={{
                  marginLeft: 'auto',
                  backgroundColor: colors.surface,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {attachments.length}/5
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Total size indicator */}
          {totalAttachmentSize > 0 && (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Total size: {formatFileSize(totalAttachmentSize)}
              </Text>
              {totalAttachmentSize > 10 * 1024 * 1024 && (
                <Text
                  style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}
                >
                  (Exceeds 10MB limit)
                </Text>
              )}
            </View>
          )}

          {!!attachments.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {attachments.map((a) => {
                  const isImage = a.mime.startsWith('image/');
                  const FileIconComponent = getFileIcon(a.mime);

                  return (
                    <View
                      key={a.uri}
                      style={{
                        width: 100,
                        borderRadius: 8,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleRemoveAttachment(a.uri)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          zIndex: 2,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: 12,
                          padding: 4,
                        }}
                      >
                        <X size={14} color="#fff" />
                      </TouchableOpacity>

                      {/* File preview/icon */}
                      <View
                        style={{
                          height: 80,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isImage
                            ? colors.background
                            : colors.surface,
                        }}
                      >
                        {isImage ? (
                          <ImageIcon size={32} color={colors.textSecondary} />
                        ) : (
                          <FileIconComponent
                            size={32}
                            color={colors.textSecondary}
                          />
                        )}
                      </View>

                      {/* File info */}
                      <View
                        style={{ padding: 6, backgroundColor: colors.surface }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 11,
                            color: colors.text,
                            fontWeight: '600',
                            marginBottom: 2,
                          }}
                        >
                          {a.name || 'attachment'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.textSecondary,
                          }}
                        >
                          {formatFileSize(a.size || 0)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <View style={{ marginTop: 16, gap: 12 }}>
        {/* Auto-save indicator */}
        {isSaving && (
          <View style={styles.autoSaveIndicator}>
            <ActivityIndicator size={14} color={colors.textSecondary} />
            <Text
              style={[styles.autoSaveText, { color: colors.textSecondary }]}
            >
              Saving draft...
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={[
              styles.draftButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity:
                  isSaving || sendEmail.isPending || scheduleEmail.isPending
                    ? 0.5
                    : 1,
              },
            ]}
            onPress={handleSaveDraft}
            disabled={
              isSaving || sendEmail.isPending || scheduleEmail.isPending
            }
          >
            {isSaving ? (
              <ActivityIndicator size={18} color={colors.textSecondary} />
            ) : (
              <Save size={18} color={colors.textSecondary} />
            )}
            <Text style={[styles.draftButtonText, { color: colors.text }]}>
              Save Draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scheduleButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity:
                  !canSend || sendEmail.isPending || scheduleEmail.isPending
                    ? 0.5
                    : 1,
              },
            ]}
            onPress={() => setShowSchedulePicker(true)}
            disabled={
              !canSend || sendEmail.isPending || scheduleEmail.isPending
            }
          >
            {scheduleEmail.isPending ? (
              <ActivityIndicator size={18} color={colors.textSecondary} />
            ) : (
              <Clock size={18} color={colors.textSecondary} />
            )}
            <Text style={[styles.scheduleButtonText, { color: colors.text }]}>
              Schedule
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  !canSend || sendEmail.isPending || scheduleEmail.isPending
                    ? colors.surface
                    : colors.primary,
                borderWidth:
                  !canSend || sendEmail.isPending || scheduleEmail.isPending
                    ? 1
                    : 0,
                borderColor: colors.border,
                flex: 1,
              },
            ]}
            onPress={handleSend}
            disabled={
              sendEmail.isPending || scheduleEmail.isPending || !canSend
            }
          >
            {sendEmail.isPending ? (
              <>
                <ActivityIndicator color={colors.primary} size={18} />
                <Text style={[styles.sendText, { color: colors.primary }]}>
                  Sending...
                </Text>
              </>
            ) : (
              <>
                <Send
                  size={18}
                  color={!canSend ? colors.textSecondary : '#fff'}
                />
                <Text
                  style={[
                    styles.sendText,
                    { color: !canSend ? colors.textSecondary : '#fff' },
                  ]}
                >
                  Send
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Schedule Date Picker Modal */}
      {showSchedulePicker && (
        <PlatformDateTimePicker
          value={scheduledAt || new Date()}
          mode="datetime"
          onChange={(event, date) => {
            if (date) {
              handleSchedule(date);
            } else {
              setShowSchedulePicker(false);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  field: {
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    minHeight: 260,
    fontSize: 16,
  },
  richContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sendButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  draftButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  autoSaveText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bodyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  enhanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enhanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  enhanceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  enhanceHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  signatureButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  templateSection: {
    marginBottom: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  templateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  templateScroll: {
    marginBottom: 6,
  },
  templateList: {
    flexDirection: 'row',
    gap: 8,
  },
  templateChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    maxWidth: 200,
  },
  templateChipContent: {
    gap: 4,
  },
  templateChipName: {
    fontSize: 13,
    fontWeight: '600',
  },
  templateChipSubject: {
    fontSize: 11,
  },
});
