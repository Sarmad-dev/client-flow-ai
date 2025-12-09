import { useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

interface UseSubscriptionUsageReturn {
  checkAndIncrementLeads: () => Promise<boolean>;
  checkAndIncrementClients: () => Promise<boolean>;
  checkAndIncrementTasks: () => Promise<boolean>;
  checkAndIncrementEmails: (type: 'client' | 'lead') => Promise<boolean>;
  checkAndIncrementAutomation: () => Promise<boolean>;
  checkAndIncrementTemplate: () => Promise<boolean>;
  checkFeatureAccess: (
    featureName: string,
    checkFunction: () => boolean
  ) => boolean;
  showUpgradePrompt: (featureName: string, reason?: string) => void;
}

export const useSubscriptionUsage = (): UseSubscriptionUsageReturn => {
  const {
    canCreateLead,
    canCreateClient,
    canCreateTask,
    canSendEmail,
    canAccessAutomation,
    incrementUsage,
    userSubscription,
  } = useSubscription();

  const router = useRouter();

  const showUpgradePrompt = useCallback(
    (featureName: string, reason?: string) => {
      const message =
        reason ||
        `You've reached your ${featureName} limit on the ${userSubscription.plan} plan.`;

      Alert.alert(
        'Upgrade Required',
        `${message}\n\nUpgrade to unlock more ${featureName} and other premium features.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'View Plans',
            onPress: () => router.push('/(tabs)/subscription'),
          },
        ]
      );
    },
    [userSubscription.plan, router]
  );

  const checkAndIncrementLeads = useCallback(async (): Promise<boolean> => {
    if (!canCreateLead()) {
      showUpgradePrompt(
        'leads',
        `You've reached your limit of ${userSubscription.currentUsage.leads} leads.`
      );
      return false;
    }
    await incrementUsage('leads');
    return true;
  }, [
    canCreateLead,
    incrementUsage,
    showUpgradePrompt,
    userSubscription.currentUsage.leads,
  ]);

  const checkAndIncrementClients = useCallback(async (): Promise<boolean> => {
    if (!canCreateClient()) {
      showUpgradePrompt(
        'clients',
        `You've reached your limit of ${userSubscription.currentUsage.clients} clients.`
      );
      return false;
    }
    await incrementUsage('clients');
    return true;
  }, [
    canCreateClient,
    incrementUsage,
    showUpgradePrompt,
    userSubscription.currentUsage.clients,
  ]);

  const checkAndIncrementTasks = useCallback(async (): Promise<boolean> => {
    if (!canCreateTask()) {
      showUpgradePrompt('tasks', `You've reached your task limit.`);
      return false;
    }
    await incrementUsage('tasks');
    return true;
  }, [canCreateTask, incrementUsage, showUpgradePrompt]);

  const checkAndIncrementEmails = useCallback(
    async (type: 'client' | 'lead'): Promise<boolean> => {
      if (!canSendEmail(type, '')) {
        showUpgradePrompt('emails', `You've reached your email limit.`);
        return false;
      }
      await incrementUsage('emailsSent');
      return true;
    },
    [canSendEmail, incrementUsage, showUpgradePrompt]
  );

  const checkAndIncrementAutomation =
    useCallback(async (): Promise<boolean> => {
      if (!canAccessAutomation()) {
        showUpgradePrompt(
          'automation rules',
          'Automation is not available on your current plan.'
        );
        return false;
      }
      await incrementUsage('automationRules');
      return true;
    }, [canAccessAutomation, incrementUsage, showUpgradePrompt]);

  const checkAndIncrementTemplate = useCallback(async (): Promise<boolean> => {
    const limits =
      userSubscription.plan === 'free'
        ? 2
        : userSubscription.plan === 'basic'
        ? 10
        : 50;
    if (userSubscription.currentUsage.emailTemplates >= limits) {
      showUpgradePrompt(
        'email templates',
        `You've reached your limit of ${limits} templates.`
      );
      return false;
    }
    await incrementUsage('emailTemplates');
    return true;
  }, [userSubscription, incrementUsage, showUpgradePrompt]);

  const checkFeatureAccess = useCallback(
    (featureName: string, checkFunction: () => boolean): boolean => {
      const hasAccess = checkFunction();
      if (!hasAccess) {
        showUpgradePrompt(
          featureName,
          `${featureName} is not available on your current plan.`
        );
      }
      return hasAccess;
    },
    [showUpgradePrompt]
  );

  return {
    checkAndIncrementLeads,
    checkAndIncrementClients,
    checkAndIncrementTasks,
    checkAndIncrementEmails,
    checkAndIncrementAutomation,
    checkAndIncrementTemplate,
    checkFeatureAccess,
    showUpgradePrompt,
  };
};
