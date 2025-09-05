import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
}

const { width, height } = Dimensions.get('window');

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  onClose,
  featureName = 'Pro Feature',
}) => {
  const { userSubscription, currentOffering, purchaseSubscription, isLoading } =
    useSubscription();
  const { colors, isDark } = useTheme();
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
        onClose();
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

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'Unlimited Leads & Clients':
        return 'people';
      case 'Unlimited Tasks':
        return 'checkmark-circle';
      case 'Meeting Management':
        return 'calendar';
      case 'Email Analytics':
        return 'analytics';
      case 'Unlimited Emails':
        return 'mail';
      default:
        return 'star';
    }
  };

  const features = [
    'Unlimited Leads & Clients',
    'Unlimited Tasks',
    'Meeting Management',
    'Email Analytics',
    'Unlimited Emails',
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.gradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.surface} />
              </TouchableOpacity>
            </View>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconBackground,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons name="diamond" size={40} color={colors.primary} />
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.surface }]}>
              Upgrade to Pro
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isDark
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(255,255,255,0.9)',
                },
              ]}
            >
              Unlock {featureName} and get unlimited access to all features
            </Text>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View
                    style={[
                      styles.featureIcon,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons
                      name={getFeatureIcon(feature) as any}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.featureText, { color: colors.surface }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: colors.surface }]}>
                {currentOffering?.availablePackages?.[0]?.product
                  ?.priceString || '$5.00'}
              </Text>
              <Text
                style={[
                  styles.pricePeriod,
                  {
                    color: isDark
                      ? 'rgba(255,255,255,0.8)'
                      : 'rgba(255,255,255,0.9)',
                  },
                ]}
              >
                /month
              </Text>
            </View>

            {/* Purchase Button */}
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={handlePurchase}
              disabled={purchasing || isLoading}
            >
              {purchasing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text
                  style={[styles.purchaseButtonText, { color: colors.primary }]}
                >
                  Upgrade Now
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <Text
              style={[
                styles.terms,
                {
                  color: isDark
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(255,255,255,0.7)',
                },
              ]}
            >
              Cancel anytime. Subscription auto-renews monthly.
            </Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
  },
  modalContent: {
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  pricePeriod: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 5,
  },
  purchaseButton: {
    backgroundColor: 'white',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  terms: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
