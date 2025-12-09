import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  Inbox,
  Search,
  FileText,
  PenTool,
  FileCode,
  Repeat,
  TrendingUp,
  Mail,
  ChevronRight,
} from 'lucide-react-native';

export default function EmailsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    guardEmailSending,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();
  const emailSections = [
    {
      icon: Inbox,
      title: 'Inbox',
      description: 'Browse conversations and compose emails',
      route: '/(tabs)/emails-inbox',
      color: colors.primary,
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'View email performance charts and stats',
      route: '/(tabs)/emails-analytics',
      color: '#10B981',
    },
    {
      icon: Search,
      title: 'Search & Filter',
      description: 'Search emails with advanced filters and saved presets',
      route: '/(tabs)/emails-search',
      color: '#F59E0B',
    },
    {
      icon: FileText,
      title: 'Drafts',
      description: 'View and manage saved email drafts',
      route: '/(tabs)/email-drafts',
      color: '#8B5CF6',
    },
    {
      icon: PenTool,
      title: 'Signatures',
      description: 'Manage your email signatures',
      route: '/(tabs)/email-signatures',
      color: '#EC4899',
    },
    {
      icon: FileCode,
      title: 'Templates',
      description: 'Create and manage email templates',
      route: '/(tabs)/templates',
      color: '#3B82F6',
    },
    {
      icon: Repeat,
      title: 'Sequences',
      description: 'Create and manage automated email sequences',
      route: '/(tabs)/email-sequences',
      color: '#06B6D4',
    },
    {
      icon: TrendingUp,
      title: 'Sequence Analytics',
      description: 'View performance metrics for email sequences',
      route: '/(tabs)/email-sequence-analytics',
      color: '#14B8A6',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Mail size={28} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Emails</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Manage your email communications
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {emailSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (guardEmailSending('client', user?.id ?? '')) {
                    router.push(section.route as any);
                  }
                }}
                style={[
                  styles.navCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={section.title}
                accessibilityHint={section.description}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.cardIconContainer,
                        { backgroundColor: section.color + '15' },
                      ]}
                    >
                      <Icon size={24} color={section.color} strokeWidth={2} />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text
                        style={[styles.cardTitle, { color: colors.text }]}
                        accessible={false}
                      >
                        {section.title}
                      </Text>
                      <Text
                        style={[
                          styles.cardDescription,
                          { color: colors.textSecondary },
                        ]}
                        accessible={false}
                        numberOfLines={2}
                      >
                        {section.description}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardsContainer: {
    gap: 12,
  },
  navCard: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
});
