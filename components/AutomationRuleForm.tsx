import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import {
  useAutomationTriggers,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useTestAutomationRule,
  AutomationRuleWithMetadata,
} from '@/hooks/useTaskAutomation';
import { AutomationAction } from '@/types/task-management';

interface AutomationRuleFormProps {
  rule?: AutomationRuleWithMetadata;
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  trigger:
    | 'task_completed'
    | 'task_overdue'
    | 'status_changed'
    | 'time_tracked'
    | 'due_date_approaching';
  conditions: Record<string, any>;
  actions: AutomationAction[];
  is_active: boolean;
}

export default function AutomationRuleForm({
  rule,
  onSave,
  onCancel,
}: AutomationRuleFormProps) {
  const theme = useTheme();
  const { data: triggers = [] } = useAutomationTriggers();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const testRule = useTestAutomationRule();

  const [formData, setFormData] = useState<FormData>({
    name: rule?.name || '',
    description: rule?.description || '',
    trigger: rule?.trigger || 'task_completed',
    conditions: rule?.conditions || {},
    actions: rule?.actions || [],
    is_active: rule?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTestMode, setIsTestMode] = useState(false);

  const selectedTrigger = triggers.find(
    (t) => t.event_type === formData.trigger
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required';
    }

    if (!formData.trigger) {
      newErrors.trigger = 'Trigger is required';
    }

    if (formData.actions.length === 0) {
      newErrors.actions = 'At least one action is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (rule) {
        await updateRule.mutateAsync({
          id: rule.id,
          updates: {
            ...formData,
            trigger: formData.trigger as any,
          },
        });
      } else {
        await createRule.mutateAsync({
          ...formData,
          trigger: formData.trigger as any,
        });
      }
      onSave();
    } catch (error) {
      console.error('Error saving automation rule:', error);
      Alert.alert('Error', 'Failed to save automation rule');
    }
  };

  const handleTest = async () => {
    if (!validateForm()) return;

    setIsTestMode(true);
    try {
      // For testing, we'll use a mock task ID
      // In a real implementation, you might want to let the user select a task
      const result = await testRule.mutateAsync({
        rule: {
          id: 'test',
          trigger: formData.trigger as any,
          conditions: formData.conditions,
          actions: formData.actions,
          enabled: formData.is_active,
        },
        task_id: 'mock-task-id',
      });

      Alert.alert(
        'Test Result',
        result.isValid
          ? `Rule is valid and ${
              result.wouldExecute ? 'would' : 'would not'
            } execute`
          : `Rule has errors: ${result.errors.join(', ')}`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Test Error', 'Failed to test automation rule');
    } finally {
      setIsTestMode(false);
    }
  };

  const addCondition = () => {
    const newConditions = { ...formData.conditions };
    const conditionKey = `condition_${Object.keys(newConditions).length + 1}`;
    newConditions[conditionKey] = '';
    setFormData({ ...formData, conditions: newConditions });
  };

  const updateCondition = (key: string, value: any) => {
    const newConditions = { ...formData.conditions };
    newConditions[key] = value;
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeCondition = (key: string) => {
    const newConditions = { ...formData.conditions };
    delete newConditions[key];
    setFormData({ ...formData, conditions: newConditions });
  };

  const addAction = () => {
    const newActions = [...formData.actions];
    newActions.push({
      type: 'create_task',
      parameters: {},
    });
    setFormData({ ...formData, actions: newActions });
  };

  const updateAction = (index: number, action: AutomationAction) => {
    const newActions = [...formData.actions];
    newActions[index] = action;
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index: number) => {
    const newActions = formData.actions.filter((_, i) => i !== index);
    setFormData({ ...formData, actions: newActions });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    pickerContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
    },
    pickerText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    conditionItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    conditionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    conditionTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    removeButton: {
      padding: 4,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '20',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      borderStyle: 'dashed',
    },
    addButtonText: {
      color: theme.colors.primary,
      fontWeight: '500',
      marginLeft: 8,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: 'white',
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Rule Name *</Text>
            <TextInput
              style={[
                styles.input,
                errors.name && { borderColor: theme.colors.error },
              ]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter rule name"
              placeholderTextColor={theme.colors.textSecondary}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Describe what this rule does"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.pickerText}>
                {formData.is_active ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_active: value })
                }
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={
                  formData.is_active ? 'white' : theme.colors.textSecondary
                }
              />
            </View>
          </View>
        </View>

        {/* Trigger Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trigger</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>When should this rule execute? *</Text>
            <View style={styles.pickerContainer}>
              {triggers.map((trigger) => (
                <TouchableOpacity
                  key={trigger.id}
                  style={[
                    styles.pickerButton,
                    formData.trigger === trigger.event_type && {
                      backgroundColor: theme.colors.primary + '20',
                    },
                  ]}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      trigger: trigger.event_type as any,
                    })
                  }
                >
                  <View>
                    <Text style={styles.pickerText}>{trigger.name}</Text>
                    <Text
                      style={[
                        styles.pickerText,
                        { fontSize: 12, color: theme.colors.textSecondary },
                      ]}
                    >
                      {trigger.description}
                    </Text>
                  </View>
                  {formData.trigger === trigger.event_type && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {errors.trigger && (
              <Text style={styles.errorText}>{errors.trigger}</Text>
            )}
          </View>
        </View>

        {/* Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions</Text>
          <Text style={[styles.label, { marginBottom: 12 }]}>
            Add conditions to control when this rule should execute
          </Text>

          {Object.entries(formData.conditions).map(([key, value]) => (
            <View key={key} style={styles.conditionItem}>
              <View style={styles.conditionHeader}>
                <Text style={styles.conditionTitle}>Condition</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeCondition(key)}
                >
                  <Ionicons name="close" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={
                  typeof value === 'string' ? value : JSON.stringify(value)
                }
                onChangeText={(text) => updateCondition(key, text)}
                placeholder="Enter condition (e.g., task.priority = 'high')"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addCondition}>
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Condition</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <Text style={[styles.label, { marginBottom: 12 }]}>
            Define what should happen when this rule executes *
          </Text>

          {formData.actions.map((action, index) => (
            <ActionEditor
              key={index}
              action={action}
              availableActions={selectedTrigger?.available_actions || []}
              onUpdate={(updatedAction) => updateAction(index, updatedAction)}
              onRemove={() => removeAction(index)}
              theme={theme}
            />
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addAction}>
            <Ionicons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Action</Text>
          </TouchableOpacity>
          {errors.actions && (
            <Text style={styles.errorText}>{errors.actions}</Text>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={onCancel}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleTest}
          disabled={testRule.isPending || isTestMode}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            {isTestMode ? 'Testing...' : 'Test'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSave}
          disabled={createRule.isPending || updateRule.isPending}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            {createRule.isPending || updateRule.isPending
              ? 'Saving...'
              : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface ActionEditorProps {
  action: AutomationAction;
  availableActions: string[];
  onUpdate: (action: AutomationAction) => void;
  onRemove: () => void;
  theme: any;
}

function ActionEditor({
  action,
  availableActions,
  onUpdate,
  onRemove,
  theme,
}: ActionEditorProps) {
  const actionTypes = [
    { value: 'create_task', label: 'Create Task' },
    { value: 'update_status', label: 'Update Status' },
    { value: 'update_priority', label: 'Update Priority' },
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'assign_user', label: 'Assign User' },
    { value: 'create_follow_up', label: 'Create Follow-up' },
    { value: 'reschedule', label: 'Reschedule' },
    { value: 'add_dependency', label: 'Add Dependency' },
    { value: 'create_subtasks', label: 'Create Subtasks' },
  ];

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    removeButton: {
      padding: 4,
    },
    pickerContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 8,
    },
    pickerButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
    },
    pickerText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    parametersContainer: {
      marginTop: 8,
    },
    parameterInput: {
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      padding: 10,
      fontSize: 14,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Action</Text>
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Ionicons name="close" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        {actionTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.pickerButton,
              action.type === type.value && {
                backgroundColor: theme.colors.primary + '20',
              },
            ]}
            onPress={() => onUpdate({ ...action, type: type.value as any })}
          >
            <Text style={styles.pickerText}>{type.label}</Text>
            {action.type === type.value && (
              <Ionicons
                name="checkmark"
                size={16}
                color={theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.parametersContainer}>
        <ActionParametersEditor
          actionType={action.type}
          parameters={action.parameters}
          onUpdate={(parameters) => onUpdate({ ...action, parameters })}
          theme={theme}
        />
      </View>
    </View>
  );
}

interface ActionParametersEditorProps {
  actionType: string;
  parameters: Record<string, any>;
  onUpdate: (parameters: Record<string, any>) => void;
  theme: any;
}

function ActionParametersEditor({
  actionType,
  parameters,
  onUpdate,
  theme,
}: ActionParametersEditorProps) {
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(parameters, null, 2));

  const updateParameter = (key: string, value: any) => {
    onUpdate({ ...parameters, [key]: value });
  };

  const styles = StyleSheet.create({
    container: {
      marginTop: 8,
    },
    toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    toggleText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    toggleButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: theme.colors.primary + '20',
    },
    toggleButtonText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    parameterRow: {
      marginBottom: 8,
    },
    parameterLabel: {
      fontSize: 12,
      color: theme.colors.text,
      marginBottom: 4,
      fontWeight: '500',
    },
    parameterInput: {
      backgroundColor: theme.colors.background,
      borderRadius: 6,
      padding: 10,
      fontSize: 14,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    jsonInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });

  if (jsonMode) {
    return (
      <View style={styles.container}>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>JSON Mode</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setJsonMode(false)}
          >
            <Text style={styles.toggleButtonText}>Simple Mode</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.parameterInput, styles.jsonInput]}
          value={jsonText}
          onChangeText={(text) => {
            setJsonText(text);
            try {
              const parsed = JSON.parse(text);
              onUpdate(parsed);
            } catch {
              // Invalid JSON, don't update
            }
          }}
          placeholder="Action parameters (JSON format)"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
        />
      </View>
    );
  }

  const renderParameterFields = () => {
    switch (actionType) {
      case 'create_task':
        return (
          <>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Task Title</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.title || ''}
                onChangeText={(text) => updateParameter('title', text)}
                placeholder="Enter task title"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Description</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.description || ''}
                onChangeText={(text) => updateParameter('description', text)}
                placeholder="Enter task description"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Priority</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.priority || ''}
                onChangeText={(text) => updateParameter('priority', text)}
                placeholder="low, medium, high, urgent"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Due Date (relative)</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.due_date || ''}
                onChangeText={(text) => updateParameter('due_date', text)}
                placeholder="+3 days, +1 week, etc."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </>
        );

      case 'update_status':
        return (
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>New Status</Text>
            <TextInput
              style={styles.parameterInput}
              value={parameters.status || ''}
              onChangeText={(text) => updateParameter('status', text)}
              placeholder="pending, in_progress, completed, etc."
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        );

      case 'update_priority':
        return (
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>New Priority</Text>
            <TextInput
              style={styles.parameterInput}
              value={parameters.priority || ''}
              onChangeText={(text) => updateParameter('priority', text)}
              placeholder="low, medium, high, urgent"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        );

      case 'send_notification':
        return (
          <>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Message</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.message || ''}
                onChangeText={(text) => updateParameter('message', text)}
                placeholder="Notification message"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Type</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.type || ''}
                onChangeText={(text) => updateParameter('type', text)}
                placeholder="info, warning, error"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </>
        );

      case 'create_follow_up':
        return (
          <>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Follow-up Title</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.title || ''}
                onChangeText={(text) => updateParameter('title', text)}
                placeholder="Follow up on {task.title}"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.parameterRow}>
              <Text style={styles.parameterLabel}>Due Date (relative)</Text>
              <TextInput
                style={styles.parameterInput}
                value={parameters.due_date || ''}
                onChangeText={(text) => updateParameter('due_date', text)}
                placeholder="+3 days, +1 week, etc."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </>
        );

      default:
        return (
          <View style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>Parameters</Text>
            <TextInput
              style={[styles.parameterInput, styles.jsonInput]}
              value={JSON.stringify(parameters, null, 2)}
              onChangeText={(text) => {
                try {
                  const parsed = JSON.parse(text);
                  onUpdate(parsed);
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder="Enter parameters as JSON"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>Simple Mode</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => {
            setJsonText(JSON.stringify(parameters, null, 2));
            setJsonMode(true);
          }}
        >
          <Text style={styles.toggleButtonText}>JSON Mode</Text>
        </TouchableOpacity>
      </View>
      {renderParameterFields()}
    </View>
  );
}
