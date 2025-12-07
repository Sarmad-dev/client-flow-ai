import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Building2, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useOrganizations } from '@/hooks/useOrganizations';
import OrganizationForm from '@/components/OrganizationForm';
import { useAlert } from '@/contexts/CustomAlertContext';
import type { CreateOrganizationInput } from '@/types/organization';

export default function OrganizationOnboardingScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const { createOrganization } = useOrganizations();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (data: CreateOrganizationInput) => {
    setIsCreating(true);
    try {
      await createOrganization.mutateAsync(data);
      showAlert({
        title: 'Success',
        message: 'Organization created successfully',
      });
      router.push('/(onboarding)/complete');
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to create organization',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/complete');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.primary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.primary }]}
          >
            <Building2 size={48} color="#fff" />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Create Your Organization
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Set up your organization to collaborate with your team and manage
          clients together.
        </Text>

        <View style={styles.formContainer}>
          <OrganizationForm
            onSubmit={handleCreate}
            onCancel={handleSkip}
            isLoading={isCreating}
            submitButtonText="Create & Continue"
            cancelButtonText="Skip"
          />
        </View>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  formContainer: {
    flex: 1,
  },
});
