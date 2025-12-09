import {
  UserSubscription,
  SubscriptionAnalytics,
  SubscriptionPlan,
} from '@/types/subscription';
import { getLimitsByPlan, SUBSCRIPTION_TIERS } from './subscriptionConfig';

/**
 * Check if a limit is unlimited (-1)
 */
export const isUnlimited = (limit: number): boolean => limit === -1;

/**
 * Check if usage is within limit
 */
export const isWithinLimit = (usage: number, limit: number): boolean => {
  return isUnlimited(limit) || usage < limit;
};

/**
 * Calculate usage percentage
 */
export const calculateUsagePercentage = (
  usage: number,
  limit: number
): number => {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.min(Math.round((usage / limit) * 100), 100);
};

/**
 * Check if user is approaching limit (>80%)
 */
export const isApproachingLimit = (usage: number, limit: number): boolean => {
  return calculateUsagePercentage(usage, limit) >= 80;
};

/**
 * Check if user has reached limit
 */
export const hasReachedLimit = (usage: number, limit: number): boolean => {
  if (isUnlimited(limit)) return false;
  return usage >= limit;
};

/**
 * Get subscription analytics
 */
export const getSubscriptionAnalytics = (
  subscription: UserSubscription
): SubscriptionAnalytics => {
  const limits = getLimitsByPlan(subscription.plan);
  const { currentUsage } = subscription;

  const usagePercentage = {
    leads: calculateUsagePercentage(currentUsage.leads, limits.maxLeads),
    clients: calculateUsagePercentage(currentUsage.clients, limits.maxClients),
    tasks: calculateUsagePercentage(
      currentUsage.tasks,
      limits.maxTasksPerClient
    ),
    emails: calculateUsagePercentage(
      currentUsage.emailsSent,
      limits.maxEmailsPerClient + limits.maxEmailsPerLead
    ),
    storage: calculateUsagePercentage(
      currentUsage.storageUsedMB / 1024,
      limits.maxStorageGB
    ),
  };

  // Calculate days until renewal
  let daysUntilRenewal: number | undefined;
  if (subscription.expiresAt) {
    const now = new Date();
    const expiresAt = new Date(subscription.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Recommend upgrade if approaching limits
  let recommendedUpgrade: SubscriptionPlan | undefined;
  const highUsage = Object.values(usagePercentage).some((pct) => pct >= 80);

  if (highUsage) {
    const currentTierIndex = SUBSCRIPTION_TIERS.findIndex(
      (t) => t.plan === subscription.plan
    );
    if (currentTierIndex < SUBSCRIPTION_TIERS.length - 1) {
      recommendedUpgrade = SUBSCRIPTION_TIERS[currentTierIndex + 1].plan;
    }
  }

  return {
    plan: subscription.plan,
    usagePercentage,
    daysUntilRenewal,
    recommendedUpgrade,
  };
};

/**
 * Check if subscription is in trial period
 */
export const isInTrialPeriod = (subscription: UserSubscription): boolean => {
  if (!subscription.trialEndsAt) return false;
  return new Date() < new Date(subscription.trialEndsAt);
};

/**
 * Get days remaining in trial
 */
export const getTrialDaysRemaining = (
  subscription: UserSubscription
): number => {
  if (!subscription.trialEndsAt) return 0;
  const now = new Date();
  const trialEnd = new Date(subscription.trialEndsAt);
  const diffTime = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

/**
 * Check if subscription is expired
 */
export const isSubscriptionExpired = (
  subscription: UserSubscription
): boolean => {
  if (!subscription.expiresAt) return false;
  return new Date() > new Date(subscription.expiresAt);
};

/**
 * Check if subscription will renew
 */
export const willSubscriptionRenew = (
  subscription: UserSubscription
): boolean => {
  return (
    subscription.willRenew && subscription.isActive && !subscription.cancelledAt
  );
};

/**
 * Format subscription status for display
 */
export const formatSubscriptionStatus = (
  subscription: UserSubscription
): string => {
  if (isInTrialPeriod(subscription)) {
    const daysLeft = getTrialDaysRemaining(subscription);
    return `Trial (${daysLeft} days left)`;
  }

  if (subscription.cancelledAt && subscription.isActive) {
    return 'Cancelled (Active until expiry)';
  }

  if (isSubscriptionExpired(subscription)) {
    return 'Expired';
  }

  if (subscription.isActive) {
    return 'Active';
  }

  return 'Inactive';
};

/**
 * Get next billing date
 */
export const getNextBillingDate = (
  subscription: UserSubscription
): Date | null => {
  if (!subscription.expiresAt || !subscription.willRenew) return null;
  return new Date(subscription.expiresAt);
};

/**
 * Calculate prorated refund amount
 */
export const calculateProratedRefund = (
  subscription: UserSubscription,
  paidAmount: number
): number => {
  if (!subscription.expiresAt) return 0;

  const now = new Date();
  const expiresAt = new Date(subscription.expiresAt);
  const totalDays = subscription.billingPeriod === 'yearly' ? 365 : 30;

  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (paidAmount / totalDays) * daysRemaining;
};

/**
 * Get upgrade cost (prorated)
 */
export const getUpgradeCost = (
  currentSubscription: UserSubscription,
  newPlan: SubscriptionPlan,
  billingPeriod: 'monthly' | 'yearly'
): number => {
  const currentTier = SUBSCRIPTION_TIERS.find(
    (t) => t.plan === currentSubscription.plan
  );
  const newTier = SUBSCRIPTION_TIERS.find((t) => t.plan === newPlan);

  if (!currentTier || !newTier) return 0;

  const currentPrice =
    billingPeriod === 'yearly'
      ? currentTier.yearlyPrice
      : currentTier.monthlyPrice;
  const newPrice =
    billingPeriod === 'yearly' ? newTier.yearlyPrice : newTier.monthlyPrice;

  // Calculate prorated credit from current subscription
  const proratedCredit = calculateProratedRefund(
    currentSubscription,
    currentPrice
  );

  return Math.max(0, newPrice - proratedCredit);
};

/**
 * Validate feature access
 */
export const canAccessFeature = (
  subscription: UserSubscription,
  featureCheck: (limits: any) => boolean
): boolean => {
  if (!subscription.isActive) return false;
  const limits = getLimitsByPlan(subscription.plan);
  return featureCheck(limits);
};

/**
 * Get feature limit message
 */
export const getFeatureLimitMessage = (
  featureName: string,
  currentUsage: number,
  limit: number
): string => {
  if (isUnlimited(limit)) {
    return `Unlimited ${featureName}`;
  }

  const remaining = Math.max(0, limit - currentUsage);

  if (remaining === 0) {
    return `You've reached your ${featureName} limit (${limit}). Upgrade to add more.`;
  }

  if (isApproachingLimit(currentUsage, limit)) {
    return `You have ${remaining} ${featureName} remaining out of ${limit}. Consider upgrading.`;
  }

  return `${remaining} of ${limit} ${featureName} remaining`;
};

/**
 * Compare subscription plans
 */
export const comparePlans = (
  plan1: SubscriptionPlan,
  plan2: SubscriptionPlan
): number => {
  const order: SubscriptionPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  return order.indexOf(plan1) - order.indexOf(plan2);
};

/**
 * Check if plan is upgrade
 */
export const isUpgrade = (
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan
): boolean => {
  return comparePlans(newPlan, currentPlan) > 0;
};

/**
 * Check if plan is downgrade
 */
export const isDowngrade = (
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan
): boolean => {
  return comparePlans(newPlan, currentPlan) < 0;
};
