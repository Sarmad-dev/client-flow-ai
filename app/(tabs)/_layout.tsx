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
  NotepadTextDashed,
  Calendar,
} from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Animated, Easing } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { session, loading } = useAuth();
  const { colors, isDark } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const sidebarWidth = 280;
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  useEffect(() => {
    if (showMore) {
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showMore, sidebarAnim]);

  const closeMore = () => {
    Animated.timing(sidebarAnim, {
      toValue: -sidebarWidth,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setShowMore(false));
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

  return (
    <>
      {showMore && (
        <View
          style={[
            styles.overlay,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
          ]}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeMore}
          />
          <Animated.View
            style={[
              styles.sidebar,
              {
                backgroundColor: colors.background,
                borderRightColor: isDark ? '#374151' : '#E5E7EB',
                transform: [{ translateX: sidebarAnim }],
                width: sidebarWidth,
              },
            ]}
          >
            <Text style={[styles.sidebarTitle, { color: textColor }]}>
              More
            </Text>
            <View style={styles.sidebarGroup}>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/profile');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#10B98120' }]}
                >
                  <UserIcon size={18} color={'#10B981'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/meetings');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#3B82F620' }]}
                >
                  <Phone size={18} color={'#3B82F6'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Meetings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/emails');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}
                >
                  <Mail size={18} color={'#F59E0B'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Emails
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/settings');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#6366F120' }]}
                >
                  <Settings size={18} color={'#6366F1'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/task-templates');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#6366F120' }]}
                >
                  <NotepadTextDashed size={18} color={'#6366F1'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Task Templates
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/dependency-graph');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#8B5CF620' }]}
                >
                  <Ionicons name="git-network" size={18} color={'#8B5CF6'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Dependencies
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/task-automation');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#EC489920' }]}
                >
                  <Ionicons name="flash" size={18} color={'#EC4899'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Automation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/calendar');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#6366F120' }]}
                >
                  <Calendar size={18} color={'#6366F1'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Calendar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
                onPress={() => {
                  closeMore();
                  router.push('/(tabs)/subscription');
                }}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}
                >
                  <Ionicons name="diamond" size={18} color={'#F59E0B'} />
                </View>
                <Text style={[styles.sidebarText, { color: textColor }]}>
                  Subscription
                </Text>
              </TouchableOpacity>
            </View>
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
          name="tasks"
          options={{
            title: 'Tasks',
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
        <Tabs.Screen name="meetings" options={{ href: null }} />
        <Tabs.Screen name="emails" options={{ href: null }} />
        <Tabs.Screen name="emails-analytics" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="emails-inbox" options={{ href: null }} />
        <Tabs.Screen name="email-drafts" options={{ href: null }} />
        <Tabs.Screen name="email-signatures" options={{ href: null }} />
        <Tabs.Screen name="email-sequences" options={{ href: null }} />
        <Tabs.Screen name="email-sequence-analytics" options={{ href: null }} />
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
    width: 280,
    paddingTop: 60,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
  },
  sidebarTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sidebarText: { fontSize: 16, fontWeight: '600' },
  sidebarGroup: {
    gap: 8,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
