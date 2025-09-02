import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useRecentEmails } from '@/hooks/useEmails';

interface EmailListProps {
  onSelect: (id: string) => void;
}

export default function EmailList({ onSelect }: EmailListProps) {
  const { colors } = useTheme();
  const { data } = useRecentEmails(100);

  const items = useMemo(() => data ?? [], [data]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelect(item.id)}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <Text
              style={[styles.subject, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.subject || '(No subject)'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary }} numberOfLines={2}>
            {item.body_text || ''}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}
          >
            {item.direction} • {item.status || 'sent'}
          </Text>
        </TouchableOpacity>
      )}
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
});
