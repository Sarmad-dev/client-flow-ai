import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useServerDecryptedEmailThreads } from '@/hooks/useServerDecryptedEmails';
import { Mail, Search, MessageCircle, ChevronRight } from 'lucide-react-native';
import EmailListSkeleton from './EmailListSkeleton';

interface EmailThreadsViewProps {
  onSelectThread: (
    counterpartyEmail: string,
    displayName: string | null
  ) => void;
}

type SortOption = 'recent' | 'unread' | 'name';

export default function EmailThreadsView({
  onSelectThread,
}: EmailThreadsViewProps) {
  const { colors } = useTheme();
  const {
    data: threads = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useServerDecryptedEmailThreads();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;

    const query = searchQuery.toLowerCase();
    return threads.filter((thread) => {
      const nameMatch = thread.displayName?.toLowerCase().includes(query);
      const emailMatch = thread.counterpartyEmail.toLowerCase().includes(query);
      const subjectMatch = thread.lastSubject?.toLowerCase().includes(query);
      return nameMatch || emailMatch || subjectMatch;
    });
  }, [threads, searchQuery]);

  // Sort threads based on selected option
  const sortedThreads = useMemo(() => {
    const sorted = [...filteredThreads];

    switch (sortBy) {
      case 'recent':
        sorted.sort(
          (a, b) =>
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
        );
        break;
      case 'unread':
        sorted.sort((a, b) => {
          // First sort by unread count (descending)
          if (b.unreadCount !== a.unreadCount) {
            return b.unreadCount - a.unreadCount;
          }
          // Then by recent
          return (
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime()
          );
        });
        break;
      case 'name':
        sorted.sort((a, b) => {
          const nameA = (a.displayName || a.counterpartyEmail).toLowerCase();
          const nameB = (b.displayName || b.counterpartyEmail).toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
    }

    return sorted;
  }, [filteredThreads, sortBy]);

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // Format as date for older messages
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderSortButton = (option: SortOption, label: string) => (
    <TouchableOpacity
      onPress={() => setSortBy(option)}
      style={[
        styles.sortButton,
        {
          backgroundColor:
            sortBy === option ? colors.primary + '20' : colors.surface,
          borderColor: sortBy === option ? colors.primary : colors.border,
        },
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Sort by ${label}`}
      accessibilityState={{ selected: sortBy === option }}
      accessibilityHint={`Sorts conversations by ${label.toLowerCase()}`}
    >
      <Text
        style={[
          styles.sortButtonText,
          {
            color: sortBy === option ? colors.primary : colors.textSecondary,
            fontWeight: sortBy === option ? '600' : '400',
          },
        ]}
        accessible={false}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderThreadItem = React.useCallback(
    ({ item }: { item: (typeof threads)[0] }) => {
      const hasUnread = item.unreadCount > 0;

      const accessibilityLabel = `Email thread with ${
        item.displayName || item.counterpartyEmail
      }, ${item.totalCount} message${item.totalCount !== 1 ? 's' : ''}, ${
        hasUnread ? `${item.unreadCount} unread` : 'all read'
      }, last message ${formatRelativeTime(item.lastMessageTime)}`;

      return (
        <TouchableOpacity
          onPress={() =>
            onSelectThread(item.counterpartyEmail, item.displayName)
          }
          style={[
            styles.threadCard,
            {
              backgroundColor: hasUnread ? colors.surface : colors.background,
              borderColor: hasUnread ? colors.primary + '30' : colors.border,
              borderLeftWidth: hasUnread ? 3 : 1,
              borderLeftColor: hasUnread ? colors.primary : colors.border,
            },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Double tap to view conversation"
          accessibilityState={{ selected: hasUnread }}
        >
          {/* Avatar/Icon */}
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: item.displayName
                  ? colors.primary + '20'
                  : colors.surface,
              },
            ]}
          >
            {item.displayName ? (
              <Text
                style={[
                  styles.avatarText,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <Mail size={20} color={colors.textSecondary} />
            )}
          </View>

          {/* Thread Info */}
          <View style={styles.threadContent}>
            {/* Header Row */}
            <View style={styles.threadHeader}>
              <View style={styles.threadTitleRow}>
                <Text
                  style={[
                    styles.threadName,
                    {
                      color: colors.text,
                      fontWeight: hasUnread ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.displayName || item.counterpartyEmail}
                </Text>
                {hasUnread && (
                  <View
                    style={[
                      styles.unreadBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.unreadBadgeText}>
                      {item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.threadTime,
                  {
                    color: hasUnread ? colors.primary : colors.textSecondary,
                    fontWeight: hasUnread ? '600' : '400',
                  },
                ]}
              >
                {formatRelativeTime(item.lastMessageTime)}
              </Text>
            </View>

            {/* Email Address (if different from display name) */}
            {item.displayName && (
              <Text
                style={[styles.threadEmail, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.counterpartyEmail}
              </Text>
            )}

            {/* Last Subject */}
            {item.lastSubject && (
              <Text
                style={[
                  styles.threadSubject,
                  {
                    color: colors.text,
                    fontWeight: hasUnread ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {item.lastSubject}
              </Text>
            )}

            {/* Footer Row */}
            <View style={styles.threadFooter}>
              <View style={styles.threadStats}>
                <MessageCircle size={14} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.threadStatsText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.totalCount} message{item.totalCount !== 1 ? 's' : ''}
                </Text>
              </View>
              {item.hasReplied && (
                <View
                  style={[
                    styles.repliedBadge,
                    { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text
                    style={[styles.repliedBadgeText, { color: colors.primary }]}
                  >
                    Replied
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    },
    [colors, onSelectThread]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmailListSkeleton count={6} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <Mail size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Failed to load email threads
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'Please try again later'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            accessible={true}
            accessibilityLabel="Search conversations"
            accessibilityHint="Type to search email conversations by name, email, or subject"
          />
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>
          Sort by:
        </Text>
        <View style={styles.sortButtons}>
          {renderSortButton('recent', 'Recent')}
          {renderSortButton('unread', 'Unread')}
          {renderSortButton('name', 'Name')}
        </View>
      </View>

      {/* Thread List */}
      {sortedThreads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Mail size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchQuery.trim()
              ? 'No conversations found'
              : 'No email conversations yet'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {searchQuery.trim()
              ? 'Try adjusting your search'
              : 'Start by sending an email to a client or lead'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedThreads}
          keyExtractor={(item) => item.threadId}
          renderItem={renderThreadItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sortContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  threadContent: {
    flex: 1,
    gap: 4,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  threadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  threadName: {
    fontSize: 16,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  threadTime: {
    fontSize: 12,
  },
  threadEmail: {
    fontSize: 13,
  },
  threadSubject: {
    fontSize: 14,
  },
  threadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  threadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  threadStatsText: {
    fontSize: 12,
  },
  repliedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  repliedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
