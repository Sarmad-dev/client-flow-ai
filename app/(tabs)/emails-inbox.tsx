import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import EmailComposer from '@/components/EmailComposer';
import { useEmailThreads, useThreadMessages } from '@/hooks/useEmails';
import EmailDetail from '@/components/EmailDetail';
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';
import { MessageContent } from '@/components/MessageContent';

export default function EmailsInboxScreen() {
  const { colors } = useTheme();
  const [showSidebar, setShowSidebar] = useState(true);
  const [threadQuery, setThreadQuery] = useState('');
  const [selectedThreadEmail, setSelectedThreadEmail] = useState<string | null>(
    null
  );
  const [showComposer, setShowComposer] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const threadsQuery = useEmailThreads();
  const threads = threadsQuery.data ?? [];
  const clientsQuery = useClients();
  const leadsQuery = useLeads();

  useEffect(() => {
    if (!selectedThreadEmail && threads.length > 0) {
      setSelectedThreadEmail(threads[0].counterpartyEmail);
    }
  }, [threads, selectedThreadEmail]);

  const filteredThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.counterpartyEmail.toLowerCase().includes(q) ||
        (t.displayName || '').toLowerCase().includes(q) ||
        (t.lastSubject || '').toLowerCase().includes(q)
    );
  }, [threads, threadQuery]);

  const messagesQuery = useThreadMessages(selectedThreadEmail || undefined);
  const messages = messagesQuery.data ?? [];

  const suggestionCandidates = useMemo(() => {
    const list: { email: string; name?: string | null }[] = [];
    if (selectedThreadEmail) list.push({ email: selectedThreadEmail });
    for (const t of threads) {
      list.push({ email: t.counterpartyEmail, name: t.displayName });
    }
    for (const c of (clientsQuery.data ?? []).filter((x) => x.email)) {
      list.push({ email: c.email as string, name: c.name });
    }
    for (const l of (leadsQuery.data ?? []).filter((x) => x.email)) {
      list.push({ email: l.email as string, name: l.name });
    }
    // de-dupe by email
    const seen = new Set<string>();
    const deduped: { email: string; name?: string | null }[] = [];
    for (const s of list) {
      const key = (s.email || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(s);
    }
    return deduped;
  }, [selectedThreadEmail, threads, clientsQuery.data, leadsQuery.data]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Inbox</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowSidebar((s) => !s)}
            style={[
              styles.headerBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowComposer(true)}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Compose</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bodyRow}>
        {showSidebar && (
          <View
            style={[
              styles.sidebar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {!selectedThreadEmail && (
              <View
                style={[
                  styles.searchBox,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <TextInput
                  value={threadQuery}
                  onChangeText={setThreadQuery}
                  placeholder="Search..."
                  placeholderTextColor={colors.textSecondary}
                  style={{ color: colors.text, flex: 1, fontSize: 16 }}
                />
              </View>
            )}
            <ScrollView contentContainerStyle={{ padding: 8, gap: 8 }}>
              {filteredThreads.map((t) => {
                const isActive = t.counterpartyEmail === selectedThreadEmail;
                return (
                  <TouchableOpacity
                    key={t.counterpartyEmail}
                    onPress={() => setSelectedThreadEmail(t.counterpartyEmail)}
                    style={[
                      styles.threadItem,
                      {
                        borderColor: colors.border,
                        backgroundColor: isActive
                          ? colors.background
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.text, fontWeight: '700' }}
                    >
                      {t.displayName || t.counterpartyEmail || '(No name)'}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.textSecondary }}
                    >
                      {t.lastSubject || ''}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {new Date(t.lastMessageTime).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[styles.conversation, { borderColor: colors.border }]}>
          {selectedThreadEmail ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              {messages.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={{
                    alignSelf:
                      m.direction === 'sent' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 10,
                  }}
                  onPress={() => setSelectedEmailId(m.id)}
                >
                  <Text
                    style={{ color: colors.text, fontWeight: '600' }}
                    numberOfLines={2}
                  >
                    {m.subject || '(No subject)'}
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    <MessageContent html={m.body_html} text={m.body_text} />
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    {new Date(m.created_at).toLocaleString()} • {m.direction}
                    {m.direction === 'received' ? ' • replied' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.textSecondary }}>
                Select a conversation
              </Text>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={showComposer}
        animationType="slide"
        onRequestClose={() => setShowComposer(false)}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Compose</Text>
            <TouchableOpacity onPress={() => setShowComposer(false)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <EmailComposer
              fullScreen
              to={selectedThreadEmail || ''}
              suggestedRecipients={suggestionCandidates}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {selectedEmailId && (
        <EmailDetail
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800' },
  headerBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  bodyRow: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 300, borderRightWidth: 1 },
  searchBox: {
    margin: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  threadItem: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
  conversation: { flex: 1, borderLeftWidth: 0 },
});
