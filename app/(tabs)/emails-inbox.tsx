import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import EmailComposer from '@/components/EmailComposer';
import EmailThreadsView from '@/components/EmailThreadsView';
import EmailThreadDetail from '@/components/EmailThreadDetail';
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';
import { useEmailThreads } from '@/hooks/useEmails';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function EmailsInboxScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const draftId = typeof params.draftId === 'string' ? params.draftId : null;

  const [selectedThreadEmail, setSelectedThreadEmail] = useState<string | null>(
    null
  );
  const [selectedThreadName, setSelectedThreadName] = useState<string | null>(
    null
  );
  const [showComposer, setShowComposer] = useState(false);
  const [composerDraftId, setComposerDraftId] = useState<string | null>(
    draftId
  );

  // Open composer if draftId is provided
  useEffect(() => {
    if (draftId) {
      setShowComposer(true);
      setComposerDraftId(draftId);
    }
  }, [draftId]);

  const clientsQuery = useClients();
  const leadsQuery = useLeads();

  const suggestionCandidates = useMemo(() => {
    const list: {
      email: string;
      name?: string | null;
      type?: 'client' | 'lead';
    }[] = [];

    for (const c of (clientsQuery.data ?? []).filter((x) => x.email)) {
      list.push({ email: c.email as string, name: c.name, type: 'client' });
    }
    for (const l of (leadsQuery.data ?? []).filter((x) => x.email)) {
      list.push({ email: l.email as string, name: l.name, type: 'lead' });
    }

    // de-dupe by email
    const seen = new Set<string>();
    const deduped: {
      email: string;
      name?: string | null;
      type?: 'client' | 'lead';
    }[] = [];
    for (const s of list) {
      const key = (s.email || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(s);
    }
    return deduped;
  }, [clientsQuery.data, leadsQuery.data]);

  const handleSelectThread = (
    counterpartyEmail: string,
    displayName: string | null
  ) => {
    setSelectedThreadEmail(counterpartyEmail);
    setSelectedThreadName(displayName);
  };

  const handleBackToThreads = () => {
    setSelectedThreadEmail(null);
    setSelectedThreadName(null);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        {selectedThreadEmail && (
          <TouchableOpacity
            onPress={handleBackToThreads}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {selectedThreadEmail ? 'Conversation' : 'Inbox'}
        </Text>
        <TouchableOpacity
          onPress={() => setShowComposer(true)}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Compose</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {selectedThreadEmail ? (
        <EmailThreadDetail
          counterpartyEmail={selectedThreadEmail}
          displayName={selectedThreadName}
          onBack={handleBackToThreads}
        />
      ) : (
        <EmailThreadsView onSelectThread={handleSelectThread} />
      )}

      {/* Compose Modal */}
      <Modal
        visible={showComposer}
        animationType="slide"
        onRequestClose={() => {
          setShowComposer(false);
          setComposerDraftId(null);
        }}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              {composerDraftId ? 'Edit Draft' : 'Compose'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowComposer(false);
                setComposerDraftId(null);
              }}
            >
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
              draftId={composerDraftId}
              onSent={() => {
                setShowComposer(false);
                setComposerDraftId(null);
              }}
              onDraftSaved={(id) => {
                setComposerDraftId(id);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '800', flex: 1 },
  backButton: {
    padding: 4,
  },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
