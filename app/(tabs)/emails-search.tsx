import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSearchServerDecryptedEmails } from '@/hooks/useServerDecryptedEmails';
import ServerDecryptedEmailDetail from '@/components/ServerDecryptedEmailDetail';
import {
  ArrowLeft,
  Search,
  Filter,
  X,
  Mail,
  MailOpen,
  AlertCircle,
  Shield,
  ShieldCheck,
} from 'lucide-react-native';

export default function EmailsSearchScreen() {
  const { colors } = useTheme();
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    direction?: 'sent' | 'received';
    client_id?: string;
    lead_id?: string;
  }>({});

  // Use the search hook with current query and filters
  const {
    data: emails = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useSearchServerDecryptedEmails(searchQuery, {
    ...filters,
    limit: 100,
  });

  const handleEmailPress = (email: any) => {
    setSelectedEmail(email);
  };

  const handleCloseDetail = () => {
    setSelectedEmail(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return colors.primary;
      case 'delivered':
        return colors.success;
      case 'opened':
      case 'clicked':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'spam':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const renderEmailItem = ({ item: email }: { item: any }) => {
    const isRead = email.status === 'opened' || email.status === 'clicked';
    const isSent = email.direction === 'sent';
    const isDecrypted = email._decrypted;
    const hasDecryptionError = email._decryption_error;

    return (
      <TouchableOpacity
        style={[
          styles.emailItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: hasDecryptionError
              ? colors.error
              : isDecrypted
              ? colors.success
              : colors.border,
            borderLeftWidth: 3,
          },
        ]}
        onPress={() => handleEmailPress(email)}
      >
        <View style={styles.emailHeader}>
          <View style={styles.emailMeta}>
            {isSent ? (
              <Mail size={16} color={getStatusColor(email.status)} />
            ) : (
              <MailOpen
                size={16}
                color={isRead ? colors.success : colors.primary}
              />
            )}

            <Text
              style={[styles.emailAddress, { color: colors.text }]}
              numberOfLines={1}
            >
              {isSent ? email.recipient_email : email.sender_email}
            </Text>

            {/* Encryption status indicator */}
            {hasDecryptionError ? (
              <AlertCircle size={14} color={colors.error} />
            ) : isDecrypted ? (
              <ShieldCheck size={14} color={colors.success} />
            ) : (
              <Shield size={14} color={colors.textSecondary} />
            )}
          </View>

          <Text style={[styles.emailDate, { color: colors.textSecondary }]}>
            {formatDate(email.created_at)}
          </Text>
        </View>

        <Text
          style={[
            styles.emailSubject,
            {
              color: hasDecryptionError ? colors.error : colors.text,
              fontWeight: isRead ? '400' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {email.subject || '(No Subject)'}
        </Text>

        <Text
          style={[
            styles.emailPreview,
            {
              color: hasDecryptionError ? colors.error : colors.textSecondary,
            },
          ]}
          numberOfLines={2}
        >
          {email.body_text?.substring(0, 150) || '(No Content)'}
        </Text>

        <View style={styles.emailFooter}>
          <Text
            style={[
              styles.emailStatus,
              { color: getStatusColor(email.status) },
            ]}
          >
            {email.status?.charAt(0).toUpperCase() + email.status?.slice(1)}
          </Text>

          <View style={styles.emailIndicators}>
            {email.attachment_count > 0 && (
              <Text
                style={[
                  styles.attachmentCount,
                  { color: colors.textSecondary },
                ]}
              >
                📎 {email.attachment_count}
              </Text>
            )}

            {hasDecryptionError && (
              <Text style={[styles.decryptionStatus, { color: colors.error }]}>
                Error
              </Text>
            )}
            {isDecrypted && !hasDecryptionError && (
              <Text
                style={[styles.decryptionStatus, { color: colors.success }]}
              >
                Decrypted
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {searchQuery ? 'Searching emails...' : 'Loading emails...'}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            Failed to search emails
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            {error.message}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.background }]}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Search size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          {searchQuery.trim()
            ? 'No emails found'
            : 'Start typing to search emails'}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {searchQuery.trim()
            ? 'Try different keywords or check your spelling'
            : 'Search by subject, content, sender, or recipient'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <Search size={24} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.title, { color: colors.text }]}>
            Search Emails
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search emails by subject, content, or email address..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Count */}
      {searchQuery.trim() && !isLoading && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {emails.length} result{emails.length !== 1 ? 's' : ''} for "
            {searchQuery}"
          </Text>
        </View>
      )}

      {/* Email List */}
      <FlatList
        data={emails}
        keyExtractor={(item) => item.id}
        renderItem={renderEmailItem}
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
        ListEmptyComponent={renderEmptyState}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />

      {/* Email Detail Modal */}
      {selectedEmail && (
        <Modal
          visible={!!selectedEmail}
          animationType="slide"
          onRequestClose={handleCloseDetail}
        >
          <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            <ServerDecryptedEmailDetail
              emailId={selectedEmail.id}
              onBack={handleCloseDetail}
            />
          </SafeAreaView>
        </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  emailAddress: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  emailDate: {
    fontSize: 12,
  },
  emailSubject: {
    fontSize: 16,
    marginBottom: 6,
  },
  emailPreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  emailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emailIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentCount: {
    fontSize: 12,
  },
  decryptionStatus: {
    fontSize: 10,
    fontWeight: '500',
  },
});
