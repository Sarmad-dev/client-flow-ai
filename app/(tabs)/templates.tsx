import React, { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useEmailTemplates,
  useUpsertEmailTemplate,
} from '@/hooks/useEmailTemplates';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';
import { Platform } from 'react-native';

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const { data: templates } = useEmailTemplates();
  const upsert = useUpsertEmailTemplate();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [richHtml, setRichHtml] = useState<string>('');
  const richRef = useRef<RichEditor>(null);

  const editorCssText = `body{padding:8px;font-size:16px;line-height:1.35;${
    Platform.OS === 'android'
      ? '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;'
      : ''
  }} ::-webkit-scrollbar{width:0;height:0}`;

  const handleSave = async () => {
    if (!name) return;
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
      richHtml && richHtml.trim().length > 0 ? richHtml : htmlFromPlain;
    const plainText =
      richHtml && richHtml.trim().length > 0
        ? cleanedTextFromHtml(richHtml)
        : body;

    await upsert.mutateAsync({
      name,
      subject,
      body_html: composedHtml,
      body_text: plainText,
    });
    setName('');
    setSubject('');
    setBody('');
    setRichHtml('');
    richRef.current?.setContentHTML('');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={{ padding: 24 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          Email Templates
        </Text>
        <View
          style={[
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Create / Update
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Subject"
            placeholderTextColor={colors.textSecondary}
            value={subject}
            onChangeText={setSubject}
          />
          <View style={[styles.richContainer, { borderColor: colors.border }]}>
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
            <View style={{ height: 300 }}>
              <RichEditor
                ref={richRef}
                initialContentHTML={
                  body ? `<p>${body.replace(/\n/g, '<br/>')}</p>` : ''
                }
                placeholder="Write template body..."
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
                editorStyle={{
                  backgroundColor: colors.background,
                  color: colors.text,
                  placeholderColor: colors.textSecondary,
                  cssText: editorCssText,
                }}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              Save Template
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Templates
        </Text>
        {templates?.map((t) => (
          <View
            key={t.id}
            style={[
              styles.listItem,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {t.name}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {t.subject || '(no subject)'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginVertical: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100 },
  richContainer: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  listItem: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
});
