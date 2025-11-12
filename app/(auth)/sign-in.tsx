import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Smartphone,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/CustomAlertContext';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  // Animations
  const logoScale = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  React.useEffect(() => {
    // Entrance animations
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

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert({
        title: 'Error!',
        message: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    buttonScale.value = withSpring(0.95);

    const { error } = await signIn(email.trim(), password);

    if (error) {
      showAlert({
        title: 'Error!',
        message: 'Sign In Failed',
      });
      buttonScale.value = withSpring(1);
    } else {
      router.replace('/');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      showAlert({
        title: 'Error!',
        message: 'Google Sign In Failed',
      });
    }

    setLoading(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Smartphone size={32} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.text }]}>
              ClientFlow AI
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Your AI-powered CRM companion
            </Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formSection, formAnimatedStyle]}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to continue managing your clients
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
                  placeholder="Email address"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Input */}
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
                <Lock size={20} color={colors.textSecondary} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff
                      size={20}
                      color={colors.textSecondary}
                      strokeWidth={2}
                    />
                  ) : (
                    <Eye
                      size={20}
                      color={colors.textSecondary}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <View style={styles.forgotPasswordContainer}>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text
                    style={[
                      styles.forgotPasswordText,
                      { color: colors.primary },
                    ]}
                  >
                    Forgot your password?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Sign In Button */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.signInButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <LogIn size={20} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.signInButtonText}>Sign In</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <Text
                style={[styles.dividerText, { color: colors.textSecondary }]}
              >
                or
              </Text>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text
                style={[styles.signUpText, { color: colors.textSecondary }]}
              >
                Don't have an account?{' '}
              </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text style={[styles.signUpLink, { color: colors.primary }]}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
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
    maxHeight: 500,
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
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  eyeButton: {
    padding: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
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
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '400',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
