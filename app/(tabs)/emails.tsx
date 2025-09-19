import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    guardEmailSending,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.content, { gap: 16 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Emails</Text>
        </View>
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => {
              if (guardEmailSending('client', user?.id ?? '')) {
                router.push('/(tabs)/emails-analytics');
              }
            }}
            style={[
              styles.navCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}
            >
              Analytics
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              View email performance charts and stats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (guardEmailSending('client', user?.id ?? '')) {
                router.push('/(tabs)/emails-inbox' as any);
              }
            }}
            style={[
              styles.navCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}
            >
              Inbox
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              Browse conversations and compose emails
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navCard: { borderWidth: 1, padding: 16, borderRadius: 12 },
});
