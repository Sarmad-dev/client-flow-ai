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

interface LeadFilterProps {
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
}

export function LeadFilter({ onClose, onApplyFilters }: LeadFilterProps) {
  const { colors } = useTheme();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const statuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
  const sources = ['manual', 'map_search', 'referral', 'website'];

  const handleApply = () => {
    const filters = {
      status: selectedStatus,
      source: selectedSource,
    };
    onApplyFilters(filters);
  };

  const clearFilters = () => {
    setSelectedStatus(null);
    setSelectedSource(null);
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Filter Leads</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
            <View style={styles.optionsGrid}>
              {statuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    selectedStatus === status && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedStatus(selectedStatus === status ? null : status)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.text },
                    selectedStatus === status && { color: '#FFFFFF' },
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Source</Text>
            <View style={styles.optionsGrid}>
              {sources.map((source) => (
                <TouchableOpacity
                  key={source}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    selectedSource === source && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedSource(selectedSource === source ? null : source)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: colors.text },
                    selectedSource === source && { color: '#FFFFFF' },
                  ]}>
                    {source.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.clearButton, { backgroundColor: colors.surface }]}
            onPress={clearFilters}
          >
            <Text style={[styles.clearText, { color: colors.text }]}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={handleApply}
          >
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