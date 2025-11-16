import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import DeliverabilityDashboard from '@/components/DeliverabilityDashboard';

export default function EmailDeliverabilityScreen() {
  const { colors } = useTheme();

  // Default to last 30 days
  const [dateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DeliverabilityDashboard dateRange={dateRange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
