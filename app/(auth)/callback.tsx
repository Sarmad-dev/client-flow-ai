import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';

type CallbackType =
  | 'signup'
  | 'recovery'
  | 'invite'
  | 'magiclink'
  | 'oauth'
  | 'email_change';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session, loading, refreshSession } = useAuth();
  const params = useLocalSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  useEffect(() => {
    // Handle deep links when app is already open
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      if (url.includes('auth/callback') || url.includes('auth/confirm')) {
        // Extract parameters from URL
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        const type = urlObj.searchParams.get('type');
        const access_token = urlObj.searchParams.get('access_token');
        const refresh_token = urlObj.searchParams.get('refresh_token');

        if (token || access_token) {
          handleTokenCallback(
            token,
            type as CallbackType,
            access_token,
            refresh_token
          );
        }
      }
    };

    // Handle initial URL if app was opened from email
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Check for URL parameters first
      const token = params.token as string;
      const type = params.type as CallbackType;
      const access_token = params.access_token as string;
      const refresh_token = params.refresh_token as string;
      const error = params.error as string;
      const error_description = params.error_description as string;

      // Handle errors first
      if (error) {
        console.error('Auth callback error:', error, error_description);
        setStatus('error');
        setMessage(error_description || 'Authentication failed');

        setTimeout(() => {
          router.replace('/(auth)/sign-in');
        }, 3000);
        return;
      }

      // Handle token-based callbacks (email confirmation, password reset, etc.)
      if (token || access_token) {
        await handleTokenCallback(token, type, access_token, refresh_token);
        return;
      }

      // Handle OAuth callbacks (no explicit token in params)
      await handleOAuthCallback();
    } catch (error) {
      console.error('Auth callback error:', error);
      setStatus('error');
      setMessage('Something went wrong during authentication');

      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 3000);
    }
  };

  const handleTokenCallback = async (
    token: string | null,
    type: CallbackType | null,
    access_token: string | null,
    refresh_token: string | null
  ) => {
    try {
      console.log('Handling token callback:', {
        type,
        hasToken: !!token,
        hasAccessToken: !!access_token,
      });

      // Handle different callback types
      switch (type) {
        case 'signup':
          setMessage('Confirming your email address...');
          if (token) {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'signup',
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Email confirmed successfully! Welcome to NexaSuit!');

            // Refresh the session to get the latest user data
            await refreshSession?.();

            setTimeout(() => {
              router.replace('/(tabs)');
            }, 2000);
          }
          break;

        case 'recovery':
          setMessage('Verifying password reset link...');
          if (token) {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'recovery',
            });

            if (error) throw error;

            setStatus('success');
            setMessage(
              'Password reset verified! Please set your new password.'
            );

            setTimeout(() => {
              router.replace('/(auth)/forgot-password');
            }, 2000);
          }
          break;

        case 'invite':
          setMessage('Processing team invitation...');
          if (token) {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'invite',
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Invitation accepted! Welcome to the team!');

            setTimeout(() => {
              router.replace('/(tabs)');
            }, 2000);
          }
          break;

        case 'magiclink':
          setMessage('Verifying magic link...');
          if (token) {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'magiclink',
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Magic link verified! You are now signed in.');

            setTimeout(() => {
              router.replace('/(tabs)');
            }, 2000);
          }
          break;

        case 'email_change':
          setMessage('Confirming email change...');
          if (token) {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'email_change',
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Email address updated successfully!');

            setTimeout(() => {
              router.replace('/(tabs)/profile');
            }, 2000);
          }
          break;

        default:
          // Handle direct token exchange (OAuth or session tokens)
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) throw error;

            setStatus('success');
            setMessage('Successfully signed in!');

            setTimeout(() => {
              router.replace('/(tabs)');
            }, 1500);
          } else {
            throw new Error('Invalid token callback');
          }
      }
    } catch (error: any) {
      console.error('Token callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to process authentication');

      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 3000);
    }
  };

  const handleOAuthCallback = async () => {
    try {
      setMessage('Completing OAuth sign in...');

      // Wait for auth state to be determined
      if (!loading) {
        if (session) {
          // User is authenticated, redirect to main app
          console.log(
            'OAuth callback: User authenticated, redirecting to main app'
          );
          setStatus('success');
          setMessage('Successfully signed in!');

          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1500);
        } else {
          // No session found, redirect back to sign in
          console.log(
            'OAuth callback: No session found, redirecting to sign in'
          );
          setStatus('error');
          setMessage('Authentication failed. Please try again.');

          setTimeout(() => {
            router.replace('/(auth)/sign-in');
          }, 3000);
        }
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage('OAuth authentication failed');

      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={48} color={colors.success} strokeWidth={2} />;
      case 'error':
        return <XCircle size={48} color={colors.error} strokeWidth={2} />;
      default:
        return <Mail size={48} color={colors.primary} strokeWidth={2} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.text;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === 'loading' ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : (
          <View style={styles.iconContainer}>{getStatusIcon()}</View>
        )}

        <Text style={[styles.message, { color: getStatusColor() }]}>
          {message}
        </Text>

        {status === 'success' && (
          <Text style={[styles.submessage, { color: colors.textSecondary }]}>
            Redirecting you to the app...
          </Text>
        )}

        {status === 'error' && (
          <Text style={[styles.submessage, { color: colors.textSecondary }]}>
            Redirecting you back to sign in...
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  loader: {
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  submessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
