import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionModal } from '../../components/SubscriptionModal';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');

export default function SubscriptionScreen() {
  const {
    userSubscription,
    currentOffering,
    purchaseSubscription,
    restorePurchases,
    isLoading,
  } = useSubscription();
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!currentOffering?.availablePackages?.[0]) {
      Alert.alert('Error', 'No subscription packages available');
      return;
    }

    setPurchasing(true);
    try {
      const success = await purchaseSubscription(
        currentOffering.availablePackages[0].identifier
      );
      if (success) {
        Alert.alert(
          'Success',
          'Welcome to Pro! You now have unlimited access to all features.'
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to purchase subscription. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'An error occurred during purchase. Please try again.'
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully!');
    } catch (error) {
      Alert.alert('Error', 'No purchases found to restore.');
    }
  };

  const getCurrentPlanFeatures = () => {
    if (userSubscription.plan === 'pro') {
      return [
        '✓ Unlimited Leads & Clients',
        '✓ Unlimited Tasks',
        '✓ Meeting Management',
        '✓ Email Analytics',
        '✓ Unlimited Emails',
      ];
    } else {
      return [
        '✓ 3 Leads',
        '✓ 3 Clients',
        '✓ 3 Tasks per Client',
        '✓ 5 Emails per Client/Lead',
        '✗ Meeting Management',
        '✗ Email Analytics',
      ];
    }
  };

  const getProFeatures = () => [
    'Unlimited Leads & Clients',
    'Unlimited Tasks',
    'Meeting Management',
    'Email Analytics',
    'Unlimited Emails',
    'Priority Support',
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.planBadge,
              { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]}
          >
            <Text style={styles.planText}>
              {userSubscription.plan === 'pro' ? 'PRO' : 'FREE'}
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            {userSubscription.plan === 'pro'
              ? 'Pro Plan Active'
              : 'Current Plan'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {userSubscription.plan === 'pro'
              ? 'You have unlimited access to all features'
              : 'Upgrade to unlock all features'}
          </Text>
        </View>
      </LinearGradient>

      {/* Current Plan Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Current Features
        </Text>
        <View
          style={[styles.featuresList, { backgroundColor: colors.surface }]}
        >
          {getCurrentPlanFeatures().map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Usage Stats */}
      {userSubscription.plan === 'free' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Usage
          </Text>
          <View
            style={[styles.usageContainer, { backgroundColor: colors.surface }]}
          >
            <View style={styles.usageItem}>
              <Text style={[styles.usageNumber, { color: colors.primary }]}>
                {userSubscription.currentUsage.leads}/3
              </Text>
              <Text
                style={[styles.usageLabel, { color: colors.textSecondary }]}
              >
                Leads
              </Text>
            </View>
            <View style={styles.usageItem}>
              <Text style={[styles.usageNumber, { color: colors.primary }]}>
                {userSubscription.currentUsage.clients}/3
              </Text>
              <Text
                style={[styles.usageLabel, { color: colors.textSecondary }]}
              >
                Clients
              </Text>
            </View>
            <View style={styles.usageItem}>
              <Text style={[styles.usageNumber, { color: colors.primary }]}>
                {userSubscription.currentUsage.emailsSent}/5
              </Text>
              <Text
                style={[styles.usageLabel, { color: colors.textSecondary }]}
              >
                Emails
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Pro Plan Card */}
      {userSubscription.plan === 'free' && (
        <View style={styles.section}>
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.proCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.proCardContent}>
              <View style={styles.proIcon}>
                <Ionicons name="diamond" size={30} color="white" />
              </View>
              <Text style={styles.proTitle}>Upgrade to Pro</Text>
              <Text style={styles.proPrice}>
                {currentOffering?.availablePackages?.[0]?.product
                  ?.priceString || '$5.00'}
                /month
              </Text>
              <Text style={styles.proSubtitle}>
                Unlock unlimited access to all features
              </Text>

              <View style={styles.proFeatures}>
                {getProFeatures().map((feature, index) => (
                  <View key={index} style={styles.proFeatureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.proFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  { backgroundColor: colors.surface },
                ]}
                onPress={handlePurchase}
                disabled={purchasing || isLoading}
              >
                {purchasing ? (
                  <ActivityIndicator color="#f093fb" />
                ) : (
                  <Text
                    style={[styles.upgradeButtonText, { color: '#f093fb' }]}
                  >
                    Upgrade Now
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={handleRestore}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        featureName="Pro Features"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
  },
  planBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  planText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  featuresList: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureItem: {
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    lineHeight: 22,
  },
  usageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageItem: {
    alignItems: 'center',
  },
  usageNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  usageLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  proCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  proCardContent: {
    alignItems: 'center',
  },
  proIcon: {
    marginBottom: 15,
  },
  proTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  proPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  proSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  proFeatures: {
    width: '100%',
    marginBottom: 25,
  },
  proFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  proFeatureText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 10,
  },
  upgradeButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
});
