import {
  SubscriptionTier,
  SubscriptionLimits,
  SubscriptionFeature,
} from '@/types/subscription';

// Subscription Limits Configuration
export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  free: {
    maxLeads: 5,
    maxClients: 3,
    maxTasksPerClient: 5,
    maxEmailsPerClient: 10,
    maxEmailsPerLead: 5,
    maxTeamMembers: 1,
    maxAutomationRules: 0,
    maxEmailTemplates: 2,
    meetingsEnabled: false,
    analyticsEnabled: false,
    aiSuggestionsEnabled: false,
    customBrandingEnabled: false,
    prioritySupportEnabled: false,
    apiAccessEnabled: false,
    advancedReportsEnabled: false,
    bulkOperationsEnabled: false,
    customFieldsEnabled: false,
    webhooksEnabled: false,
  },
  pro: {
    maxLeads: -1,
    maxClients: -1,
    maxTasksPerClient: -1, // unlimited
    maxEmailsPerClient: -1,
    maxEmailsPerLead: -1,
    maxTeamMembers: -1,
    maxAutomationRules: 25,
    maxEmailTemplates: 50,
    meetingsEnabled: true,
    analyticsEnabled: true,
    aiSuggestionsEnabled: true,
    customBrandingEnabled: true,
    prioritySupportEnabled: true,
    apiAccessEnabled: true,
    advancedReportsEnabled: true,
    bulkOperationsEnabled: true,
    customFieldsEnabled: true,
    webhooksEnabled: true,
  },
};

// Subscription Tiers Configuration
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    plan: 'free',
    name: 'Free',
    displayName: 'Free Plan',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    limits: SUBSCRIPTION_LIMITS.free,
    features: [
      '5 Leads',
      '3 Clients',
      '5 Tasks per Client',
      '10 Emails per Client',
      'Basic CRM Features',
    ],
    trialDays: 0,
  },
  {
    plan: 'pro',
    name: 'Pro',
    displayName: 'Pro Plan',
    description: 'For growing businesses',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    currency: 'USD',
    limits: SUBSCRIPTION_LIMITS.pro,
    features: [
      'Unlimited Leads',
      'Unlimited Clients',
      'Unlimited Tasks',
      'Unlimited Emails',
      'Advanced Meeting Management',
      'Advanced Analytics & Reports',
      'AI-Powered Suggestions',
      'Automation Rules',
      'Bulk Operations',
    ],
    popular: true,
    trialDays: 14,
  },
];

// Feature Catalog
export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  {
    id: 'leads_management',
    name: 'Lead Management',
    description: 'Track and manage your sales leads',
    category: 'core',
    availableIn: ['free', 'pro'],
  },
  {
    id: 'client_management',
    name: 'Client Management',
    description: 'Comprehensive client relationship management',
    category: 'core',
    availableIn: ['free', 'pro'],
  },
  {
    id: 'task_management',
    name: 'Task Management',
    description: 'Organize and track tasks',
    category: 'core',
    availableIn: ['free', 'pro'],
  },
  {
    id: 'email_communication',
    name: 'Email Communication',
    description: 'Send and track emails',
    category: 'communication',
    availableIn: ['free', 'pro'],
  },
  {
    id: 'meeting_management',
    name: 'Meeting Management',
    description: 'Schedule and manage meetings',
    category: 'core',
    availableIn: ['pro'],
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Track performance metrics',
    category: 'analytics',
    availableIn: ['pro'],
  },
  {
    id: 'ai_suggestions',
    name: 'AI-Powered Suggestions',
    description: 'Get intelligent recommendations',
    category: 'advanced',
    availableIn: ['pro'],
  },
  {
    id: 'automation_rules',
    name: 'Automation Rules',
    description: 'Automate repetitive tasks',
    category: 'automation',
    availableIn: ['pro'],
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Work together with your team',
    category: 'collaboration',
    availableIn: ['free', 'pro'],
  },
  {
    id: 'advanced_reports',
    name: 'Advanced Reports',
    description: 'Detailed analytics and insights',
    category: 'analytics',
    availableIn: ['pro'],
  },
  {
    id: 'bulk_operations',
    name: 'Bulk Operations',
    description: 'Perform actions on multiple items',
    category: 'advanced',
    availableIn: ['pro'],
  },
];

// RevenueCat Configuration
export const REVENUECAT_CONFIG = {
  // Replace with your actual RevenueCat API keys
  apiKeys: {
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'YOUR_IOS_KEY',
    android:
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'YOUR_ANDROID_KEY',
  },
  // Entitlement identifiers (must match RevenueCat dashboard)
  entitlements: {
    basic: 'basic',
    pro: 'pro',
    enterprise: 'enterprise',
  },
  // Product identifiers (must match App Store Connect / Google Play Console)
  products: {
    proMonthly: 'pro_monthly',
  },
};

// Helper Functions
export const getTierByPlan = (plan: string): SubscriptionTier | undefined => {
  return SUBSCRIPTION_TIERS.find((tier) => tier.plan === plan);
};

export const getLimitsByPlan = (plan: string): SubscriptionLimits => {
  return SUBSCRIPTION_LIMITS[plan] || SUBSCRIPTION_LIMITS.free;
};

export const isFeatureAvailable = (
  featureId: string,
  plan: string
): boolean => {
  const feature = SUBSCRIPTION_FEATURES.find((f) => f.id === featureId);
  return feature ? feature.availableIn.includes(plan as any) : false;
};

export const getYearlySavings = (tier: SubscriptionTier): number => {
  const monthlyTotal = tier.monthlyPrice * 12;
  return monthlyTotal - tier.yearlyPrice;
};

export const getYearlySavingsPercentage = (tier: SubscriptionTier): number => {
  const monthlyTotal = tier.monthlyPrice * 12;
  if (monthlyTotal === 0) return 0;
  return Math.round(((monthlyTotal - tier.yearlyPrice) / monthlyTotal) * 100);
};
