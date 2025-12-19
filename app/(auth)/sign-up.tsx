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
  ScrollView,
  Button,
  Image,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { CustomAlert } from '@/components/CustomAlert';
import { Link, router } from 'expo-router';
import { User, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/CustomAlertContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const { showAlert } = useAlert();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const showCustomAlert = (
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

  const hideCustomAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
    });
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      showCustomAlert('Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      showCustomAlert('Error', 'Please enter your email address');
      return false;
    }
    if (!email.includes('@')) {
      showCustomAlert('Error', 'Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      showCustomAlert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      showCustomAlert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    buttonScale.value = withSpring(0.95);

    const { error } = await signUp(email.trim(), password, fullName.trim());

    if (error) {
      showCustomAlert('Signup Error', error.message);

      showAlert({
        title: 'Error!',
        message: 'Signup Error',
      });

      buttonScale.value = withSpring(1);
      setLoading(false);
      return;
    }

    // showCustomAlert('User created', 'Please check your email to verify your account.');

    showAlert({
      title: 'Success!',
      message:
        'Account created successfully. Please check your email to verify your account.',
      confirmText: 'Login Now',
      onConfirm: () => router.replace('/(auth)/sign-in'),
    });

    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      showCustomAlert('Google Sign Up Failed', error.message);
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
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
              <Image
                source={require('@/assets/images/app-icon.png')}
                style={styles.logoContainer}
                resizeMode="contain"
              />
              <Text style={[styles.appName, { color: colors.text }]}>
                ClientFlow AI
              </Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                Join thousands of professionals
              </Text>
            </Animated.View>

            {/* Form Section */}
            <Animated.View style={[styles.formSection, formAnimatedStyle]}>
              <Text style={[styles.welcomeText, { color: colors.text }]}>
                Create account
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Start managing your clients like a pro
              </Text>

              {/* Full Name Input */}
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
                  <User
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoComplete="name"
                  />
                </View>
              </View>

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
                  <Mail
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
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
                  <Lock
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Password (min. 6 characters)"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
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

              {/* Confirm Password Input */}
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
                  <Lock
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
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

              {/* Sign Up Button */}
              <Animated.View style={buttonAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.signUpButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <UserPlus size={20} color="#FFFFFF" strokeWidth={2} />
                      <Text style={styles.signUpButtonText}>
                        Create Account
                      </Text>
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

              {/* Google Sign Up */}
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleGoogleSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={[styles.googleButtonText, { color: colors.text }]}>
                  Sign up with Google
                </Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text
                  style={[styles.signInText, { color: colors.textSecondary }]}
                >
                  Already have an account?{' '}
                </Text>
                <Link href="/(auth)/sign-in" asChild>
                  <TouchableOpacity>
                    <Text
                      style={[styles.signInLink, { color: colors.primary }]}
                    >
                      Sign in
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideCustomAlert}
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
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    minHeight: 700,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpButtonText: {
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    fontWeight: '400',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
