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
    maxStorageGB: 0.5,
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
  basic: {
    maxLeads: 50,
    maxClients: 25,
    maxTasksPerClient: 20,
    maxEmailsPerClient: 50,
    maxEmailsPerLead: 25,
    maxTeamMembers: 3,
    maxAutomationRules: 5,
    maxEmailTemplates: 10,
    maxStorageGB: 5,
    meetingsEnabled: true,
    analyticsEnabled: true,
    aiSuggestionsEnabled: true,
    customBrandingEnabled: false,
    prioritySupportEnabled: false,
    apiAccessEnabled: false,
    advancedReportsEnabled: false,
    bulkOperationsEnabled: false,
    customFieldsEnabled: true,
    webhooksEnabled: false,
  },
  pro: {
    maxLeads: 500,
    maxClients: 250,
    maxTasksPerClient: -1, // unlimited
    maxEmailsPerClient: -1,
    maxEmailsPerLead: -1,
    maxTeamMembers: 10,
    maxAutomationRules: 25,
    maxEmailTemplates: 50,
    maxStorageGB: 50,
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
  enterprise: {
    maxLeads: -1, // unlimited
    maxClients: -1,
    maxTasksPerClient: -1,
    maxEmailsPerClient: -1,
    maxEmailsPerLead: -1,
    maxTeamMembers: -1,
    maxAutomationRules: -1,
    maxEmailTemplates: -1,
    maxStorageGB: 500,
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
      '500MB Storage',
    ],
    trialDays: 0,
  },
  {
    plan: 'basic',
    name: 'Basic',
    displayName: 'Basic Plan',
    description: 'Great for small teams',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    currency: 'USD',
    limits: SUBSCRIPTION_LIMITS.basic,
    features: [
      '50 Leads',
      '25 Clients',
      '20 Tasks per Client',
      '50 Emails per Client',
      'Meeting Management',
      'Basic Analytics',
      'AI Suggestions',
      '5 Automation Rules',
      'Up to 3 Team Members',
      '5GB Storage',
    ],
    trialDays: 14,
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
      '500 Leads',
      '250 Clients',
      'Unlimited Tasks',
      'Unlimited Emails',
      'Advanced Meeting Management',
      'Advanced Analytics & Reports',
      'AI-Powered Suggestions',
      '25 Automation Rules',
      'Custom Branding',
      'Priority Support',
      'API Access',
      'Bulk Operations',
      'Up to 10 Team Members',
      '50GB Storage',
    ],
    popular: true,
    trialDays: 14,
  },
  {
    plan: 'enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise Plan',
    description: 'For large organizations',
    monthlyPrice: 99.99,
    yearlyPrice: 999.99,
    currency: 'USD',
    limits: SUBSCRIPTION_LIMITS.enterprise,
    features: [
      'Unlimited Everything',
      'Dedicated Account Manager',
      'Custom Integrations',
      'Advanced Security',
      'SLA Guarantee',
      'Custom Training',
      'White-label Options',
      'Unlimited Team Members',
      '500GB Storage',
      'Webhooks',
    ],
    trialDays: 30,
  },
];

// Feature Catalog
export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  {
    id: 'leads_management',
    name: 'Lead Management',
    description: 'Track and manage your sales leads',
    category: 'core',
    availableIn: ['free', 'basic', 'pro', 'enterprise'],
  },
  {
    id: 'client_management',
    name: 'Client Management',
    description: 'Comprehensive client relationship management',
    category: 'core',
    availableIn: ['free', 'basic', 'pro', 'enterprise'],
  },
  {
    id: 'task_management',
    name: 'Task Management',
    description: 'Organize and track tasks',
    category: 'core',
    availableIn: ['free', 'basic', 'pro', 'enterprise'],
  },
  {
    id: 'email_communication',
    name: 'Email Communication',
    description: 'Send and track emails',
    category: 'communication',
    availableIn: ['free', 'basic', 'pro', 'enterprise'],
  },
  {
    id: 'meeting_management',
    name: 'Meeting Management',
    description: 'Schedule and manage meetings',
    category: 'core',
    availableIn: ['basic', 'pro', 'enterprise'],
  },
  {
    id: 'analytics',
    name: 'Analytics Dashboard',
    description: 'Track performance metrics',
    category: 'analytics',
    availableIn: ['basic', 'pro', 'enterprise'],
  },
  {
    id: 'ai_suggestions',
    name: 'AI-Powered Suggestions',
    description: 'Get intelligent recommendations',
    category: 'advanced',
    availableIn: ['basic', 'pro', 'enterprise'],
  },
  {
    id: 'automation_rules',
    name: 'Automation Rules',
    description: 'Automate repetitive tasks',
    category: 'automation',
    availableIn: ['basic', 'pro', 'enterprise'],
  },
  {
    id: 'team_collaboration',
    name: 'Team Collaboration',
    description: 'Work together with your team',
    category: 'collaboration',
    availableIn: ['basic', 'pro', 'enterprise'],
  },
  {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'Customize with your brand',
    category: 'advanced',
    availableIn: ['pro', 'enterprise'],
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: '24/7 priority customer support',
    category: 'advanced',
    availableIn: ['pro', 'enterprise'],
  },
  {
    id: 'api_access',
    name: 'API Access',
    description: 'Integrate with external systems',
    category: 'advanced',
    availableIn: ['pro', 'enterprise'],
  },
  {
    id: 'advanced_reports',
    name: 'Advanced Reports',
    description: 'Detailed analytics and insights',
    category: 'analytics',
    availableIn: ['pro', 'enterprise'],
  },
  {
    id: 'bulk_operations',
    name: 'Bulk Operations',
    description: 'Perform actions on multiple items',
    category: 'advanced',
    availableIn: ['pro', 'enterprise'],
  },
  {
    id: 'custom_fields',
    name: 'Custom Fields',
    description: 'Add custom data fields',
    category: 'advanced',
    availableIn: ['basic', 'pro', 'enterprise'],
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Real-time event notifications',
    category: 'advanced',
    availableIn: ['pro', 'enterprise'],
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
    basicMonthly: 'nexasuit_basic_monthly',
    basicYearly: 'nexasuit_basic_yearly',
    proMonthly: 'nexasuit_pro_monthly',
    proYearly: 'nexasuit_pro_yearly',
    enterpriseMonthly: 'nexasuit_enterprise_monthly',
    enterpriseYearly: 'nexasuit_enterprise_yearly',
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
