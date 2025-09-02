import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
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
import { CircleCheck as CheckCircle, Sparkles, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function CompleteScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const checkScale = useSharedValue(0);
  const checkRotation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);

  useEffect(() => {
    // Success animation sequence
    checkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    checkRotation.value = withSequence(
      withTiming(360, { duration: 800 }),
      withTiming(0, { duration: 0 })
    );
    
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    buttonOpacity.value = withDelay(800, withTiming(1, { duration: 800 }));
    
    // Sparkle celebration
    sparkleScale.value = withDelay(1000,
      withSequence(
        withSpring(1, { damping: 8 }),
        withSpring(1.3, { damping: 8 }),
        withSpring(1, { damping: 8 })
      )
    );
  }, []);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotate: `${checkRotation.value}deg` }
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: interpolate(titleOpacity.value, [0, 1], [30, 0]) }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: interpolate(subtitleOpacity.value, [0, 1], [30, 0]) }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: interpolate(buttonOpacity.value, [0, 1], [30, 0]) }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
  }));

  const completeOnboarding = async () => {
    try {
      await supabase
        .from('user_onboarding')
        .update({
          completed: true,
          current_step: 4,
          steps_completed: ['welcome', 'features', 'setup', 'complete'],
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Fallback to main app even if onboarding update fails
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.success + '10', colors.primary + '10', colors.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconSection}>
            <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
              <LinearGradient
                colors={[colors.success, colors.primary]}
                style={styles.checkIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <CheckCircle size={64} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </Animated.View>
            
            <Animated.View style={[styles.sparkleContainer, sparkleAnimatedStyle]}>
              <Sparkles size={32} color={colors.accent} strokeWidth={2} />
            </Animated.View>
          </View>

          {/* Text Section */}
          <View style={styles.textSection}>
            <Animated.Text style={[styles.title, { color: colors.text }, titleAnimatedStyle]}>
              You're all set!
            </Animated.Text>
            
            <Animated.Text style={[styles.subtitle, { color: colors.textSecondary }, subtitleAnimatedStyle]}>
              Welcome to ClientFlow AI! You're ready to start managing your clients, 
              capturing tasks with voice, and growing your business like never before.
            </Animated.Text>
          </View>

          {/* Features Summary */}
          <Animated.View style={[styles.featuresContainer, buttonAnimatedStyle]}>
            <Text style={[styles.featuresTitle, { color: colors.text }]}>What's next?</Text>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={[styles.featureBullet, { backgroundColor: colors.primary }]} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Try voice recording to create your first task
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={[styles.featureBullet, { backgroundColor: colors.secondary }]} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Add your first client or discover leads on the map
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={[styles.featureBullet, { backgroundColor: colors.accent }]} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Schedule meetings and track your progress
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Get Started Button */}
          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={completeOnboarding}
              activeOpacity={0.8}
            >
              <Text style={styles.startText}>Start Using ClientFlow AI</Text>
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
  iconSection: {
    alignItems: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  checkContainer: {
    marginBottom: 24,
  },
  checkIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 48,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
  startButton: {
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
  startText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});