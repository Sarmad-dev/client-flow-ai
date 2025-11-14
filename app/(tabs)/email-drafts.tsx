import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { useEmailDrafts, useDeleteDraft } from '@/hooks/useEmailDrafts';
import { Mail, Search, Trash2, Edit, ArrowLeft } from 'lucide-react-native';

export default function EmailDraftsScreen() {
  const { colors } = useTheme();
  const { data: drafts = [], isLoading } = useEmailDrafts();
  const deleteDraft = useDeleteDraft();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrafts = drafts.filter((draft) => {
    const query = searchQuery.toLowerCase();
    return (
      (draft.recipient_email || '').toLowerCase().includes(query) ||
      (draft.subject || '').toLowerCase().includes(query) ||
      (draft.body_text || '').toLowerCase().includes(query)
    );
  });

  const handleDeleteDraft = (draftId: string, subject: string | null) => {
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to delete this draft${
        subject ? `: "${subject}"` : ''
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDraft.mutateAsync(draftId);
            } catch (error) {
              console.error('Failed to delete draft:', error);
              Alert.alert('Error', 'Failed to delete draft. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOpenDraft = (draftId: string) => {
    // Navigate to email composer with draft ID
    // This would need to be implemented in your routing structure
    router.push({
      pathname: '/(tabs)/emails-inbox',
      params: { draftId },
    } as any);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        // Show time only
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } else if (diffInHours < 168) {
        // Show day and time
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } else {
        // Show full date
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Drafts</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search drafts..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Drafts List */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Loading drafts...
          </Text>
        </View>
      ) : filteredDrafts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Mail size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery ? 'No drafts found' : 'No drafts yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Start composing an email to create a draft'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDrafts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.draftCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.draftContent}
                onPress={() => handleOpenDraft(item.id)}
              >
                <View style={styles.draftHeader}>
                  <Text
                    style={[styles.draftRecipient, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.recipient_email || 'No recipient'}
                  </Text>
                  <Text
                    style={[styles.draftTime, { color: colors.textSecondary }]}
                  >
                    {formatDate(item.updated_at)}
                  </Text>
                </View>

                <Text
                  style={[styles.draftSubject, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.subject || '(no subject)'}
                </Text>

                {item.body_text && (
                  <Text
                    style={[styles.draftBody, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.body_text}
                  </Text>
                )}

                {item.attachments && item.attachments.length > 0 && (
                  <Text
                    style={[
                      styles.attachmentCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    📎 {item.attachments.length} attachment
                    {item.attachments.length > 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.draftActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => handleOpenDraft(item.id)}
                >
                  <Edit size={18} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => handleDeleteDraft(item.id, item.subject)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
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
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  draftCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  draftContent: {
    padding: 16,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  draftRecipient: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  draftTime: {
    fontSize: 12,
  },
  draftSubject: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  draftBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  attachmentCount: {
    fontSize: 12,
    marginTop: 8,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
