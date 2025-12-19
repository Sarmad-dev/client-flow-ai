import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { CustomAlert } from '@/components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import {
  Mail,
  ArrowLeft,
  Send,
  Smartphone,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Animations
  const logoScale = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  React.useEffect(() => {
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    formOpacity.value = withTiming(1, { duration: 800 });
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [
      { translateY: interpolate(formOpacity.value, [0, 1], [50, 0]) },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
    });
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      showAlert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    buttonScale.value = withSpring(0.95);

    const { error } = await resetPassword(email.trim());

    if (error) {
      showAlert('Reset Failed', error.message);
      buttonScale.value = withSpring(1);
    } else {
      setEmailSent(true);
    }

    setLoading(false);
  };

  const handleResendEmail = async () => {
    setEmailSent(false);
    await handleResetPassword();
  };

  if (emailSent) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.content}>
          <Animated.View style={[styles.successSection, logoAnimatedStyle]}>
            <LinearGradient
              colors={[colors.success, colors.primary]}
              style={styles.successIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Send size={32} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Check your email
            </Text>
            <Text
              style={[styles.successSubtitle, { color: colors.textSecondary }]}
            >
              We've sent a password reset link to{'\n'}
              <Text style={{ fontWeight: '600' }}>{email}</Text>
            </Text>
          </Animated.View>

          <Animated.View style={[styles.actionsSection, formAnimatedStyle]}>
            <TouchableOpacity
              style={[
                styles.resendButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleResendEmail}
              disabled={loading}
            >
              <RotateCcw size={20} color={colors.primary} strokeWidth={2} />
              <Text
                style={[styles.resendButtonText, { color: colors.primary }]}
              >
                Resend Email
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.primary }]}
              >
                <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <View style={styles.headerSection}>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity style={styles.backIconButton}>
                <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </Link>
          </View>

          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
            <LinearGradient
              colors={[colors.warning, colors.error]}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <RotateCcw size={32} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              Reset Password
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Enter your email to receive a reset link
            </Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formSection, formAnimatedStyle]}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Forgot password?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              No worries, we'll send you reset instructions
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Mail size={20} color={colors.textSecondary} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Reset Button */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={20} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Back to Sign In */}
            <View style={styles.backToSignInContainer}>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity style={styles.backToSignInButton}>
                  <ArrowLeft
                    size={16}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.backToSignInText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Back to sign in
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideAlert}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerSection: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  formSection: {
    flex: 1,
    maxHeight: 400,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backToSignInContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  backToSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  backToSignInText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsSection: {
    gap: 16,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
