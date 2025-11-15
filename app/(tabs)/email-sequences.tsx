import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import EmailSequencesManager from '@/components/EmailSequencesManager';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailSequencesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    guardEmailSending,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  // Guard the feature
  React.useEffect(() => {
    guardEmailSending('client', user?.id ?? '');
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <EmailSequencesManager mode="manage" />
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
  content: { flex: 1 },
});
