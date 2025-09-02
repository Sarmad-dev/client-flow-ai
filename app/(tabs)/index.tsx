import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Plus, Bell, Users, Calendar } from 'lucide-react-native';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { QuickStats } from '@/components/QuickStats';
import { RecentActivity } from '@/components/RecentActivity';
import { useTheme } from '@/hooks/useTheme';
import { ClientForm } from '@/components/ClientForm';
import { MeetingForm } from '@/components/MeetingForm';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClients } from '@/hooks/useClients';
import { TaskCreateModal } from '@/components/tasks/TaskCreateModal';

export default function HomeScreen() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const { colors } = useTheme();
  const { data: clientRecords = [] } = useClients();

  const formClients = clientRecords.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company ?? '',
  }));

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'task':
        setShowTaskForm(true);
        break;
      case 'client':
        setShowClientForm(true);
        break;
      case 'meeting':
        setShowMeetingForm(true);
        break;
      default:
        break;
    }
  };

  const quickActions = [
    { icon: Plus, title: 'Quick Task', color: colors.primary, action: 'task' },
    {
      icon: Users,
      title: 'Add Client',
      color: colors.secondary,
      action: 'client',
    },
    {
      icon: Calendar,
      title: 'Schedule',
      color: colors.accent,
      action: 'meeting',
    },
    { icon: Bell, title: 'Reminders', color: colors.warning },
  ];

  return (
    <>
      {/* Forms - Outside ScrollView */}
      <TaskCreateModal
        visible={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onCreated={(task) => {
          console.log('Task created from home screen:', task);
          setShowTaskForm(false);
        }}
      />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                Good morning
              </Text>
              <Text style={[styles.welcomeText, { color: colors.text }]}>
                Ready to boost your productivity?
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.notificationButton,
                { backgroundColor: colors.surface },
              ]}
            >
              <Bell size={20} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Voice Recorder */}
          <VoiceRecorder
            onTaskCreated={(task) => {
              console.log('Task created from voice:', task);
              // Optionally refresh tasks or show success message
            }}
          />

          {/* Quick Stats */}
          <QuickStats />

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickActionCard,
                    { backgroundColor: colors.surface },
                  ]}
                  onPress={() =>
                    action.action ? handleQuickAction(action.action) : undefined
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.quickActionIcon,
                      { backgroundColor: `${action.color}15` },
                    ]}
                  >
                    <action.icon
                      size={24}
                      color={action.color}
                      strokeWidth={2}
                    />
                  </View>
                  <Text
                    style={[styles.quickActionText, { color: colors.text }]}
                  >
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <RecentActivity />
        </ScrollView>
      </SafeAreaView>

      <ClientForm
        visible={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSubmit={(client) => console.log('Client created:', client)}
      />

      <MeetingForm
        visible={showMeetingForm}
        onClose={() => setShowMeetingForm(false)}
        onSubmit={(meeting) => console.log('Meeting created:', meeting)}
        clients={formClients}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingRight: 64,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '400',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
