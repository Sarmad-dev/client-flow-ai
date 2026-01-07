import { Link, Stack } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SearchX, Home, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  const { colors } = useTheme();

  const styles = createStyles(colors);

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Icon Container */}
          <View style={styles.iconContainer}>
            <SearchX size={80} color={colors.textSecondary} strokeWidth={1.5} />
          </View>

          {/* Error Code */}
          <Text style={styles.errorCode}>404</Text>

          {/* Main Message */}
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.subtitle}>
            The page you're looking for doesn't exist or has been moved.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Link href="/" asChild>
              <TouchableOpacity style={styles.primaryButton}>
                <Home size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.primaryButtonText}>Go Home</Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                // This will go back in navigation history
                if (
                  typeof window !== 'undefined' &&
                  window.history?.length > 1
                ) {
                  window.history.back();
                } else {
                  // Fallback to home if no history
                  require('expo-router').router.replace('/');
                }
              }}
            >
              <ArrowLeft size={20} color={colors.primary} strokeWidth={2} />
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom decoration */}
        <View style={styles.bottomDecoration}>
          <View
            style={[styles.decorationDot, { backgroundColor: colors.primary }]}
          />
          <View
            style={[
              styles.decorationDot,
              { backgroundColor: colors.secondary },
            ]}
          />
          <View
            style={[styles.decorationDot, { backgroundColor: colors.accent }]}
          />
        </View>
      </View>
    </>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    content: {
      alignItems: 'center',
      maxWidth: width - 48,
      width: '100%',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      shadowColor: colors.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    errorCode: {
      fontSize: 72,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: 16,
      letterSpacing: -2,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 40,
      paddingHorizontal: 20,
    },
    buttonContainer: {
      width: '100%',
      gap: 16,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      gap: 8,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    bottomDecoration: {
      position: 'absolute',
      bottom: 60,
      flexDirection: 'row',
      gap: 8,
    },
    decorationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      opacity: 0.6,
    },
  });
