import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Filter, Plus, Columns, BarChart3 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface TaskHeaderProps {
  onToggleFilter: () => void;
  onOpenForm: () => void;
  onOpenBoard?: () => void;
  onOpenAnalytics?: () => void;
}

export function TaskHeader({
  onToggleFilter,
  onOpenForm,
  onOpenBoard,
  onOpenAnalytics,
}: TaskHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>Tasks</Text>
      <View style={styles.headerActions}>
        {onOpenAnalytics && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={onOpenAnalytics}
          >
            <BarChart3 size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        )}
        {onOpenBoard && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.surface }]}
            onPress={onOpenBoard}
          >
            <Columns size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={onToggleFilter}
        >
          <Filter size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={onOpenForm}
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});
