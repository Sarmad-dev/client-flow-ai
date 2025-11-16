import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Check, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { EmailSortOptions } from '@/hooks/useEmailSearch';

interface EmailSortMenuProps {
  visible: boolean;
  onClose: () => void;
  currentSort: EmailSortOptions;
  onSortChange: (sort: EmailSortOptions) => void;
}

export function EmailSortMenu({
  visible,
  onClose,
  currentSort,
  onSortChange,
}: EmailSortMenuProps) {
  const { colors } = useTheme();

  const sortFields: Array<{
    field: EmailSortOptions['field'];
    label: string;
  }> = [
    { field: 'date', label: 'Date' },
    { field: 'subject', label: 'Subject' },
    { field: 'recipient', label: 'Recipient' },
    { field: 'status', label: 'Status' },
  ];

  const handleFieldSelect = (field: EmailSortOptions['field']) => {
    onSortChange({ ...currentSort, field });
  };

  const toggleOrder = () => {
    onSortChange({
      ...currentSort,
      order: currentSort.order === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.menu, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Sort By</Text>
          </View>

          {/* Sort Field Options */}
          <View style={styles.section}>
            {sortFields.map((item) => (
              <TouchableOpacity
                key={item.field}
                style={[styles.option, { borderBottomColor: colors.border }]}
                onPress={() => handleFieldSelect(item.field)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    currentSort.field === item.field && {
                      color: colors.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {currentSort.field === item.field && (
                  <Check size={20} color={colors.primary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort Order Toggle */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.orderToggle,
                { backgroundColor: colors.background },
              ]}
              onPress={toggleOrder}
            >
              <View style={styles.orderToggleContent}>
                {currentSort.order === 'asc' ? (
                  <ArrowUp size={20} color={colors.primary} strokeWidth={2.5} />
                ) : (
                  <ArrowDown
                    size={20}
                    color={colors.primary}
                    strokeWidth={2.5}
                  />
                )}
                <Text style={[styles.orderText, { color: colors.text }]}>
                  {currentSort.order === 'asc' ? 'Ascending' : 'Descending'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  optionText: {
    fontSize: 16,
  },
  orderToggle: {
    marginHorizontal: 24,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  orderToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
