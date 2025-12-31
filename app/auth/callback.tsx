import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session, loading } = useAuth();

  useEffect(() => {
    // Wait for auth state to be determined
    if (!loading) {
      if (session) {
        // User is authenticated, redirect to main app
        console.log(
          'OAuth callback: User authenticated, redirecting to main app'
        );
        router.replace('/(tabs)');
      } else {
        // No session found, redirect back to sign in
        console.log('OAuth callback: No session found, redirecting to sign in');
        router.replace('/(auth)/sign-in');
      }
    }
  }, [session, loading, router]);

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
