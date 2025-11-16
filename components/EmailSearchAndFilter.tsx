import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { Search, Filter, X, ArrowUpDown, Bookmark } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useEmailSearch,
  EmailSearchFilters,
  EmailSortOptions,
  getHighlightedSegments,
} from '@/hooks/useEmailSearch';
import { useEmailSortPreferences } from '@/hooks/useEmailSortPreferences';
import { EmailFilter } from './EmailFilter';
import { EmailSortMenu } from './EmailSortMenu';
import { SavedEmailFilters } from './SavedEmailFilters';
import { EmailRecord } from '@/hooks/useEmails';

interface EmailSearchAndFilterProps {
  onSelectEmail: (email: EmailRecord) => void;
}

export default function EmailSearchAndFilter({
  onSelectEmail,
}: EmailSearchAndFilterProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EmailSearchFilters>({});
  const { sortOptions, updateSortOptions, isLoaded } =
    useEmailSortPreferences();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);

  // Combine search query with filters
  const combinedFilters = useMemo(
    () => ({
      ...filters,
      searchQuery: searchQuery.trim() || undefined,
    }),
    [filters, searchQuery]
  );

  const { data: emails, isLoading } = useEmailSearch(
    combinedFilters,
    sortOptions
  );

  const handleSortChange = (newSort: EmailSortOptions) => {
    updateSortOptions(newSort);
  };

  const handleApplySavedFilter = (savedFilters: EmailSearchFilters) => {
    setFilters(savedFilters);
    if (savedFilters.searchQuery) {
      setSearchQuery(savedFilters.searchQuery);
    }
  };

  const handleApplyFilters = (newFilters: EmailSearchFilters) => {
    setFilters(newFilters);
  };

  const handleRemoveFilter = (filterKey: keyof EmailSearchFilters) => {
    setFilters((prev) => {
      const updated = { ...prev };
      delete updated[filterKey];
      return updated;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  // Count active filters (excluding search query)
  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof EmailSearchFilters] !== undefined
  ).length;

  const hasActiveFilters =
    activeFilterCount > 0 || searchQuery.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            placeholder="Search emails..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            activeFilterCount > 0 && { backgroundColor: colors.primary },
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter
            size={20}
            color={activeFilterCount > 0 ? '#FFFFFF' : colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowSortMenu(true)}
        >
          <ArrowUpDown size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.savedFiltersButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowSavedFilters(true)}
        >
          <Bookmark size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsContainer}
          contentContainerStyle={styles.chipsContent}
        >
          {searchQuery.trim() && (
            <FilterChip
              label={`Search: "${searchQuery}"`}
              onRemove={() => setSearchQuery('')}
              colors={colors}
            />
          )}
          {filters.direction && filters.direction !== 'all' && (
            <FilterChip
              label={`Direction: ${filters.direction}`}
              onRemove={() => handleRemoveFilter('direction')}
              colors={colors}
            />
          )}
          {filters.status && (
            <FilterChip
              label={`Status: ${filters.status}`}
              onRemove={() => handleRemoveFilter('status')}
              colors={colors}
            />
          )}
          {filters.isRead !== undefined && (
            <FilterChip
              label={filters.isRead ? 'Read' : 'Unread'}
              onRemove={() => handleRemoveFilter('isRead')}
              colors={colors}
            />
          )}
          {filters.dateFrom && (
            <FilterChip
              label={`From: ${filters.dateFrom.toLocaleDateString()}`}
              onRemove={() => handleRemoveFilter('dateFrom')}
              colors={colors}
            />
          )}
          {filters.dateTo && (
            <FilterChip
              label={`To: ${filters.dateTo.toLocaleDateString()}`}
              onRemove={() => handleRemoveFilter('dateTo')}
              colors={colors}
            />
          )}
          {filters.clientId && (
            <FilterChip
              label="Client filter"
              onRemove={() => handleRemoveFilter('clientId')}
              colors={colors}
            />
          )}
          {filters.leadId && (
            <FilterChip
              label="Lead filter"
              onRemove={() => handleRemoveFilter('leadId')}
              colors={colors}
            />
          )}
          <TouchableOpacity
            style={[styles.clearAllChip, { borderColor: colors.border }]}
            onPress={clearAllFilters}
          >
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              Clear all
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Email List */}
      <FlatList
        data={emails ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <EmailCard
            email={item}
            onPress={() => onSelectEmail(item)}
            searchQuery={searchQuery}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isLoading
                ? 'Loading emails...'
                : hasActiveFilters
                ? 'No emails match your search criteria'
                : 'No emails found'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <EmailFilter
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApplyFilters={handleApplyFilters}
          currentFilters={filters}
        />
      )}

      {/* Sort Menu */}
      {showSortMenu && (
        <EmailSortMenu
          visible={showSortMenu}
          onClose={() => setShowSortMenu(false)}
          currentSort={sortOptions}
          onSortChange={handleSortChange}
        />
      )}

      {/* Saved Filters */}
      {showSavedFilters && (
        <SavedEmailFilters
          visible={showSavedFilters}
          onClose={() => setShowSavedFilters(false)}
          onApplyFilter={handleApplySavedFilter}
          currentFilters={combinedFilters}
        />
      )}
    </View>
  );
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  colors: any;
}

