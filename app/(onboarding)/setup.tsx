import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Mic,
  Bell,
  MapPin,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

export default function SetupScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    microphone: false,
    notifications: false,
    location: false,
    calendar: false,
  });
  const [loading, setLoading] = useState(false);

  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissions((prev) => ({ ...prev, microphone: status === 'granted' }));
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is needed for voice-to-task functionality'
        );
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissions((prev) => ({
        ...prev,
        notifications: status === 'granted',
      }));
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Notifications help you stay on top of your tasks'
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissions((prev) => ({ ...prev, location: status === 'granted' }));
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location access enables lead discovery on maps'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const requestCalendarPermission = async () => {
    try {
      // For now, we'll just mark as granted since calendar integration is optional
      setPermissions((prev) => ({ ...prev, calendar: true }));
    } catch (error) {
      console.error('Error requesting calendar permission:', error);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    buttonScale.value = withSpring(0.95);

    try {
      // Update onboarding progress
      await supabase
        .from('user_onboarding')
        .update({
          current_step: 3,
          steps_completed: ['welcome', 'features', 'setup'],
        })
        .eq('user_id', user?.id);

      // Ensure a base profile exists so later steps can enrich it
      await supabase.from('profiles').upsert(
        {
          user_id: user?.id,
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
        },
        { onConflict: 'user_id' } as any
      );

      router.push('/(onboarding)/organization');
    } catch (error) {
      console.error('Error updating onboarding:', error);
    } finally {
      setLoading(false);
      buttonScale.value = withSpring(1);
    }
  };

  const permissionItems = [
    {
      icon: Mic,
      title: 'Microphone Access',
      description: 'Required for voice-to-task conversion',
      granted: permissions.microphone,
      onRequest: requestMicrophonePermission,
      required: true,
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Stay on top of tasks and follow-ups',
      granted: permissions.notifications,
      onRequest: requestNotificationPermission,
      required: false,
    },
    {
      icon: MapPin,
      title: 'Location Services',
      description: 'Discover leads and businesses nearby',
      granted: permissions.location,
      onRequest: requestLocationPermission,
      required: false,
    },
    {
      icon: Calendar,
      title: 'Calendar Integration',
      description: 'Sync tasks and meetings with your calendar',
      granted: permissions.calendar,
      onRequest: requestCalendarPermission,
      required: false,
    },
  ];

  const allRequiredGranted = permissions.microphone;

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Setup</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>
            Let's set up your{'\n'}permissions
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We need a few permissions to provide the best experience
          </Text>
        </View>

        <View style={styles.permissionsContainer}>
          {permissionItems.map((item, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100)
                .springify()
                .damping(15)}
              style={[
                styles.permissionCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.permissionContent}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.permissionIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <item.icon size={24} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>

                <View style={styles.permissionText}>
                  <View style={styles.permissionHeader}>
                    <Text
                      style={[styles.permissionTitle, { color: colors.text }]}
                    >
                      {item.title}
                    </Text>
                    {item.required && (
                      <View
                        style={[
                          styles.requiredBadge,
                          { backgroundColor: colors.error },
                        ]}
                      >
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.permissionDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.permissionButton,
                  {
                    backgroundColor: item.granted
                      ? colors.success
                      : colors.primary,
                    opacity: item.granted ? 0.7 : 1,
                  },
                ]}
                onPress={item.onRequest}
                disabled={item.granted}
              >
                {item.granted ? (
                  <Check size={20} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Text style={styles.permissionButtonText}>Grant</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: allRequiredGranted
                  ? colors.primary
                  : colors.textSecondary,
                opacity: allRequiredGranted ? 1 : 0.5,
              },
            ]}
            onPress={handleContinue}
            disabled={!allRequiredGranted || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>
              {allRequiredGranted ? 'Continue' : 'Grant Required Permissions'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </Animated.View>
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
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionText: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  permissionDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
