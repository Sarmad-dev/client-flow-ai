import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface EmailListSkeletonProps {
  count?: number;
}

export default function EmailListSkeleton({
  count = 5,
}: EmailListSkeletonProps) {
  const { colors, isDark } = useTheme();

  const skeletonColor = isDark ? '#374151' : '#E5E7EB';
  const shimmerColor = isDark ? '#4B5563' : '#F3F4F6';

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.skeletonAvatar,
                { backgroundColor: skeletonColor },
              ]}
            />
            <View style={styles.headerContent}>
              <View
                style={[
                  styles.skeletonTitle,
                  { backgroundColor: skeletonColor },
                ]}
              />
              <View
                style={[
                  styles.skeletonSubtitle,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>
            <View
              style={[styles.skeletonTime, { backgroundColor: skeletonColor }]}
            />
          </View>

          {/* Body */}
          <View style={styles.bodyContent}>
            <View
              style={[styles.skeletonLine, { backgroundColor: skeletonColor }]}
            />
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: skeletonColor, width: '80%' },
              ]}
            />
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <View
              style={[styles.skeletonBadge, { backgroundColor: skeletonColor }]}
            />
            <View
              style={[styles.skeletonBadge, { backgroundColor: skeletonColor }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerContent: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    width: '60%',
  },
  skeletonSubtitle: {
    height: 14,
    borderRadius: 4,
    width: '40%',
  },
  skeletonTime: {
    height: 12,
    width: 50,
    borderRadius: 4,
  },
  bodyContent: {
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonBadge: {
    height: 20,
    width: 60,
    borderRadius: 10,
  },
});
