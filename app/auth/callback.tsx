import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL with query parameters
        const url = window.location.href;

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);

        if (error) {
          console.error('Error exchanging code for session:', error);
          router.replace('/(auth)/sign-in');
          return;
        }

        if (data?.session) {
          console.log('Successfully authenticated with Google');
          // Redirect to main app
          router.replace('/(tabs)');
        } else {
          console.error('No session returned');
          router.replace('/(auth)/sign-in');
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        router.replace('/(auth)/sign-in');
      }
    };

    handleCallback();
  }, [params]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.text }]}>
        Completing sign in...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
  },
});
