import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTheme } from '@/hooks/useTheme';
import {
  SUBSCRIPTION_TIERS,
  getYearlySavingsPercentage,
} from '@/lib/subscriptionConfig';
import {
  BillingPeriod,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types/subscription';
import { formatSubscriptionStatus } from '@/lib/subscriptionUtils';
import { CustomAlert } from '@/components/CustomAlert';
import { PurchasesPackage } from 'react-native-purchases';

const { width } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const {
    userSubscription,
    offerings,
    purchasePackage,
    restorePurchases,
    isLoading,
    analytics,
    isInTrial,
    getTrialDaysLeft,
  } = useSubscription();

  const { colors, isDark } = useTheme();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [purchasing, setPurchasing] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
    });
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!offerings?.current) {
      showAlert('Error', 'No subscription packages available');
      return;
    }

    // Find the appropriate package
    const productId = `nexasuit_${plan}_${
      billingPeriod === 'yearly' ? 'yearly' : 'monthly'
    }`;

    const pkg = offerings.current.availablePackages.find(
      (p) => p.product.identifier
    );

    if (!pkg) {
      showAlert('Error', 'Package not found');
      return;
    }

    setPurchasing(true);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        showAlert(
          'Success!',
          `Welcome to ${plan.toUpperCase()}! You now have access to all premium features.`
        );
      } else {
        showAlert('Error', 'Failed to complete purchase. Please try again.');
      }
    } catch (error) {
      showAlert('Error', 'An error occurred during purchase.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const success = await restorePurchases();
      if (success) {
        showAlert('Success', 'Purchases restored successfully!');
      } else {
        showAlert('Info', 'No purchases found to restore.');
      }
    } catch (error) {
      showAlert('Error', 'Failed to restore purchases.');
    }
  };

  const renderPlanCard = (pkg: PurchasesPackage) => {
    const tier = SUBSCRIPTION_TIERS.find((t) =>
      pkg.product.identifier.includes(t.plan)
    );

    if (!tier) return null;

    const isCurrentPlan = userSubscription.plan === tier.plan;
    const price = pkg.product.price;
    const priceString = pkg.product.priceString;

    // Determine if this is yearly or monthly based on product identifier
    const isYearly = pkg.product.identifier.includes('yearly');
    const savings = isYearly ? getYearlySavingsPercentage(tier) : 0;

    return (
      <View
        key={pkg.product.identifier}
        style={[
          styles.planCard,
          { backgroundColor: colors.surface },
          isCurrentPlan && styles.currentPlanCard,
          tier.popular && styles.popularPlanCard,
        ]}
      >
        {tier.popular && (
          <View
            style={[styles.popularBadge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        {isCurrentPlan && (
          <View
            style={[styles.currentBadge, { backgroundColor: colors.success }]}
          >
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <Text style={[styles.planName, { color: colors.text }]}>
          {tier.displayName}
        </Text>
        <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
          {tier.description}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: colors.text }]}>
            {priceString}
          </Text>
          <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
            /{isYearly ? 'year' : 'month'}
          </Text>
        </View>

        {savings > 0 && (
          <View
            style={[
              styles.savingsBadge,
              { backgroundColor: colors.success + '20' },
            ]}
          >
            <Text style={[styles.savingsText, { color: colors.success }]}>
              Save {savings}%
            </Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {!isCurrentPlan && tier.plan !== 'free' && (
          <TouchableOpacity
            style={[
              styles.selectButton,
              {
                backgroundColor: tier.popular ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handlePurchase(tier.plan)}
            disabled={purchasing || isLoading}
          >
            {purchasing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                style={[
                  styles.selectButtonText,
                  { color: tier.popular ? 'white' : colors.text },
                ]}
              >
                {tier.trialDays
                  ? `Start ${tier.trialDays}-Day Trial`
                  : 'Select Plan'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {isCurrentPlan && (
          <View
            style={[
              styles.currentPlanButton,
              { backgroundColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.currentPlanButtonText,
                { color: colors.textSecondary },
              ]}
            >
              Active
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderLocalTierCard = (tier: SubscriptionTier) => {
    const isCurrentPlan = userSubscription.plan === tier.plan;
    const price =
      billingPeriod === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
    const savings =
      billingPeriod === 'yearly' ? getYearlySavingsPercentage(tier) : 0;

    return (
      <View
        key={tier.plan}
        style={[
          styles.planCard,
          { backgroundColor: colors.surface },
          isCurrentPlan && styles.currentPlanCard,
          tier.popular && styles.popularPlanCard,
        ]}
      >
        {tier.popular && (
          <View
            style={[styles.popularBadge, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        {isCurrentPlan && (
          <View
            style={[styles.currentBadge, { backgroundColor: colors.success }]}
          >
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <Text style={[styles.planName, { color: colors.text }]}>
          {tier.displayName}
        </Text>
        <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
          {tier.description}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: colors.text }]}>
            ${price.toFixed(2)}
          </Text>
          <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
            /{billingPeriod === 'yearly' ? 'year' : 'month'}
          </Text>
        </View>

        {savings > 0 && (
          <View
            style={[
              styles.savingsBadge,
              { backgroundColor: colors.success + '20' },
            ]}
          >
            <Text style={[styles.savingsText, { color: colors.success }]}>
              Save {savings}%
            </Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark" size={18} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {!isCurrentPlan && tier.plan !== 'free' && (
          <TouchableOpacity
            style={[
              styles.selectButton,
              {
                backgroundColor: tier.popular ? colors.primary : colors.border,
              },
            ]}
            onPress={() =>
              showAlert(
                'Coming Soon',
                'In-app purchases will be available soon!'
              )
            }
            disabled={purchasing || isLoading}
          >
            <Text
              style={[
                styles.selectButtonText,
                { color: tier.popular ? 'white' : colors.text },
              ]}
            >
              {tier.trialDays
                ? `Start ${tier.trialDays}-Day Trial`
                : 'Select Plan'}
            </Text>
          </TouchableOpacity>
        )}

        {isCurrentPlan && (
          <View
            style={[
              styles.currentPlanButton,
              { backgroundColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.currentPlanButtonText,
                { color: colors.textSecondary },
              ]}
            >
              Active
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderUsageStats = () => {
    if (!analytics) return null;

    return (
      <View style={[styles.usageCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Usage
        </Text>

        {Object.entries(analytics.usagePercentage).map(([key, percentage]) => (
          <View key={key} style={styles.usageRow}>
            <Text style={[styles.usageLabel, { color: colors.text }]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <View style={styles.usageBarContainer}>
              <View
                style={[styles.usageBar, { backgroundColor: colors.border }]}
              >
                <View
                  style={[
                    styles.usageBarFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor:
                        percentage >= 90
                          ? colors.error
                          : percentage >= 70
                          ? colors.warning
                          : colors.success,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.usagePercentage,
                  { color: colors.textSecondary },
                ]}
              >
                {percentage}%
              </Text>
            </View>
          </View>
        ))}

        {analytics.recommendedUpgrade && (
          <View
            style={[
              styles.upgradeRecommendation,
              { backgroundColor: colors.warning + '20' },
            ]}
          >
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text
              style={[styles.upgradeRecommendationText, { color: colors.text }]}
            >
              You're approaching your limits. Consider upgrading to{' '}
              {analytics.recommendedUpgrade.toUpperCase()}.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View
            style={[
              styles.planBadge,
              { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]}
          >
            <Text style={styles.planBadgeText}>
              {userSubscription.plan.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            {formatSubscriptionStatus(userSubscription)}
          </Text>
          {isInTrial() && (
            <Text style={styles.headerSubtitle}>
              {getTrialDaysLeft()} days left in trial
            </Text>
          )}
          {analytics?.daysUntilRenewal && analytics.daysUntilRenewal > 0 && (
            <Text style={styles.headerSubtitle}>
              Renews in {analytics.daysUntilRenewal} days
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* Usage Stats */}
      {renderUsageStats()}

      {/* Billing Period Toggle */}
      <View style={styles.billingToggleContainer}>
        <Text style={[styles.billingToggleLabel, { color: colors.text }]}>
          Billing Period
        </Text>
        <View
          style={[styles.billingToggle, { backgroundColor: colors.border }]}
        >
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingPeriod === 'monthly' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                {
                  color: billingPeriod === 'monthly' ? 'white' : colors.text,
                },
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingPeriod === 'yearly' && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                {
                  color: billingPeriod === 'yearly' ? 'white' : colors.text,
                },
              ]}
            >
              Yearly
            </Text>
          </TouchableOpacity>
        </View>
        {billingPeriod === 'yearly' && (
          <Text style={[styles.savingsNote, { color: colors.success }]}>
            Save up to 17% with yearly billing
          </Text>
        )}
      </View>

      {/* Plan Cards */}
      <View style={styles.plansContainer}>
        {offerings?.current?.availablePackages &&
        offerings.current.availablePackages.length > 0
          ? // Show packages from RevenueCat
            offerings.current.availablePackages
              .filter((pkg) => {
                // Filter packages based on selected billing period
                const isYearly = pkg.product.identifier.includes('yearly');
                return billingPeriod === 'yearly' ? isYearly : !isYearly;
              })
              .map((pkg) => renderPlanCard(pkg))
          : // Fallback to local tiers if no packages available
            SUBSCRIPTION_TIERS.map((tier) => renderLocalTierCard(tier))}
      </View>

      {/* Restore Purchases */}
      <TouchableOpacity
        style={[styles.restoreButton, { backgroundColor: colors.surface }]}
        onPress={handleRestore}
      >
        <Ionicons name="refresh" size={20} color={colors.primary} />
        <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
          Restore Purchases
        </Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          All plans include a free trial. Cancel anytime.
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Subscriptions auto-renew unless cancelled.
        </Text>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideAlert}
        onConfirm={alertConfig.onConfirm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  planBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  planBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  usageCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  usageRow: {
    marginBottom: 16,
  },
  usageLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  usageBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  usagePercentage: {
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  upgradeRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  upgradeRecommendationText: {
    flex: 1,
    fontSize: 13,
  },
  billingToggleContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  billingToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  savingsNote: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  currentBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
