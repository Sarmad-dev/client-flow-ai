import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Mail } from 'lucide-react-native';

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Confirming your email address...');

  useEffect(() => {
    handleEmailConfirmation();
  }, []);

  const handleEmailConfirmation = async () => {
    try {
      const token = params.token as string;
      const type = params.type as string;

      if (!token) {
        setStatus('error');
        setMessage('Invalid confirmation link');
        setTimeout(() => router.replace('/(auth)/sign-in'), 3000);
        return;
      }

      console.log('Confirming email with token:', token, 'type:', type);

      // Use the correct verification method based on type
      let result;
      if (type === 'signup') {
        result = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });
      } else {
        // For other types, try email verification
        result = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });
      }

      const { data, error } = result;

      if (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to confirm email address');
        setTimeout(() => router.replace('/(auth)/sign-in'), 3000);
        return;
      }

      console.log('Email confirmed successfully:', data);
      setStatus('success');
      setMessage(
        'Your email has been successfully verified! You can now sign in to your NexaSuit account.'
      );

      // Redirect to sign-in after successful confirmation
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 3000);
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      setStatus('error');
      setMessage('Something went wrong during email confirmation');
      setTimeout(() => router.replace('/(auth)/sign-in'), 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={64} color={colors.success} strokeWidth={2} />;
      case 'error':
        return <XCircle size={64} color={colors.error} strokeWidth={2} />;
      default:
        return <Mail size={64} color={colors.primary} strokeWidth={2} />;
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
        <View style={styles.iconContainer}>{getStatusIcon()}</View>

        <Text style={[styles.title, { color: getStatusColor() }]}>
          {status === 'loading' && 'Confirming Email'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </Text>

        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>

        {status === 'success' && (
          <Text style={[styles.submessage, { color: colors.textSecondary }]}>
            Redirecting you to sign in...
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
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  submessage: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
});
