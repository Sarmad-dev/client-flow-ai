import React, { useRef, useState, useEffect } from 'react';
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
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { useTheme } from '@/hooks/useTheme';
import { useSendEmail } from '@/hooks/useEmails';
import { useAlert } from '@/contexts/CustomAlertContext';
import { Mail, Send, X, Type } from 'lucide-react-native';

interface InlineReplyComposerProps {
  counterpartyEmail: string;
  displayName: string | null;
  defaultSubject: string;
  clientId?: string | null;
  leadId?: string | null;
  inReplyToMessageId?: string | null;
  references?: string[] | null;
  onSent?: () => void;
  onCancel?: () => void;
}

export default function InlineReplyComposer({
  counterpartyEmail,
  displayName,
  defaultSubject,
  clientId = null,
  leadId = null,
  inReplyToMessageId = null,
  references = null,
  onSent,
  onCancel,
}: InlineReplyComposerProps) {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const sendEmail = useSendEmail();
  const richRef = useRef<RichEditor>(null);

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [richHtml, setRichHtml] = useState<string>('');

  const editorCssText = `body{padding:8px;font-size:16px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  const canSend = !!counterpartyEmail && (!!subject || !!body);

  const handleSend = async () => {
    if (!canSend) {
      showAlert({
        title: 'Cannot Send',
        message: 'Please enter a message before sending.',
      });
      return;
    }

    try {
      // Convert plain text to HTML if rich editor wasn't used
      const htmlFromPlain = `<div><p>${(body || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')}</p></div>`;

      const composedHtml =
        richHtml && richHtml.trim().length > 0 ? richHtml : htmlFromPlain;

      // Clean HTML to plain text
      const plainText =
        richHtml && richHtml.trim().length > 0
          ? richHtml
              .replace(/<style[\s\S]*?<\/style>/gi, ' ')
              .replace(/<script[\s\S]*?<\/script>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/\s+/g, ' ')
              .trim()
          : body;

      await sendEmail.mutateAsync({
        to: counterpartyEmail,
        subject: subject || '(no subject)',
        html: composedHtml,
        text: plainText,
        client_id: clientId,
        lead_id: leadId,
        in_reply_to_message_id: inReplyToMessageId,
        references: references,
      });

      showAlert({
        title: '✓ Reply Sent',
        message: `Your reply has been sent to ${
          displayName || counterpartyEmail
        }.`,
      });

      // Clear form and notify parent
      setSubject('');
      setBody('');
      setRichHtml('');
      try {
        richRef.current?.setContentHTML('');
      } catch (error) {
        console.error('Failed to clear editor:', error);
      }

      onSent?.();
    } catch (error) {
      console.error('Failed to send reply:', error);

      let errorMessage = 'Failed to send reply. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage =
            'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      showAlert({
        title: 'Send Failed',
        message: errorMessage,
      });
    }
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Mail size={18} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.text }]}>
            Reply to {displayName || counterpartyEmail}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Subject Field */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Subject
        </Text>
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
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Rich Text Editor */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Message
        </Text>
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
              actions.setBold,
              actions.setItalic,
              actions.setUnderline,
              actions.insertBulletsList,
              actions.insertOrderedList,
              actions.alignLeft,
              actions.alignCenter,
              actions.alignRight,
            ]}
            selectedIconTint={colors.primary}
            iconTint={colors.textSecondary}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              backgroundColor: colors.surface,
            }}
          />
          <View style={{ height: 200 }}>
            <RichEditor
              ref={richRef}
              initialContentHTML=""
              placeholder="Type your reply..."
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

      {/* Send Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor:
              !canSend || sendEmail.isPending ? colors.surface : colors.primary,
            borderWidth: !canSend || sendEmail.isPending ? 1 : 0,
            borderColor: colors.border,
          },
        ]}
        onPress={handleSend}
        disabled={!canSend || sendEmail.isPending}
      >
        {sendEmail.isPending ? (
          <>
            <ActivityIndicator size={18} color={colors.primary} />
            <Text style={[styles.sendText, { color: colors.primary }]}>
              Sending...
            </Text>
          </>
        ) : (
          <>
            <Send size={18} color={!canSend ? colors.textSecondary : '#fff'} />
            <Text
              style={[
                styles.sendText,
                { color: !canSend ? colors.textSecondary : '#fff' },
              ]}
            >
              Send Reply
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    maxHeight: '50%',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  richContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 4,
  },
  sendText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
