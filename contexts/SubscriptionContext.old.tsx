import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserSubscription, SubscriptionLimits } from '../types/subscription';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionContextType {
  userSubscription: UserSubscription;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  checkSubscriptionStatus: () => Promise<void>;
  purchaseSubscription: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  canCreateLead: () => boolean;
  canCreateClient: () => boolean;
  canCreateTask: (clientId: string) => boolean;
  canSendEmail: (type: 'client' | 'lead', id: string) => boolean;
  canAccessMeetings: () => boolean;
  canAccessAnalytics: () => boolean;
  incrementUsage: (type: 'leads' | 'clients' | 'emailsSent') => Promise<void>;
  syncUsageWithDatabase: (userId: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

const FREE_LIMITS: SubscriptionLimits = {
  maxLeads: 3,
  maxClients: 3,
  maxTasksPerClient: 3,
  maxEmailsPerClient: 5,
  maxEmailsPerLead: 5,
  meetingsEnabled: false,
  analyticsEnabled: false,
};

const PRO_LIMITS: SubscriptionLimits = {
  maxLeads: -1, // unlimited
  maxClients: -1, // unlimited
  maxTasksPerClient: -1, // unlimited
  maxEmailsPerClient: -1, // unlimited
  maxEmailsPerLead: -1, // unlimited
  meetingsEnabled: true,
  analyticsEnabled: true,
};

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  plan: 'free',
  isActive: true,
  currentUsage: {
    leads: 0,
    clients: 0,
    emailsSent: 0,
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
  const { user } = useAuth();

  useEffect(() => {
    initializeRevenueCat();
    // Prefer loading from Supabase if logged in
    (async () => {
      if (user?.id) {
        await loadSubscriptionFromDatabase(user.id);
      } else {
        await loadSubscriptionFromStorage();
      }
    })();
  }, []);

  useEffect(() => {
    // When auth user changes, refresh subscription state from DB
    (async () => {
      if (user?.id) {
        await loadSubscriptionFromDatabase(user.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const initializeRevenueCat = async () => {
    try {
      // Replace with your RevenueCat API key
      await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
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
      const [subscriptionResult, leadsResult, clientsResult, emailsResult] =
        await Promise.all([
          supabase
            .from('subscriptions')
            .select('plan, is_active')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase
            .from('leads')
            .select('id', { count: 'exact' })
            .eq('user_id', userId),
          supabase
            .from('clients')
            .select('id', { count: 'exact' })
            .eq('user_id', userId),
          supabase
            .from('email_communications')
            .select('id', { count: 'exact' })
            .eq('user_id', userId),
        ]);

      const { data: subscriptionData, error: subscriptionError } =
        subscriptionResult;
      const { count: leadsCount } = leadsResult;
      const { count: clientsCount } = clientsResult;
      const { count: emailsCount } = emailsResult;

      if (subscriptionError) throw subscriptionError;

      const actualUsage = {
        leads: leadsCount || 0,
        clients: clientsCount || 0,
        emailsSent: emailsCount || 0, // You might want to count emails from a separate table
      };

      if (subscriptionData) {
        const fromDb: UserSubscription = {
          plan: subscriptionData.plan === 'pro' ? 'pro' : 'free',
          isActive: !!subscriptionData.is_active,
          currentUsage: actualUsage,
        };

        setUserSubscription(fromDb);
        await saveSubscriptionToStorage(fromDb);
      } else {
        // No subscription record found, use default with actual usage
        const defaultWithUsage: UserSubscription = {
          ...DEFAULT_SUBSCRIPTION,
          currentUsage: actualUsage,
        };
        setUserSubscription(defaultWithUsage);
        await saveSubscriptionToStorage(defaultWithUsage);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load subscription from database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const upsertSubscriptionToDatabase = async (
    userId: string,
    params: {
      plan: 'free' | 'pro';
      isActive: boolean;
      rc?: {
        entitlement?: string;
        originalAppUserId?: string | null;
        latestExpirationAt?: string | null;
        platform?: 'ios' | 'android' | 'web' | null;
        productIdentifier?: string | null;
        periodType?: string | null;
        isSandbox?: boolean | null;
      };
    }
  ) => {
    try {
      const payload: any = {
        user_id: userId,
        plan: params.plan,
        is_active: params.isActive,
      };
      if (params.rc) {
        payload.rc_entitlement = params.rc.entitlement ?? null;
        payload.rc_original_app_user_id = params.rc.originalAppUserId ?? null;
        payload.rc_latest_expiration_at = params.rc.latestExpirationAt
          ? new Date(params.rc.latestExpirationAt).toISOString()
          : null;
        payload.rc_platform = params.rc.platform ?? null;
        payload.rc_product_identifier = params.rc.productIdentifier ?? null;
        payload.rc_period_type = params.rc.periodType ?? null;
        payload.rc_is_sandbox = params.rc.isSandbox ?? null;
      }
      const { error } = await supabase
        .from('subscriptions')
        .upsert(payload, { onConflict: 'user_id' })
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to upsert subscription to database:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;

      const newSubscription: UserSubscription = {
        ...userSubscription,
        plan: isPro ? 'pro' : 'free',
        isActive: isPro,
      };

      setUserSubscription(newSubscription);
      await saveSubscriptionToStorage(newSubscription);
      if (user?.id) {
        await upsertSubscriptionToDatabase(user.id, {
          plan: newSubscription.plan,
          isActive: newSubscription.isActive,
          rc: {
            entitlement: isPro ? 'pro' : undefined,
            originalAppUserId: customerInfo.originalAppUserId ?? null,
            latestExpirationAt: customerInfo.latestExpirationDate
              ? new Date(customerInfo.latestExpirationDate).toISOString()
              : null,
            productIdentifier:
              (customerInfo as any)?.activeSubscriptions?.[0] ?? null,
            periodType: (customerInfo as any)?.entitlements?.all?.pro
              ?.latestPurchaseDate
              ? 'normal'
              : null,
            isSandbox:
              (customerInfo as any)?.nonSubscriptionTransactions?.some?.(
                () => false
              ) ?? null,
            platform: null,
          },
        });
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const purchaseSubscription = async (packageId: string): Promise<boolean> => {
    try {
      const pkg: PurchasesPackage | undefined =
        offerings?.current?.availablePackages.find(
          (p: PurchasesPackage) => p.identifier === packageId
        );
      if (!pkg) {
        throw new Error('Package not found');
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;

      if (isPro) {
        const newSubscription: UserSubscription = {
          ...userSubscription,
          plan: 'pro',
          isActive: true,
        };
        setUserSubscription(newSubscription);
        await saveSubscriptionToStorage(newSubscription);
        if (user?.id) {
          await upsertSubscriptionToDatabase(user.id, {
            plan: 'pro',
            isActive: true,
            rc: {
              entitlement: 'pro',
              originalAppUserId:
                (await Purchases.getAppUserID()) as unknown as string,
              latestExpirationAt: null,
              platform: null,
              productIdentifier: pkg.product.identifier,
              periodType: (pkg as any)?.packageType ?? null,
              isSandbox: null,
            },
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to purchase subscription:', error);
      return false;
    }
  };

  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;

      const newSubscription: UserSubscription = {
        ...userSubscription,
        plan: isPro ? 'pro' : 'free',
        isActive: isPro,
      };

      setUserSubscription(newSubscription);
      await saveSubscriptionToStorage(newSubscription);
      if (user?.id) {
        await upsertSubscriptionToDatabase(user.id, {
          plan: newSubscription.plan,
          isActive: newSubscription.isActive,
          rc: {
            entitlement: isPro ? 'pro' : undefined,
            originalAppUserId: customerInfo.originalAppUserId ?? null,
            latestExpirationAt: customerInfo.latestExpirationDate
              ? new Date(customerInfo.latestExpirationDate).toISOString()
              : null,
            productIdentifier:
              (customerInfo as any)?.activeSubscriptions?.[0] ?? null,
            periodType: (customerInfo as any)?.entitlements?.all?.pro
              ?.latestPurchaseDate
              ? 'normal'
              : null,
            isSandbox:
              (customerInfo as any)?.nonSubscriptionTransactions?.some?.(
                () => false
              ) ?? null,
            platform: null,
          },
        });
      }
    } catch (error) {
      console.error('Failed to restore purchases:', error);
    }
  };

  const getCurrentLimits = (): SubscriptionLimits => {
    return userSubscription.plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
  };

  const canCreateLead = (): boolean => {
    const limits = getCurrentLimits();
    return (
      limits.maxLeads === -1 ||
      userSubscription.currentUsage.leads < limits.maxLeads
    );
  };

  const canCreateClient = (): boolean => {
    const limits = getCurrentLimits();
    return (
      limits.maxClients === -1 ||
      userSubscription.currentUsage.clients < limits.maxClients
    );
  };

  const canCreateTask = (clientId: string): boolean => {
    const limits = getCurrentLimits();
    // For simplicity, we'll check global task limit per client
    // In a real app, you'd track tasks per client
    return limits.maxTasksPerClient === -1 || true; // Always allow for now
  };

  const canSendEmail = (type: 'client' | 'lead', id: string): boolean => {
    const limits = getCurrentLimits();
    const maxEmails =
      type === 'client' ? limits.maxEmailsPerClient : limits.maxEmailsPerLead;
    return (
      maxEmails === -1 || userSubscription.currentUsage.emailsSent < maxEmails
    );
  };

  const canAccessMeetings = (): boolean => {
    return getCurrentLimits().meetingsEnabled;
  };

  const canAccessAnalytics = (): boolean => {
    return getCurrentLimits().analyticsEnabled;
  };

  const incrementUsage = async (type: 'leads' | 'clients' | 'emailsSent') => {
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

  const syncUsageWithDatabase = async (userId: string) => {
    try {
      // Count actual records in database
      const [leadsResult, clientsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
      ]);

      const actualUsage = {
        leads: leadsResult.count || 0,
        clients: clientsResult.count || 0,
        emailsSent: userSubscription.currentUsage.emailsSent, // Keep existing email count
      };

      const syncedSubscription = {
        ...userSubscription,
        currentUsage: actualUsage,
      };

      setUserSubscription(syncedSubscription);
      await saveSubscriptionToStorage(syncedSubscription);
    } catch (error) {
      console.error('Failed to sync usage with database:', error);
    }
  };

  const value: SubscriptionContextType = {
    userSubscription,
    isLoading,
    offerings,
    currentOffering,
    checkSubscriptionStatus,
    purchaseSubscription,
    restorePurchases,
    canCreateLead,
    canCreateClient,
    canCreateTask,
    canSendEmail,
    canAccessMeetings,
    canAccessAnalytics,
    incrementUsage,
    syncUsageWithDatabase,
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
