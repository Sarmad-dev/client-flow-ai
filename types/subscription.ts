export type SubscriptionPlan = 'free' | 'pro';

export interface SubscriptionLimits {
  maxLeads: number;
  maxClients: number;
  maxTasksPerClient: number;
  maxEmailsPerClient: number;
  maxEmailsPerLead: number;
  meetingsEnabled: boolean;
  analyticsEnabled: boolean;
}

export interface SubscriptionTier {
  plan: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  limits: SubscriptionLimits;
  features: string[];
}

export interface UserSubscription {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: Date;
  currentUsage: {
    leads: number;
    clients: number;
    emailsSent: number;
  };
}

export interface SubscriptionProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  period: 'month' | 'year';
}
