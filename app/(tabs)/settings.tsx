import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsItem {
  icon: any;
  title: string;
  subtitle: string;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: () => void;
  onPress?: () => void;
}

interface SettingsGroup {
  title: string;
  items: SettingsItem[];
}

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  const settingsGroups: SettingsGroup[] = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          title: 'Profile',
          subtitle: 'Manage your account details',
          onPress: () => router.push('/(tabs)/profile'),
        },
        {
          icon: Bell,
          title: 'Notifications',
          subtitle: 'Push notifications & reminders',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: isDark ? Moon : Sun,
          title: 'Dark Mode',
          subtitle: 'Toggle dark/light theme',
          hasSwitch: true,
          switchValue: isDark,
          onSwitchChange: toggleTheme,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: Shield,
          title: 'Privacy Policy',
          subtitle: 'View our privacy policy',
        },
        {
          icon: HelpCircle,
          title: 'Help & Support',
          subtitle: 'Get help or contact support',
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={32} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
            >
              {user?.email || 'user@example.com'}
            </Text>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
              {group.title}
            </Text>
            <View
              style={[
                styles.groupContainer,
                { backgroundColor: colors.surface },
              ]}
            >
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingsItem,
                    itemIndex !== group.items.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={styles.settingsItemLeft}>
                    <View
                      style={[
                        styles.settingsIcon,
                        { backgroundColor: `${colors.primary}15` },
                      ]}
                    >
                      <item.icon
                        size={20}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.settingsText}>
                      <Text
                        style={[styles.settingsTitle, { color: colors.text }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.settingsSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.settingsItemRight}>
                    {item.hasSwitch ? (
                      <Switch
                        value={item.switchValue}
                        onValueChange={item.onSwitchChange}
                        trackColor={{
                          false: colors.border,
                          true: colors.primary,
                        }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <ChevronRight
                        size={20}
                        color={colors.textSecondary}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleSignOut}
        >
          <LogOut size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  groupContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    marginLeft: 16,
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  settingsItemRight: {
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
