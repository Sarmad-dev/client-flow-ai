import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { X, Save, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useSavedEmailFilters,
  SavedEmailFilter,
} from '@/hooks/useSavedEmailFilters';
import { EmailSearchFilters } from '@/hooks/useEmailSearch';

interface SavedEmailFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilter: (filters: EmailSearchFilters) => void;
  currentFilters?: EmailSearchFilters;
}

export function SavedEmailFilters({
  visible,
  onClose,
  onApplyFilter,
  currentFilters,
}: SavedEmailFiltersProps) {
  const { colors } = useTheme();
  const { savedFilters, saveFilter, deleteFilter } = useSavedEmailFilters();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCurrentFilter = async () => {
    if (!filterName.trim()) {
      Alert.alert('Error', 'Please enter a name for this filter');
      return;
    }

    if (!currentFilters || Object.keys(currentFilters).length === 0) {
      Alert.alert('Error', 'No filters to save');
      return;
    }

    setIsSaving(true);
    try {
      await saveFilter(filterName.trim(), currentFilters);
      setFilterName('');
      setShowSaveDialog(false);
      Alert.alert('Success', 'Filter saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save filter');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFilter = (filter: SavedEmailFilter) => {
    Alert.alert(
      'Delete Filter',
      `Are you sure you want to delete "${filter.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFilter(filter.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete filter');
            }
          },
        },
      ]
    );
  };

  const handleApplyFilter = (filter: SavedEmailFilter) => {
    onApplyFilter(filter.filters);
    onClose();
  };

  const getFilterDescription = (filters: EmailSearchFilters): string => {
    const parts: string[] = [];

    if (filters.searchQuery) {
      parts.push(`Search: "${filters.searchQuery}"`);
    }
    if (filters.direction && filters.direction !== 'all') {
      parts.push(`Direction: ${filters.direction}`);
    }
    if (filters.status) {
      parts.push(`Status: ${filters.status}`);
    }
    if (filters.isRead !== undefined) {
      parts.push(filters.isRead ? 'Read' : 'Unread');
    }
    if (filters.dateFrom) {
      parts.push(`From: ${filters.dateFrom.toLocaleDateString()}`);
    }
    if (filters.dateTo) {
      parts.push(`To: ${filters.dateTo.toLocaleDateString()}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Saved Filters
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {currentFilters && Object.keys(currentFilters).length > 0 && (
          <View style={styles.saveSection}>
            <TouchableOpacity
              style={[
                styles.saveCurrentButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => setShowSaveDialog(true)}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveCurrentText}>Save Current Filter</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={savedFilters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No saved filters yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary }]}
              >
                Apply filters and save them for quick access
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.filterCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={styles.filterCardContent}
                onPress={() => handleApplyFilter(item)}
              >
                <View style={styles.filterCardHeader}>
                  <Text style={[styles.filterName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.filterDate, { color: colors.textSecondary }]}
                  >
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.filterDescription,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {getFilterDescription(item.filters)}
                </Text>
              </TouchableOpacity>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => handleDeleteFilter(item)}
                >
                  <Trash2 size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Save Dialog */}
      {showSaveDialog && (
        <Modal transparent animationType="fade">
          <Pressable
            style={styles.dialogOverlay}
            onPress={() => setShowSaveDialog(false)}
          >
            <Pressable
              style={[styles.dialog, { backgroundColor: colors.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.dialogTitle, { color: colors.text }]}>
                Save Filter
              </Text>
              <TextInput
                style={[
                  styles.dialogInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Enter filter name"
                placeholderTextColor={colors.textSecondary}
                value={filterName}
                onChangeText={setFilterName}
                autoFocus
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={[
                    styles.dialogButton,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => {
                    setFilterName('');
                    setShowSaveDialog(false);
                  }}
                >
                  <Text
                    style={[styles.dialogButtonText, { color: colors.text }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dialogButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSaveCurrentFilter}
                  disabled={isSaving}
                >
                  <Text style={styles.dialogButtonTextPrimary}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  saveSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  saveCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveCurrentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 24,
    gap: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  filterCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterCardContent: {
    padding: 16,
  },
  filterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  filterDate: {
    fontSize: 12,
  },
  filterDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  filterActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dialogButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dialogButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
