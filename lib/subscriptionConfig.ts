import {
  SubscriptionTier,
  SubscriptionLimits,
  SubscriptionFeature,
} from '@/types/subscription';

// Subscription Limits Configuration
export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  free: {
    maxLeads: 5,
    maxProjects: 2,
    maxClients: 5,
    maxTasksPerProjects: 5,
    maxEmails: 10,
    maxTeamMembers: 1,
    maxEmailTemplates: 2,
    meetingsEnabled: false,
    analyticsEnabled: false,
    aiSuggestionsEnabled: false,
    bulkOperationsEnabled: false,
  },
  pro: {
    maxLeads: -1,
    maxClients: -1,
    maxProjects: -1, // unlimited
    maxTasksPerProjects: -1, // unlimited
    maxEmails: -1,
    maxTeamMembers: -1,
    maxEmailTemplates: 50,
    meetingsEnabled: true,
    analyticsEnabled: true,
    aiSuggestionsEnabled: true,
    bulkOperationsEnabled: true,
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
      '5 Clients',
      '2 Projects',
      '5 Tasks per Project',
      '10 Emails',
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
      'Unlimited Projects',
      'Unlimited Tasks',
      'Unlimited Emails',
      'Advanced Meeting Management',
      'Advanced Analytics & Reports',
      'AI-Powered Suggestions',
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
    id: 'project_management',
    name: 'Project Management',
    description: 'Organize Projects and track tasks',
    category: 'core',
    availableIn: ['free', 'pro'],
  },
  {
    id: 'email_communication',
    name: 'Email Communication',
    description: 'Send, receive and track emails',
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
    pro: 'pro',
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
