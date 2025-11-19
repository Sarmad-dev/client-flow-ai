import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useRecentEmails } from '@/hooks/useEmails';
import EmailListSkeleton from './EmailListSkeleton';
import { Mail } from 'lucide-react-native';

interface EmailListProps {
  onSelect: (id: string) => void;
}

const EmailCard = React.memo(
  ({
    item,
    onSelect,
    colors,
  }: {
    item: any;
    onSelect: (id: string) => void;
    colors: any;
  }) => {
    const accessibilityLabel = `Email from ${
      item.sender_email || 'unknown'
    }, subject: ${item.subject || 'no subject'}, ${
      item.direction === 'sent' ? 'sent' : 'received'
    } on ${new Date(item.created_at).toLocaleDateString()}`;

    return (
      <TouchableOpacity
        onPress={() => onSelect(item.id)}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to view email details"
      >
        <View style={styles.row}>
          <Text
            style={[styles.subject, { color: colors.text }]}
            numberOfLines={1}
            accessible={false}
          >
            {item.subject || '(No subject)'}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 12 }}
            accessible={false}
          >
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
        <Text
          style={{ color: colors.textSecondary }}
          numberOfLines={2}
          accessible={false}
        >
          {item.body_text || ''}
        </Text>
        <Text
          style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}
          accessible={false}
        >
          {item.direction} • {item.status || 'sent'}
        </Text>
      </TouchableOpacity>
    );
  }
);

EmailCard.displayName = 'EmailCard';

export default function EmailList({ onSelect }: EmailListProps) {
  const { colors } = useTheme();
  const { data, isLoading, error, refetch, isRefetching } =
    useRecentEmails(100);

  const items = useMemo(() => data ?? [], [data]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <EmailCard item={item} onSelect={onSelect} colors={colors} />
    ),
    [onSelect, colors]
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  if (isLoading) {
    return <EmailListSkeleton count={6} />;
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Mail size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Failed to load emails
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'Please try again later'}
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: colors.background }]}
      >
        <Mail size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No emails yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Start by sending an email to a client or lead
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={renderItem}
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
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  subject: { fontSize: 16, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
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
