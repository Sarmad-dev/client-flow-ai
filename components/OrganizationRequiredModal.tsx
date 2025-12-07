import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Building2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import OrganizationForm from '@/components/OrganizationForm';
import { useAlert } from '@/contexts/CustomAlertContext';
import type { CreateOrganizationInput } from '@/types/organization';

export default function OrganizationRequiredModal() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { organizations, isLoading, createOrganization } = useOrganizations();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasChecked) {
      setHasChecked(true);
      const ownsOrganization = organizations.some(
        (org) => org.user_role === 'owner'
      );
      if (!ownsOrganization) {
        setShowModal(true);
      }
    }
  }, [organizations, isLoading, hasChecked]);

  const handleCreate = async (data: CreateOrganizationInput) => {
    try {
      await createOrganization.mutateAsync(data);
      setShowModal(false);
      showAlert({
        title: 'Success',
        message: 'Organization created successfully',
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to create organization',
      });
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (isLoading || !showModal) {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.iconContainer}>
            <View
              style={[styles.iconCircle, { backgroundColor: colors.primary }]}
            >
              <Building2 size={40} color="#fff" />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Create Your Organization
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            To get started with NexaSuit, you need to create an organization.
            This will help you manage your team and collaborate effectively.
          </Text>

          <View style={styles.formContainer}>
            <OrganizationForm
              onSubmit={handleCreate}
              onCancel={handleDismiss}
              isLoading={createOrganization.isPending}
              submitButtonText="Create Organization"
              cancelButtonText="Skip for now"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  formContainer: {
    marginTop: 8,
  },
});