function FilterChip({ label, onRemove, colors }: FilterChipProps) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

interface EmailCardProps {
  email: EmailRecord;
  onPress: () => void;
  searchQuery: string;
  colors: any;
}

function EmailCard({ email, onPress, searchQuery, colors }: EmailCardProps) {
  const subjectSegments = getHighlightedSegments(
    email.subject || '(No subject)',
    searchQuery
  );
  const bodySegments = getHighlightedSegments(
    email.body_text || '',
    searchQuery
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.emailCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.emailHeader}>
        <View style={styles.emailHeaderLeft}>
          <HighlightedText segments={subjectSegments} colors={colors} bold />
          {!email.is_read && email.direction === 'received' && (
            <View
              style={[styles.unreadBadge, { backgroundColor: colors.primary }]}
            />
          )}
        </View>
        <Text style={[styles.emailDate, { color: colors.textSecondary }]}>
          {new Date(email.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={[styles.emailMeta, { color: colors.textSecondary }]}>
        {email.direction === 'sent' ? 'To: ' : 'From: '}
        {email.direction === 'sent'
          ? email.recipient_email
          : email.sender_email}
      </Text>

      <View style={styles.emailBody}>
        <HighlightedText
          segments={bodySegments.slice(0, 100)}
          colors={colors}
          numberOfLines={2}
        />
      </View>

      <View style={styles.emailFooter}>
        <Text style={[styles.emailStatus, { color: colors.textSecondary }]}>
          {email.direction} • {email.status || 'sent'}
        </Text>
        {email.attachment_count > 0 && (
          <Text
            style={[styles.attachmentCount, { color: colors.textSecondary }]}
          >
            📎 {email.attachment_count}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface HighlightedTextProps {
  segments: Array<{ text: string; highlighted: boolean }>;
  colors: any;
  bold?: boolean;
  numberOfLines?: number;
}

function HighlightedText({
  segments,
  colors,
  bold,
  numberOfLines,
}: HighlightedTextProps) {
  return (
    <Text
      style={[
        styles.highlightedText,
        { color: colors.text },
        bold && styles.boldText,
      ]}
      numberOfLines={numberOfLines}
    >
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={[
            segment.highlighted && {
              backgroundColor: colors.primary + '30',
              fontWeight: '600',
            },
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedFiltersButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipsContent: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearAllChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emailCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  emailHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emailDate: {
    fontSize: 12,
  },
  emailMeta: {
    fontSize: 13,
    marginBottom: 6,
  },
  emailBody: {
    marginBottom: 8,
  },
  emailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailStatus: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  attachmentCount: {
    fontSize: 12,
  },
  highlightedText: {
    fontSize: 14,
  },
  boldText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
