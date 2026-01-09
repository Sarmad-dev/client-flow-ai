import React, { useEffect, useRef, useState } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import {
  Home,
  SquareCheck as CheckSquare,
  Users,
  Phone,
  Settings,
  Target,
  Mail,
  Menu,
  Calendar,
  X,
  Building2,
} from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Animated, Easing } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import NotificationBell from '@/components/NotificationBell';
import OrganizationRequiredModal from '@/components/OrganizationRequiredModal';

export default function TabLayout() {
  const { session, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const sidebarWidth = 300;
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showMore) {
      Animated.parallel([
        Animated.spring(sidebarAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMore, sidebarAnim, overlayOpacity]);

  const closeMore = () => {
    Animated.parallel([
      Animated.timing(sidebarAnim, {
        toValue: -sidebarWidth,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setShowMore(false));
  };

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: isDark ? '#111827' : '#E5E7EB',
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    height: 80,
  } as const;

  const tabBarLabelStyle = {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 4,
  } as const;

  const textColor = colors.text;
  const cardBg = colors.surface;
  const cardBorder = isDark ? '#1F2937' : '#E5E7EB';

  const AnimatedMenuItem = ({
    icon,
    label,
    color,
    onPress,
  }: {
    icon: React.ReactNode;
    label: string;
    color: string;
    onPress: () => void;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.sidebarItem,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
            {icon}
          </View>
          <Text style={[styles.sidebarText, { color: textColor }]}>
            {label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <OrganizationRequiredModal />
      {showMore && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
                opacity: overlayOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeMore}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidebar,
              {
                backgroundColor: colors.background,
                borderLeftColor: isDark ? '#374151' : '#E5E7EB',
                transform: [{ translateX: sidebarAnim }],
                width: sidebarWidth,
                shadowColor: '#000',
                shadowOffset: { width: -4, height: 0 },
                shadowOpacity: isDark ? 0.5 : 0.15,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}
          >
            {/* Header with Logo, Notification Bell and Close Button */}
            <View style={styles.sidebarHeader}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View>
                  <Text style={[styles.appName, { color: textColor }]}>
                    NexaSuit
                  </Text>
                  <Text
                    style={[styles.appTagline, { color: colors.textSecondary }]}
                  >
                    Business CRM
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <NotificationBell
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/notifications');
                  }}
                />
                <TouchableOpacity
                  onPress={closeMore}
                  style={[
                    styles.closeButton,
                    { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
                  ]}
                >
                  <X size={20} color={textColor} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
              ]}
            />

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.sidebarGroup}>
                <AnimatedMenuItem
                  icon={<UserIcon size={20} color="#10B981" />}
                  label="Profile"
                  color="#10B981"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/profile');
                  }}
                />
                <AnimatedMenuItem
                  icon={<Building2 size={20} color="#8B5CF6" />}
                  label="Organizations"
                  color="#8B5CF6"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/organizations');
                  }}
                />
                <AnimatedMenuItem
                  icon={<Phone size={20} color="#3B82F6" />}
                  label="Meetings"
                  color="#3B82F6"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/meetings');
                  }}
                />
                <AnimatedMenuItem
                  icon={<Mail size={20} color="#F59E0B" />}
                  label="Emails"
                  color="#F59E0B"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/emails');
                  }}
                />
                <AnimatedMenuItem
                  icon={<Calendar size={20} color="#6366F1" />}
                  label="Calendar"
                  color="#6366F1"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/calendar');
                  }}
                />
              </View>

              {/* Section Divider */}
              <View style={styles.sectionDivider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                  ]}
                />
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  TOOLS
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                  ]}
                />
              </View>

              <View style={styles.sidebarGroup}>
                {/* <AnimatedMenuItem
                  icon={<NotepadTextDashed size={20} color="#6366F1" />}
                  label="Task Templates"
                  color="#6366F1"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/task-templates');
                  }}
                /> */}
                <AnimatedMenuItem
                  icon={
                    <Ionicons name="git-network" size={20} color="#8B5CF6" />
                  }
                  label="Dependencies"
                  color="#8B5CF6"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/dependency-graph');
                  }}
                />
                {/* <AnimatedMenuItem
                  icon={<Ionicons name="flash" size={20} color="#EC4899" />}
                  label="Automation"
                  color="#EC4899"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/task-automation');
                  }}
                /> */}
              </View>

              {/* Section Divider */}
              <View style={styles.sectionDivider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                  ]}
                />
                <Text
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  ACCOUNT
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
                  ]}
                />
              </View>

              <View style={styles.sidebarGroup}>
                <AnimatedMenuItem
                  icon={<Settings size={20} color="#6366F1" />}
                  label="Settings"
                  color="#6366F1"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/settings');
                  }}
                />
                <AnimatedMenuItem
                  icon={<Ionicons name="diamond" size={20} color="#F59E0B" />}
                  label="Subscription"
                  color="#F59E0B"
                  onPress={() => {
                    closeMore();
                    router.push('/(tabs)/subscription');
                  }}
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarLabelStyle,
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => (
              <Home size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Projects',
            tabBarIcon: ({ size, color }) => (
              <CheckSquare size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="leads"
          options={{
            title: 'Leads',
            tabBarIcon: ({ size, color }) => (
              <Target size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ size, color }) => (
              <Users size={size} color={color} strokeWidth={2} />
            ),
          }}
        />
        {/* More button tab */}
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarButton: ({ accessibilityState }) => {
              const selected = accessibilityState?.selected;
              return (
                <TouchableOpacity
                  onPress={() => setShowMore(true)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Menu
                    size={22}
                    color={
                      selected ? '#10B981' : isDark ? '#9CA3AF' : '#6B7280'
                    }
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      color: textColor,
                    }}
                  >
                    More
                  </Text>
                </TouchableOpacity>
              );
            },
          }}
        />
        {/* Hidden screens accessed from sidebar */}
        <Tabs.Screen name="project-detail" options={{ href: null }} />
        <Tabs.Screen name="tasks" options={{ href: null }} />
        <Tabs.Screen name="meetings" options={{ href: null }} />
        <Tabs.Screen name="emails" options={{ href: null }} />
        <Tabs.Screen name="emails-analytics" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="emails-inbox" options={{ href: null }} />
        <Tabs.Screen name="email-drafts" options={{ href: null }} />
        <Tabs.Screen name="email-signatures" options={{ href: null }} />
        <Tabs.Screen name="email-sequences" options={{ href: null }} />
        <Tabs.Screen name="email-sequence-analytics" options={{ href: null }} />
        <Tabs.Screen name="email-deliverability" options={{ href: null }} />
        <Tabs.Screen name="email-suppression" options={{ href: null }} />
        <Tabs.Screen name="emails-search" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="templates" options={{ href: null }} />
        <Tabs.Screen name="subscription" options={{ href: null }} />
        <Tabs.Screen name="task-board" options={{ href: null }} />
        <Tabs.Screen name="task-detail" options={{ href: null }} />
        <Tabs.Screen name="task-analytics" options={{ href: null }} />
        <Tabs.Screen name="task-templates" options={{ href: null }} />
        <Tabs.Screen name="dependency-graph" options={{ href: null }} />
        <Tabs.Screen name="task-automation" options={{ href: null }} />
        <Tabs.Screen name="organizations" options={{ href: null }} />
        <Tabs.Screen name="organization-detail" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    borderLeftWidth: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sidebarText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sidebarGroup: {
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: 12,
  },
});
