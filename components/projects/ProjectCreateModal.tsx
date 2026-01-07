import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Calendar,
  DollarSign,
  Clock,
  Flag,
  User,
  Building,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCreateProject } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';
import type { ProjectRecord } from '@/types/task-management';

interface ProjectCreateModalProps {
  visible: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialLeadId?: string;
}

export function ProjectCreateModal({
  visible,
  onClose,
  initialClientId,
  initialLeadId,
}: ProjectCreateModalProps) {
  const { colors } = useTheme();
  const createProject = useCreateProject();
  const clientsQuery = useClients();
  const leadsQuery = useLeads();

  const [formData, setFormData] = useState<Partial<ProjectRecord>>({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    client_id: initialClientId || null,
    lead_id: initialLeadId || null,
    start_date: null,
    due_date: null,
    estimated_hours: null,
    budget: null,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        client_id: initialClientId || null,
        lead_id: initialLeadId || null,
        start_date: null,
        due_date: null,
        estimated_hours: null,
        budget: null,
        notes: '',
      });
      setErrors({});
    }
  }, [visible, initialClientId, initialLeadId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (formData.client_id && formData.lead_id) {
      newErrors.association =
        'Project cannot be associated with both client and lead';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createProject.mutateAsync({
        ...formData,
        name: formData.name as string,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    }
  };

  const clients = clientsQuery.data ?? [];
  const leads = leadsQuery.data ?? [];

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Project
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Project Name */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Project Name *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: errors.name ? '#EF4444' : colors.border,
                },
              ]}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Enter project name"
              placeholderTextColor={colors.textSecondary}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              value={formData.description!}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              placeholder="Project description"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Client/Lead Association */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              Associate with
            </Text>

            {/* Client Selection */}
            <View style={styles.associationSection}>
              <View style={styles.associationHeader}>
                <User size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.associationLabel, { color: colors.text }]}>
                  Client
                </Text>
              </View>
              <View style={styles.optionsList}>
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: !formData.client_id
                        ? colors.primary + '20'
                        : colors.surface,
                      borderColor: !formData.client_id
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      client_id: null,
                      lead_id: null,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: !formData.client_id
                          ? colors.primary
                          : colors.text,
                      },
                    ]}
                  >
                    No Client
                  </Text>
                </TouchableOpacity>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor:
                          formData.client_id === client.id
                            ? colors.primary + '20'
                            : colors.surface,
                        borderColor:
                          formData.client_id === client.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        client_id: client.id,
                        lead_id: null,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            formData.client_id === client.id
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {client.name}
                      {client.company && ` • ${client.company}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Lead Selection */}
            <View style={styles.associationSection}>
              <View style={styles.associationHeader}>
                <Building
                  size={16}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={[styles.associationLabel, { color: colors.text }]}>
                  Lead
                </Text>
              </View>
              <View style={styles.optionsList}>
                {leads.map((lead) => (
                  <TouchableOpacity
                    key={lead.id}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor:
                          formData.lead_id === lead.id
                            ? colors.primary + '20'
                            : colors.surface,
                        borderColor:
                          formData.lead_id === lead.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        lead_id: lead.id,
                        client_id: null,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            formData.lead_id === lead.id
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {lead.name}
                      {lead.company && ` • ${lead.company}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {errors.association && (
              <Text style={styles.errorText}>{errors.association}</Text>
            )}
          </View>

          {/* Status and Priority */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text }]}>Status</Text>
              <View style={styles.optionsList}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor:
                          formData.status === option.value
                            ? colors.primary + '20'
                            : colors.surface,
                        borderColor:
                          formData.status === option.value
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        status: option.value as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            formData.status === option.value
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Priority
              </Text>
              <View style={styles.optionsList}>
                {priorityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor:
                          formData.priority === option.value
                            ? colors.primary + '20'
                            : colors.surface,
                        borderColor:
                          formData.priority === option.value
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: option.value as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            formData.priority === option.value
                              ? colors.primary
                              : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Start Date
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.start_date || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, start_date: text || null }))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Due Date
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.due_date || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, due_date: text || null }))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Estimates */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Estimated Hours
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.estimated_hours?.toString() || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    estimated_hours: text ? parseFloat(text) : null,
                  }))
                }
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Budget ($)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.budget?.toString() || ''}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    budget: text ? parseFloat(text) : null,
                  }))
                }
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              value={formData.notes!}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, notes: text }))
              }
              placeholder="Additional notes"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              { borderColor: colors.border },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.createButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleSubmit}
            disabled={createProject.isPending}
          >
            <Text style={styles.createButtonText}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  associationSection: {
    marginBottom: 16,
  },
  associationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  associationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {},
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
