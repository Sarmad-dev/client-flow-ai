import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { X, Download, FileText, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useExportEmailData,
  useExportAnalyticsSummary,
} from '@/hooks/useEmailExport';

interface EmailExportModalProps {
  visible: boolean;
  onClose: () => void;
  dateRange?: { start: Date; end: Date };
}

export default function EmailExportModal({
  visible,
  onClose,
  dateRange,
}: EmailExportModalProps) {
  const { colors } = useTheme();
  const [exportType, setExportType] = useState<'full' | 'summary'>('full');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(false);

  const exportEmailData = useExportEmailData();
  const exportSummary = useExportAnalyticsSummary();

  const handleExport = async () => {
    try {
      if (exportType === 'summary') {
        const result = await exportSummary.mutateAsync(dateRange);
        Alert.alert(
          'Export Successful',
          `Analytics summary exported successfully!\n\nFile: ${result.filename}`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        const result = await exportEmailData.mutateAsync({
          dateRange,
          includeMetrics,
          includeEvents,
          format,
        });
        Alert.alert(
          'Export Successful',
          `${result.recordCount} emails exported successfully!\n\nFile: ${result.filename}`,
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Export Failed',
        error.message || 'Failed to export data. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const isLoading = exportEmailData.isPending || exportSummary.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Download size={24} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.title, { color: colors.text }]}>
                Export Email Data
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Date Range Info */}
          {dateRange && (
            <View
              style={[
                styles.dateRangeInfo,
                { backgroundColor: `${colors.primary}10` },
              ]}
            >
              <Text style={[styles.dateRangeText, { color: colors.text }]}>
                Exporting data from {dateRange.start.toLocaleDateString()} to{' '}
                {dateRange.end.toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Export Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Export Type
            </Text>
            <View style={styles.optionGroup}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      exportType === 'full'
                        ? colors.primary
                        : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setExportType('full')}
                disabled={isLoading}
              >
                <FileText
                  size={20}
                  color={
                    exportType === 'full' ? '#FFFFFF' : colors.textSecondary
                  }
                  strokeWidth={2}
                />
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      {
                        color: exportType === 'full' ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    Full Data Export
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      {
                        color:
                          exportType === 'full'
                            ? 'rgba(255,255,255,0.8)'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    All email records with details
                  </Text>
                </View>
                {exportType === 'full' && (
                  <CheckCircle size={20} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      exportType === 'summary'
                        ? colors.primary
                        : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setExportType('summary')}
                disabled={isLoading}
              >
                <FileText
                  size={20}
                  color={
                    exportType === 'summary' ? '#FFFFFF' : colors.textSecondary
                  }
                  strokeWidth={2}
                />
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      {
                        color:
                          exportType === 'summary' ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    Analytics Summary
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      {
                        color:
                          exportType === 'summary'
                            ? 'rgba(255,255,255,0.8)'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Aggregated metrics only
                  </Text>
                </View>
                {exportType === 'summary' && (
                  <CheckCircle size={20} color="#FFFFFF" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Format Selection (only for full export) */}
          {exportType === 'full' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Format
              </Text>
              <View style={styles.formatButtons}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    {
                      backgroundColor:
                        format === 'csv' ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setFormat('csv')}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.formatButtonText,
                      {
                        color: format === 'csv' ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    CSV
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    {
                      backgroundColor:
                        format === 'json' ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setFormat('json')}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.formatButtonText,
                      {
                        color: format === 'json' ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    JSON
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Options (only for full export) */}
          {exportType === 'full' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Options
              </Text>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Include engagement metrics
                </Text>
                <Switch
                  value={includeMetrics}
                  onValueChange={setIncludeMetrics}
                  disabled={isLoading}
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Include event history
                </Text>
                <Switch
                  value={includeEvents}
                  onValueChange={setIncludeEvents}
                  disabled={isLoading}
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.background },
              ]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportButton,
                { backgroundColor: colors.primary },
                isLoading && styles.exportButtonDisabled,
              ]}
              onPress={handleExport}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Download size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.exportButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  dateRangeInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionGroup: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
