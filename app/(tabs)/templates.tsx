import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import EmailTemplatesManager from '@/components/EmailTemplatesManager';

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const { showSubscriptionModal, setShowSubscriptionModal, modalFeatureName } =
    useSubscriptionGuard();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <EmailTemplatesManager mode="manage" />

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />
    </SafeAreaView>
  );
}
