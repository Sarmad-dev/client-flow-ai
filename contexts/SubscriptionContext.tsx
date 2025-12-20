import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserSubscription,
  SubscriptionPlan,
  BillingPeriod,
  SubscriptionAnalytics,
  SubscriptionUsageEvent,
} from '@/types/subscription';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { REVENUECAT_CONFIG, getLimitsByPlan } from '@/lib/subscriptionConfig';
import {
  isWithinLimit,
  getSubscriptionAnalytics,
  isInTrialPeriod,
  getTrialDaysRemaining,
  getFeatureLimitMessage,
} from '@/lib/subscriptionUtils';

interface SubscriptionContextType {
  // State
  userSubscription: UserSubscription;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  analytics: SubscriptionAnalytics | null;

  // Subscription Management
  checkSubscriptionStatus: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  changePlan: (
    newPlan: SubscriptionPlan,
    billingPeriod: BillingPeriod
  ) => Promise<boolean>;

  // Feature Access Checks
  canCreateLead: () => boolean;
  canCreateClient: () => boolean;
  canCreateTask: (clientId?: string) => boolean;
  canSendEmail: (type: 'client' | 'lead', id: string) => boolean;
  canAccessMeetings: () => boolean;
  canAccessAnalytics: () => boolean;
  canAccessAI: () => boolean;
  canAccessAutomation: () => boolean;
  canAddTeamMember: () => boolean;
  canAccessAPI: () => boolean;
  canAccessCustomBranding: () => boolean;
  canAccessAdvancedReports: () => boolean;
  canPerformBulkOperations: () => boolean;
  canUseCustomFields: () => boolean;
  canUseWebhooks: () => boolean;

  // Usage Management
  incrementUsage: (
    type: keyof UserSubscription['currentUsage']
  ) => Promise<void>;
  decrementUsage: (
    type: keyof UserSubscription['currentUsage']
  ) => Promise<void>;
  syncUsageWithDatabase: () => Promise<void>;
  trackUsageEvent: (event: SubscriptionUsageEvent) => Promise<void>;

