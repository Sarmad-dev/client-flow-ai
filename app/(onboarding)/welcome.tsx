import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const { colors } = useTheme();

  // Animation values
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);

  useEffect(() => {
    // Entrance animation sequence
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    logoRotation.value = withSequence(
      withTiming(360, { duration: 1000 }),
      withTiming(0, { duration: 0 })
    );

    titleOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    buttonOpacity.value = withDelay(900, withTiming(1, { duration: 800 }));

    // Sparkle animation
    sparkleScale.value = withDelay(
      1200,
      withSequence(
        withSpring(1, { damping: 10 }),
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 10 })
      )
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      { translateY: interpolate(titleOpacity.value, [0, 1], [30, 0]) },
    ],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [
      { translateY: interpolate(subtitleOpacity.value, [0, 1], [30, 0]) },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: interpolate(buttonOpacity.value, [0, 1], [30, 0]) },
    ],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
  }));

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={[
          colors.primary + '10',
          colors.secondary + '10',
          colors.background,
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <Image
                source={require('@/assets/images/app-icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.View
              style={[styles.sparkleContainer, sparkleAnimatedStyle]}
            >
              <Sparkles size={24} color={colors.accent} strokeWidth={2} />
            </Animated.View>
          </View>

          {/* Text Section */}
          <View style={styles.textSection}>
            <Animated.Text
              style={[styles.title, { color: colors.text }, titleAnimatedStyle]}
            >
              Welcome to{'\n'}ClientFlow AI
            </Animated.Text>

            <Animated.Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary },
                subtitleAnimatedStyle,
              ]}
            >
              Your AI-powered CRM companion that transforms how you manage
              clients, capture tasks with voice, and grow your business.
            </Animated.Text>
          </View>

          {/* Features Preview */}
          <Animated.View style={[styles.featuresPreview, buttonAnimatedStyle]}>
            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Text style={styles.featureEmoji}>🎤</Text>
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Voice-to-Task AI
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: colors.secondary + '20' },
                ]}
              >
                <Text style={styles.featureEmoji}>🗺️</Text>
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Lead Discovery
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: colors.accent + '20' },
                ]}
              >
                <Text style={styles.featureEmoji}>⚡</Text>
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Smart Automation
              </Text>
            </View>
          </Animated.View>

          {/* Get Started Button */}
          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              style={[
                styles.getStartedButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => router.push('/(onboarding)/features')}
              activeOpacity={0.8}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <ArrowRight size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 64,
    position: 'relative',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  featuresPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 48,
  },
  featureItem: {
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 28,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  getStartedButton: {
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
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
