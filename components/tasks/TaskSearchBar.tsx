import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface TaskSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function TaskSearchBar({ value, onChangeText }: TaskSearchBarProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
      <Search size={20} color={colors.textSecondary} strokeWidth={2} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder="Search tasks..."
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '400' },
});
