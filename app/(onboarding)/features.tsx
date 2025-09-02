import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowRight,
  ArrowLeft,
  Mic,
  Users,
  Calendar,
  Target,
  Bell,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export default function FeaturesScreen() {
  const { colors } = useTheme();

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(50);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 800 });
    cardTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const features = [
    {
      icon: Mic,
      title: 'Voice-to-Task AI',
      description:
        'Simply speak your tasks and let AI extract all the details - client, due date, priority, and context.',
      gradient: [colors.primary, colors.secondary] as const,
    },
    {
      icon: Target,
      title: 'Lead Discovery',
      description:
        'Find potential clients on Google Maps, discover businesses, and convert them into leads effortlessly.',
      gradient: [colors.secondary, colors.accent] as const,
    },
    {
      icon: Users,
      title: 'Client Management',
      description:
        'Organize your clients with detailed profiles, contact history, and relationship tracking.',
      gradient: [colors.accent, colors.warning] as const,
    },
    {
      icon: Calendar,
      title: 'Meeting Summaries',
      description:
        'Record post-meeting audio and get AI-generated summaries with actionable items.',
      gradient: [colors.warning, colors.error] as const,
    },
    {
      icon: Bell,
      title: 'Smart Reminders',
      description:
        'Never miss a follow-up with intelligent notifications and daily task reminders.',
      gradient: [colors.error, colors.primary] as const,
    },
    {
      icon: TrendingUp,
      title: 'Business Growth',
      description:
        'Track your progress, analyze client relationships, and grow your business systematically.',
      gradient: [colors.success, colors.primary] as const,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Features
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>
            Everything you need to{'\n'}manage your business
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Discover the powerful features that will transform how you work with
            clients
          </Text>
        </View>

        <Animated.View style={[styles.featuresContainer, cardAnimatedStyle]}>
          {features.map((feature, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100)
                .springify()
                .damping(15)}
              style={[styles.featureCard, { backgroundColor: colors.surface }]}
            >
              <LinearGradient
                colors={feature.gradient}
                style={styles.featureIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <feature.icon size={28} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>

              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(onboarding)/setup')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Continue</Text>
          <ArrowRight size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: 32,
    paddingVertical: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
