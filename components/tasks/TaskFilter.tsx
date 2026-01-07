import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X, Filter } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface TaskFilterProps {
  onClose: () => void;
}

export function TaskFilter({ onClose }: TaskFilterProps) {
  const { colors } = useTheme();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const tags = ['follow-up', 'proposal', 'call', 'meeting'];
  const priorities = ['high', 'medium', 'low'];

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Filter Tasks</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
            <View style={styles.optionsGrid}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    selectedTag === tag && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.text },
                    selectedTag === tag && { color: '#FFFFFF' },
                  ]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority</Text>
            <View style={styles.optionsGrid}>
              {priorities.map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    selectedPriority === priority && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedPriority(selectedPriority === priority ? null : priority)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.text },
                    selectedPriority === priority && { color: '#FFFFFF' },
                  ]}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.clearButton, { backgroundColor: colors.surface }]}>
            <Text style={[styles.clearText, { color: colors.text }]}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});