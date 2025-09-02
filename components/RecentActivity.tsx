import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CircleCheck as CheckCircle2,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasks';
import { useLeads } from '@/hooks/useLeads';

type ActivityItem = {
  id: string;
  icon: any;
  title: string;
  time: string;
  color: string;
};

export function RecentActivity() {
  const { colors } = useTheme();
  const { data: tasks = [] } = useTasks();
  const { data: leads = [] } = useLeads();

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Recent completed tasks
    tasks
      .filter((t) => t.status === 'completed')
      .slice(0, 5)
      .forEach((t) => {
        items.push({
          id: `task-${t.id}`,
          icon: CheckCircle2,
          title: `Completed: ${t.title}`,
          time: new Date(t.updated_at || t.created_at).toLocaleString(),
          color: colors.success,
        });
      });

    // Recent lead interactions (basic: new leads)
    leads.slice(0, 5).forEach((l) => {
      items.push({
        id: `lead-${l.id}`,
        icon: Calendar,
        title: `New lead: ${l.company || l.name}`,
        time: new Date(l.created_at).toLocaleString(),
        color: colors.primary,
      });
    });

    // Sort by time desc
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [tasks, leads, colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Recent Activity
        </Text>
        <TouchableOpacity>
          <Text style={[styles.viewAll, { color: colors.primary }]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.activityList, { backgroundColor: colors.surface }]}>
        {activities.map((activity, index) => (
          <View
            key={activity.id}
            style={[
              styles.activityItem,
              index !== activities.length - 1 && {
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
              },
            ]}
          >
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: `${activity.color}15` },
              ]}
            >
              <activity.icon size={16} color={activity.color} strokeWidth={2} />
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>
                {activity.title}
              </Text>
              <Text
                style={[styles.activityTime, { color: colors.textSecondary }]}
              >
                {activity.time}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityList: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
});