  // Utility Functions
  getFeatureLimit: (feature: string) => number;
  getFeatureLimitMessage: (feature: string) => string;
  isInTrial: () => boolean;
  getTrialDaysLeft: () => number;
  refreshAnalytics: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  plan: 'free',
  status: 'active',
  isActive: true,
  willRenew: false,
  currentUsage: {
    leads: 0,
    clients: 0,
    tasks: 0,
    emailsSent: 0,
    teamMembers: 1,
    automationRules: 0,
    emailTemplates: 0,
    storageUsedMB: 0,
  },
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userSubscription, setUserSubscription] =
    useState<UserSubscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(
    null
  );
  const { user } = useAuth();

  // Initialize RevenueCat
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  // Load subscription when user changes
  useEffect(() => {
    if (user?.id) {
      loadSubscriptionFromDatabase(user.id);
    } else {
      loadSubscriptionFromStorage();
    }
  }, [user?.id]);

  // Update analytics when subscription changes
  useEffect(() => {
    refreshAnalytics();
  }, [userSubscription]);

  const initializeRevenueCat = async () => {
    try {
      const apiKey =
        Platform.OS === 'ios'
          ? REVENUECAT_CONFIG.apiKeys.ios
          : REVENUECAT_CONFIG.apiKeys.android;

      await Purchases.configure({ apiKey });

      // Set up listener for customer info updates
      Purchases.addCustomerInfoUpdateListener((info) => {
        handleCustomerInfoUpdate(info);
      });

      await fetchOfferings();
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  };

  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      setOfferings(offerings);
      setCurrentOffering(offerings.current);
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
    }
  };

  const handleCustomerInfoUpdate = async (customerInfo: CustomerInfo) => {
    const subscription = parseCustomerInfo(customerInfo);
    setUserSubscription(subscription);
    await saveSubscriptionToStorage(subscription);

    if (user?.id) {
      await upsertSubscriptionToDatabase(user.id, subscription);
    }
  };

  const parseCustomerInfo = (customerInfo: CustomerInfo): UserSubscription => {
    // Determine plan based on active entitlements
    let plan: SubscriptionPlan = 'free';
    let isActive = false;

    if (
      customerInfo.entitlements.active[
        REVENUECAT_CONFIG.entitlements.enterprise
      ]
    ) {
      plan = 'enterprise';
      isActive = true;
    } else if (
      customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.pro]
    ) {
      plan = 'pro';
      isActive = true;
    } else if (
      customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlements.basic]
    ) {
      plan = 'basic';
      isActive = true;
    }

    const activeEntitlement = Object.values(
      customerInfo.entitlements.active
    )[0];
    const expiresAt = activeEntitlement?.expirationDate
      ? new Date(activeEntitlement.expirationDate)
      : undefined;

    return {
      ...userSubscription,
      plan,
      status: isActive ? 'active' : 'expired',
      isActive,
      expiresAt,
      willRenew: activeEntitlement?.willRenew ?? false,
      revenueCatInfo: {
        customerId: customerInfo.originalAppUserId,
        entitlements: Object.keys(customerInfo.entitlements.active),
        originalAppUserId: customerInfo.originalAppUserId,
        latestExpirationDate: customerInfo.latestExpirationDate || undefined,
        productIdentifier: activeEntitlement?.productIdentifier,
        periodType: activeEntitlement?.periodType,
        isSandbox: (customerInfo as any).requestDate ? false : true,
        platform: Platform.OS as 'ios' | 'android',
      },
    };
  };

  const loadSubscriptionFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem('userSubscription');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserSubscription(parsed);
      }
    } catch (error) {
      console.error('Failed to load subscription from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscriptionToStorage = async (subscription: UserSubscription) => {
    try {
      await AsyncStorage.setItem(
        'userSubscription',
        JSON.stringify(subscription)
      );
    } catch (error) {
      console.error('Failed to save subscription to storage:', error);
    }
  };

  const loadSubscriptionFromDatabase = async (userId: string) => {
    try {
      const { data: subscriptionData, error: subscriptionError } =
        await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

      if (subscriptionError) throw subscriptionError;

      // Get actual usage counts
      const usage = await fetchUsageFromDatabase(userId);

      if (subscriptionData) {
        const subscription: UserSubscription = {
          plan: subscriptionData.plan as SubscriptionPlan,
          status: subscriptionData.status || 'active',
          isActive: subscriptionData.is_active,
          billingPeriod: subscriptionData.billing_period,
          expiresAt: subscriptionData.expires_at
            ? new Date(subscriptionData.expires_at)
            : undefined,
          trialEndsAt: subscriptionData.trial_ends_at
            ? new Date(subscriptionData.trial_ends_at)
            : undefined,
          cancelledAt: subscriptionData.cancelled_at
            ? new Date(subscriptionData.cancelled_at)
            : undefined,
          willRenew: subscriptionData.will_renew ?? false,
          currentUsage: usage,
          revenueCatInfo: subscriptionData.rc_entitlement
            ? {
                customerId: subscriptionData.rc_original_app_user_id,
                entitlements: [subscriptionData.rc_entitlement],
                originalAppUserId: subscriptionData.rc_original_app_user_id,
                latestExpirationDate: subscriptionData.rc_latest_expiration_at,
                productIdentifier: subscriptionData.rc_product_identifier,
                periodType: subscriptionData.rc_period_type,
                isSandbox: subscriptionData.rc_is_sandbox,
                platform: subscriptionData.rc_platform,
              }
            : undefined,
        };

        setUserSubscription(subscription);
        await saveSubscriptionToStorage(subscription);
      } else {
        const defaultWithUsage = {
          ...DEFAULT_SUBSCRIPTION,
          currentUsage: usage,
        };
        setUserSubscription(defaultWithUsage);
        await saveSubscriptionToStorage(defaultWithUsage);
      }
    } catch (error) {
      console.error('Failed to load subscription from database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsageFromDatabase = async (userId: string) => {
    const [
      leadsResult,
      clientsResult,
      tasksResult,
      emailsResult,
      templatesResult,
      rulesResult,
    ] = await Promise.all([
      supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('email_communications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('email_templates')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('automation_rules')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
    ]);

    return {
      leads: leadsResult.count || 0,
      clients: clientsResult.count || 0,
      tasks: tasksResult.count || 0,
      emailsSent: emailsResult.count || 0,
      teamMembers: 1, // TODO: Implement team members count
      automationRules: rulesResult.count || 0,
      emailTemplates: templatesResult.count || 0,
      storageUsedMB: 0, // TODO: Implement storage calculation
    };
  };

  const upsertSubscriptionToDatabase = async (
    userId: string,
    subscription: UserSubscription
  ) => {
    try {
      const payload: any = {
        user_id: userId,
        plan: subscription.plan,
        status: subscription.status,
        is_active: subscription.isActive,
        billing_period: subscription.billingPeriod,
        expires_at: subscription.expiresAt?.toISOString(),
        trial_ends_at: subscription.trialEndsAt?.toISOString(),
        cancelled_at: subscription.cancelledAt?.toISOString(),
        will_renew: subscription.willRenew,
      };

      if (subscription.revenueCatInfo) {
        payload.rc_entitlement = subscription.revenueCatInfo.entitlements[0];
        payload.rc_original_app_user_id =
          subscription.revenueCatInfo.originalAppUserId;
        payload.rc_latest_expiration_at =
          subscription.revenueCatInfo.latestExpirationDate;
        payload.rc_platform = subscription.revenueCatInfo.platform;
        payload.rc_product_identifier =
          subscription.revenueCatInfo.productIdentifier;
        payload.rc_period_type = subscription.revenueCatInfo.periodType;
        payload.rc_is_sandbox = subscription.revenueCatInfo.isSandbox;
      }

      const { error } = await supabase
        .from('subscriptions')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to upsert subscription to database:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const subscription = parseCustomerInfo(customerInfo);
      setUserSubscription(subscription);
      await saveSubscriptionToStorage(subscription);

      if (user?.id) {
        await upsertSubscriptionToDatabase(user?.id, subscription);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const subscription = parseCustomerInfo(customerInfo);

      setUserSubscription(subscription);
      await saveSubscriptionToStorage(subscription);

      if (user?.id) {
        await upsertSubscriptionToDatabase(user.id, subscription);
      }

      return subscription.isActive;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Failed to purchase package:', error);
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const subscription = parseCustomerInfo(customerInfo);

      setUserSubscription(subscription);
      await saveSubscriptionToStorage(subscription);

      if (user?.id) {
        await upsertSubscriptionToDatabase(user.id, subscription);
      }

      return subscription.isActive;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return false;
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      // Note: Actual cancellation happens through App Store/Play Store
      // This just marks it in our database
      const updatedSubscription = {
        ...userSubscription,
        cancelledAt: new Date(),
        willRenew: false,
      };

      setUserSubscription(updatedSubscription);
      await saveSubscriptionToStorage(updatedSubscription);

      if (user?.id) {
        await upsertSubscriptionToDatabase(user.id, updatedSubscription);
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  };

  const changePlan = async (
    newPlan: SubscriptionPlan,
    billingPeriod: BillingPeriod
  ): Promise<boolean> => {
    try {
      // Find the appropriate package
      const productId =
        billingPeriod === 'yearly'
          ? REVENUECAT_CONFIG.products[
              `${newPlan}Yearly` as keyof typeof REVENUECAT_CONFIG.products
            ]
          : REVENUECAT_CONFIG.products[
              `${newPlan}Monthly` as keyof typeof REVENUECAT_CONFIG.products
            ];

      const pkg = offerings?.current?.availablePackages.find(
        (p) => p.product.identifier === productId
      );

      if (!pkg) {
        throw new Error('Package not found');
      }

      return await purchasePackage(pkg);
    } catch (error) {
      console.error('Failed to change plan:', error);
      return false;
    }
  };

  // Feature Access Checks
  const getCurrentLimits = () => getLimitsByPlan(userSubscription.plan);

  const canCreateLead = (): boolean => {
    const limits = getCurrentLimits();
    return isWithinLimit(userSubscription.currentUsage.leads, limits.maxLeads);
  };

  const canCreateClient = (): boolean => {
    const limits = getCurrentLimits();
    return isWithinLimit(
      userSubscription.currentUsage.clients,
      limits.maxClients
    );
  };

  const canCreateTask = (clientId?: string): boolean => {
    const limits = getCurrentLimits();
    return isWithinLimit(
      userSubscription.currentUsage.tasks,
      limits.maxTasksPerClient
    );
  };

  const canSendEmail = (type: 'client' | 'lead', id: string): boolean => {
    const limits = getCurrentLimits();
    const maxEmails =
      type === 'client' ? limits.maxEmailsPerClient : limits.maxEmailsPerLead;
    return isWithinLimit(userSubscription.currentUsage.emailsSent, maxEmails);
  };

  const canAccessMeetings = (): boolean => getCurrentLimits().meetingsEnabled;
  const canAccessAnalytics = (): boolean => getCurrentLimits().analyticsEnabled;
  const canAccessAI = (): boolean => getCurrentLimits().aiSuggestionsEnabled;
  const canAccessAutomation = (): boolean => {
    const limits = getCurrentLimits();
    return isWithinLimit(
      userSubscription.currentUsage.automationRules,
      limits.maxAutomationRules
    );
  };
  const canAddTeamMember = (): boolean => {
    const limits = getCurrentLimits();
    return isWithinLimit(
      userSubscription.currentUsage.teamMembers,
      limits.maxTeamMembers
    );
  };
  const canAccessAPI = (): boolean => getCurrentLimits().apiAccessEnabled;
  const canAccessCustomBranding = (): boolean =>
    getCurrentLimits().customBrandingEnabled;
  const canAccessAdvancedReports = (): boolean =>
    getCurrentLimits().advancedReportsEnabled;
  const canPerformBulkOperations = (): boolean =>
    getCurrentLimits().bulkOperationsEnabled;
  const canUseCustomFields = (): boolean =>
    getCurrentLimits().customFieldsEnabled;
  const canUseWebhooks = (): boolean => getCurrentLimits().webhooksEnabled;

  // Usage Management
  const incrementUsage = async (
    type: keyof UserSubscription['currentUsage']
  ) => {
    const newSubscription = {
      ...userSubscription,
      currentUsage: {
        ...userSubscription.currentUsage,
        [type]: userSubscription.currentUsage[type] + 1,
      },
    };
    setUserSubscription(newSubscription);
    await saveSubscriptionToStorage(newSubscription);
  };

  const decrementUsage = async (
    type: keyof UserSubscription['currentUsage']
  ) => {
    const newSubscription = {
      ...userSubscription,
      currentUsage: {
        ...userSubscription.currentUsage,
        [type]: Math.max(0, userSubscription.currentUsage[type] - 1),
      },
    };
    setUserSubscription(newSubscription);
    await saveSubscriptionToStorage(newSubscription);
  };

  const syncUsageWithDatabase = async () => {
    if (!user?.id) return;

    try {
      const usage = await fetchUsageFromDatabase(user.id);
      const syncedSubscription = {
        ...userSubscription,
        currentUsage: usage,
      };
      setUserSubscription(syncedSubscription);
      await saveSubscriptionToStorage(syncedSubscription);
    } catch (error) {
      console.error('Failed to sync usage with database:', error);
    }
  };

  const trackUsageEvent = async (event: SubscriptionUsageEvent) => {
    if (!user?.id) return;

    try {
      await supabase.from('subscription_usage_events').insert({
        user_id: user.id,
        event_type: event.eventType,
        metadata: event.metadata,
        created_at: event.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Failed to track usage event:', error);
    }
  };

  // Utility Functions
  const getFeatureLimit = (feature: string): number => {
    const limits = getCurrentLimits();
    return (limits as any)[feature] || 0;
  };

  const getFeatureLimitMessageWrapper = (feature: string): string => {
    const limits = getCurrentLimits();
    const usage = (userSubscription.currentUsage as any)[feature] || 0;
    const limit =
      (limits as any)[
        `max${feature.charAt(0).toUpperCase() + feature.slice(1)}`
      ] || 0;
    return getFeatureLimitMessage(feature, usage, limit);
  };

  const isInTrial = (): boolean => isInTrialPeriod(userSubscription);
  const getTrialDaysLeft = (): number =>
    getTrialDaysRemaining(userSubscription);

  const refreshAnalytics = () => {
    const newAnalytics = getSubscriptionAnalytics(userSubscription);
    setAnalytics(newAnalytics);
  };

  const value: SubscriptionContextType = {
    userSubscription,
    isLoading,
    offerings,
    currentOffering,
    analytics,
    checkSubscriptionStatus,
    purchasePackage,
    restorePurchases,
    cancelSubscription,
    changePlan,
    canCreateLead,
    canCreateClient,
    canCreateTask,
    canSendEmail,
    canAccessMeetings,
    canAccessAnalytics,
    canAccessAI,
    canAccessAutomation,
    canAddTeamMember,
    canAccessAPI,
    canAccessCustomBranding,
    canAccessAdvancedReports,
    canPerformBulkOperations,
    canUseCustomFields,
    canUseWebhooks,
    incrementUsage,
    decrementUsage,
    syncUsageWithDatabase,
    trackUsageEvent,
    getFeatureLimit,
    getFeatureLimitMessage: getFeatureLimitMessageWrapper,
    isInTrial,
    getTrialDaysLeft,
    refreshAnalytics,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider'
    );
  }
  return context;
};
