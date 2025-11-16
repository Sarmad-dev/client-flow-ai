import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { EmailSearchFilters } from '@/hooks/useEmailSearch';
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';

interface EmailFilterProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: EmailSearchFilters) => void;
  currentFilters: EmailSearchFilters;
}

export function EmailFilter({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
}: EmailFilterProps) {
  const { colors } = useTheme();
  const { data: clients } = useClients();
  const { data: leads } = useLeads();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentFilters.dateFrom
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(currentFilters.dateTo);
  const [direction, setDirection] = useState<
    'sent' | 'received' | 'all' | undefined
  >(currentFilters.direction || 'all');
  const [status, setStatus] = useState<string | undefined>(
    currentFilters.status
  );
  const [clientId, setClientId] = useState<string | undefined>(
    currentFilters.clientId
  );
  const [leadId, setLeadId] = useState<string | undefined>(
    currentFilters.leadId
  );
  const [isRead, setIsRead] = useState<boolean | undefined>(
    currentFilters.isRead
  );

  const statuses = [
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'deferred',
    'dropped',
  ];

  const handleApply = () => {
    const filters: EmailSearchFilters = {
      dateFrom,
      dateTo,
      direction: direction === 'all' ? undefined : direction,
      status,
      clientId,
      leadId,
      isRead,
    };
    onApplyFilters(filters);
    onClose();
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setDirection('all');
    setStatus(undefined);
    setClientId(undefined);
    setLeadId(undefined);
    setIsRead(undefined);
  };

  const hasActiveFilters =
    dateFrom ||
    dateTo ||
    (direction && direction !== 'all') ||
    status ||
    clientId ||
    leadId ||
    isRead !== undefined;

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
            Filter Emails
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Direction Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Direction
            </Text>
            <View style={styles.optionsGrid}>
              {(['all', 'sent', 'received'] as const).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    direction === dir && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setDirection(dir)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      direction === dir && { color: '#FFFFFF' },
                    ]}
                  >
                    {dir === 'all'
                      ? 'All'
                      : dir.charAt(0).toUpperCase() + dir.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Status
            </Text>
            <View style={styles.optionsGrid}>
              {statuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    status === s && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setStatus(status === s ? undefined : s)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      status === s && { color: '#FFFFFF' },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Read Status Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Read Status
            </Text>
            <View style={styles.optionsGrid}>
              {[
                { label: 'All', value: undefined },
                { label: 'Read', value: true },
                { label: 'Unread', value: false },
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.option,
                    { backgroundColor: colors.surface },
                    isRead === option.value && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setIsRead(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      isRead === option.value && { color: '#FFFFFF' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Date Range
            </Text>
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  // Simple date picker - in production, use a proper date picker
                  const date = new Date();
                  date.setDate(date.getDate() - 7);
                  setDateFrom(date);
                }}
              >
                <Text
                  style={[styles.dateLabel, { color: colors.textSecondary }]}
                >
                  From
                </Text>
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {dateFrom ? dateFrom.toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setDateTo(new Date());
                }}
              >
                <Text
                  style={[styles.dateLabel, { color: colors.textSecondary }]}
                >
                  To
                </Text>
                <Text style={[styles.dateText, { color: colors.text }]}>
                  {dateTo ? dateTo.toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>
            {(dateFrom || dateTo) && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                <Text style={[styles.clearDateText, { color: colors.primary }]}>
                  Clear dates
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Client Filter */}
          {clients && clients.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Client
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                <View style={styles.optionsGrid}>
                  {clients.slice(0, 10).map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.option,
                        { backgroundColor: colors.surface },
                        clientId === client.id && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setClientId(
                          clientId === client.id ? undefined : client.id
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.text },
                          clientId === client.id && { color: '#FFFFFF' },
                        ]}
                      >
                        {client.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Lead Filter */}
          {leads && leads.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Lead
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                <View style={styles.optionsGrid}>
                  {leads.slice(0, 10).map((lead) => (
                    <TouchableOpacity
                      key={lead.id}
                      style={[
                        styles.option,
                        { backgroundColor: colors.surface },
                        leadId === lead.id && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() =>
                        setLeadId(leadId === lead.id ? undefined : lead.id)
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.text },
                          leadId === lead.id && { color: '#FFFFFF' },
                        ]}
                      >
                        {lead.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.surface }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearText, { color: colors.text }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.applyButton,
              { backgroundColor: colors.primary },
              !hasActiveFilters && { flex: 1 },
            ]}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  horizontalScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
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
