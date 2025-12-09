export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
export type BillingPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus =
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'trial'
  | 'grace_period';

export interface SubscriptionLimits {
  maxLeads: number;
  maxClients: number;
  maxTasksPerClient: number;
  maxEmailsPerClient: number;
  maxEmailsPerLead: number;
  maxTeamMembers: number;
  maxAutomationRules: number;
  maxEmailTemplates: number;
  maxStorageGB: number;
  meetingsEnabled: boolean;
  analyticsEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  customBrandingEnabled: boolean;
  prioritySupportEnabled: boolean;
  apiAccessEnabled: boolean;
  advancedReportsEnabled: boolean;
  bulkOperationsEnabled: boolean;
  customFieldsEnabled: boolean;
  webhooksEnabled: boolean;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  category:
    | 'core'
    | 'communication'
    | 'automation'
    | 'analytics'
    | 'collaboration'
    | 'advanced';
  availableIn: SubscriptionPlan[];
}

export interface SubscriptionTier {
  plan: SubscriptionPlan;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  limits: SubscriptionLimits;
  features: string[];
  popular?: boolean;
  trialDays?: number;
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isActive: boolean;
  billingPeriod?: BillingPeriod;
  expiresAt?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  willRenew: boolean;
  currentUsage: {
    leads: number;
    clients: number;
    tasks: number;
    emailsSent: number;
    teamMembers: number;
    automationRules: number;
    emailTemplates: number;
    storageUsedMB: number;
  };
  revenueCatInfo?: {
    customerId: string;
    entitlements: string[];
    originalAppUserId: string;
    latestExpirationDate?: string;
    productIdentifier?: string;
    periodType?: string;
    isSandbox: boolean;
    platform?: 'ios' | 'android' | 'web';
  };
}

export interface SubscriptionProduct {
  id: string;
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currency: string;
  period: 'month' | 'year';
  introPrice?: {
    price: number;
    priceString: string;
    period: string;
    cycles: number;
  };
}

export interface SubscriptionUsageEvent {
  userId: string;
  eventType:
    | 'lead_created'
    | 'client_created'
    | 'task_created'
    | 'email_sent'
    | 'storage_used';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionAnalytics {
  plan: SubscriptionPlan;
  usagePercentage: {
    leads: number;
    clients: number;
    tasks: number;
    emails: number;
    storage: number;
  };
  daysUntilRenewal?: number;
  recommendedUpgrade?: SubscriptionPlan;
}
