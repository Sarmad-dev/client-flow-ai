import React, { useMemo, useRef, useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { useTheme } from '@/hooks/useTheme';
import { useSendEmail, useEnhanceEmail } from '@/hooks/useEmails';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import {
  Mail,
  Type,
  Send,
  Image as ImageIcon,
  X,
  Sparkles,
} from 'lucide-react-native';

interface EmailComposerProps {
  to?: string;
  defaultSubject?: string;
  defaultBody?: string;
  clientId?: string | null;
  onSent?: () => void;
  fullScreen?: boolean;
  suggestedRecipients?: { email: string; name?: string | null }[];
  onRecipientChange?: (value: string) => void;
}

export default function EmailComposer({
  to = '',
  defaultSubject = '',
  defaultBody = '',
  clientId = null,
  onSent,
  fullScreen,
  suggestedRecipients = [],
  onRecipientChange,
}: EmailComposerProps) {
  const { colors } = useTheme();
  const sendEmail = useSendEmail();
  const enhanceEmail = useEnhanceEmail();
  const { data: templates = [] } = useEmailTemplates();
  const richRef = useRef<RichEditor>(null);
  const [recipient, setRecipient] = useState(to);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [richHtml, setRichHtml] = useState<string>('');
  const [showHeadings, setShowHeadings] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<
    { uri: string; base64: string; mime: string }[]
  >([]);

  const canSend = useMemo(() => {
    return !!recipient && (!!subject || !!body || attachments.length > 0);
  }, [recipient, subject, body, attachments.length]);

  const canEnhance = useMemo(() => {
    return body.length >= 50 && !enhanceEmail.isPending;
  }, [body.length, enhanceEmail.isPending]);

  const normalizedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const items: { email: string; name?: string | null }[] = [];
    for (const s of suggestedRecipients) {
      const key = (s.email || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push({ email: s.email, name: s.name ?? null });
    }
    return items;
  }, [suggestedRecipients]);

  const filteredSuggestions = useMemo(() => {
    const q = recipient.trim().toLowerCase();
    if (!q) return [] as { email: string; name?: string | null }[];
    return normalizedSuggestions.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q)
    );
  }, [recipient, normalizedSuggestions]);

  const editorCssText = `body{padding:8px;font-size:16px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 3,
    });
    if (result.canceled) return;
    const assets = 'assets' in result ? result.assets : [];
    const newItems = assets
      .map((a) => {
        const mime =
          a.type === 'video' ? 'image/*' : a.mimeType || 'image/jpeg';
        if (!a.base64 || !a.uri) return null;
        return { uri: a.uri, base64: a.base64, mime };
      })
      .filter(Boolean) as { uri: string; base64: string; mime: string }[];
    if (newItems.length) {
      setAttachments((prev) => [...prev, ...newItems].slice(0, 5));
    }
  };

  const handleRemoveAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
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
      } catch {}
    } catch (error) {
      console.error('Failed to enhance email:', error);
    }
  };

  const handleSend = async () => {
    if (!canSend) return;
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
    await sendEmail.mutateAsync({
      to: recipient,
      subject: subject || '(no subject)',
      html: composedHtml,
      text: plainText,
      client_id: clientId,
    });
    onSent?.();
    setAttachments([]);
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {templates.slice(0, 10).map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  if (t.subject) setSubject(t.subject);
                  if (t.body_html) {
                    setRichHtml(t.body_html);
                    // Mirror plain text for send fallback
                    setBody(t.body_text || '');
                    // If editor is mounted, set content
                    try {
                      richRef.current?.setContentHTML(t.body_html);
                    } catch {}
                  } else if (t.body_text) {
                    setBody(t.body_text);
                    setRichHtml('');
                    try {
                      richRef.current?.setContentHTML(
                        `<p>${t.body_text.replace(/\n/g, '<br/>')}</p>`
                      );
                    } catch {}
                  }
                }}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{ color: colors.textSecondary, fontWeight: '700' }}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
              value={recipient}
              onChangeText={(val) => {
                setRecipient(val);
                onRecipientChange?.(val);
              }}
            />
          </View>
        </View>

        {!!filteredSuggestions.length && (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 10,
              marginTop: -6,
              marginBottom: 8,
            }}
          >
            {filteredSuggestions.slice(0, 6).map((s) => (
              <TouchableOpacity
                key={s.email}
                onPress={() => {
                  setRecipient(s.email);
                  onRecipientChange?.(s.email);
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
              >
                <Text style={{ color: colors.text }}>
                  {s.name ? `${s.name} · ${s.email}` : s.email}
                </Text>
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
            {canEnhance ? (
              <TouchableOpacity
                style={[
                  styles.enhanceButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: enhanceEmail.isPending ? 0.6 : 1,
                  },
                ]}
                onPress={handleEnhanceEmail}
                disabled={enhanceEmail.isPending}
              >
                {enhanceEmail.isPending ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : (
                  <Sparkles size={16} color="#fff" />
                )}
                <Text style={styles.enhanceText}>
                  {enhanceEmail.isPending ? 'Enhancing...' : 'AI Enhance'}
                </Text>
              </TouchableOpacity>
            ) : body.length > 0 && body.length < 50 ? (
              <View
                style={[
                  styles.enhanceHint,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.enhanceHintText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {50 - body.length} more chars for AI
                </Text>
              </View>
            ) : null}
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
              },
            ]}
            onPress={handlePickImage}
          >
            <ImageIcon size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
              Attach image
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
                  {attachments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {!!attachments.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {attachments.map((a) => (
                  <View
                    key={a.uri}
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleRemoveAttachment(a.uri)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        zIndex: 2,
                        backgroundColor: colors.surface,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 2,
                      }}
                    >
                      <X size={12} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {/* Use base64 preview */}
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={3}
                        style={{
                          fontSize: 10,
                          color: colors.textSecondary,
                          padding: 6,
                        }}
                      >
                        Image attached
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <View style={{ marginTop: 16 }}>
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={sendEmail.isPending || !canSend}
        >
          {sendEmail.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.sendText}>Send</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  enhanceHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
