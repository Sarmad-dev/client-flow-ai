import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { CreateOrganizationInput } from '@/types/organization';

interface OrganizationFormProps {
  onSubmit: (data: CreateOrganizationInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
}

export default function OrganizationForm({
  onSubmit,
  onCancel,
  isLoading,
  submitButtonText = 'Create',
  cancelButtonText = 'Cancel',
}: OrganizationFormProps) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (name.trim().length < 2) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        Organization Name *
      </Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.surface, color: colors.text },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="Enter organization name"
        placeholderTextColor={colors.textSecondary}
        editable={!isLoading}
      />

      <Text style={[styles.label, { color: colors.text }]}>Description</Text>
      <TextInput
        style={[
          styles.input,
          styles.textArea,
          { backgroundColor: colors.surface, color: colors.text },
        ]}
        value={description}
        onChangeText={setDescription}
        placeholder="Enter organization description"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!isLoading}
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.cancelButton,
            { backgroundColor: colors.surface },
          ]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {cancelButtonText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={handleSubmit}
          disabled={isLoading || name.trim().length < 2}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{submitButtonText}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: -8,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
