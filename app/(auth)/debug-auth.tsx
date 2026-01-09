import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Linking } from 'react-native';

export default function DebugAuthScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [deepLinks, setDeepLinks] = useState<string[]>([]);

  useEffect(() => {
    // Get initial URL
    Linking.getInitialURL().then(setInitialUrl);

    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      setDeepLinks((prev) => [
        ...prev,
        `${new Date().toLocaleTimeString()}: ${url}`,
      ]);
    });

    return () => subscription?.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Auth Debug Screen
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Route Parameters:
          </Text>
          <Text
            style={[
              styles.code,
              { color: colors.textSecondary, backgroundColor: colors.surface },
            ]}
          >
            {JSON.stringify(params, null, 2)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Initial URL:
          </Text>
          <Text
            style={[
              styles.code,
              { color: colors.textSecondary, backgroundColor: colors.surface },
            ]}
          >
            {initialUrl || 'None'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Deep Links Received:
          </Text>
          {deepLinks.length === 0 ? (
            <Text
              style={[
                styles.code,
                {
                  color: colors.textSecondary,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              No deep links received yet
            </Text>
          ) : (
            deepLinks.map((link, index) => (
              <Text
                key={index}
                style={[
                  styles.code,
                  {
                    color: colors.textSecondary,
                    backgroundColor: colors.surface,
                    marginBottom: 8,
                  },
                ]}
              >
                {link}
              </Text>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Current Route:
          </Text>
          <Text
            style={[
              styles.code,
              { color: colors.textSecondary, backgroundColor: colors.surface },
            ]}
          >
            /(auth)/debug-auth
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    lineHeight: 16,
  },
});
