import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SubscriptionPlan,
  UserSubscription,
  SubscriptionLimits,
} from '../types/subscription';

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

  useEffect(() => {
    initializeRevenueCat();
    loadSubscriptionFromStorage();
  }, []);

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
