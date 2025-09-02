import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  SquareCheck as CheckSquare,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTasks } from '@/hooks/useTasks';
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';

export function QuickStats() {
  const { colors } = useTheme();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: leads = [], isLoading: leadsLoading } = useLeads();

  const { completedCount, pendingCount, clientsCount, thisWeekNewLeads } =
    useMemo(() => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      const day = startOfWeek.getDay();
      const diff = (day + 6) % 7; // make Monday start
      startOfWeek.setDate(startOfWeek.getDate() - diff);

      const completedCountVal = tasks.filter(
        (t) => t.status === 'completed'
      ).length;
      const pendingCountVal = tasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'cancelled'
      ).length;
      const clientsCountVal = clients.length;
      const thisWeekNewLeadsVal = leads.filter(
        (l) => new Date(l.created_at) >= startOfWeek
      ).length;

      return {
        completedCount: completedCountVal,
        pendingCount: pendingCountVal,
        clientsCount: clientsCountVal,
        thisWeekNewLeads: thisWeekNewLeadsVal,
      };
    }, [tasks, clients, leads]);

  const stats = [
    {
      icon: CheckSquare,
      title: 'Completed',
      value: tasksLoading ? '...' : String(completedCount),
      color: colors.success,
    },
    {
      icon: Clock,
      title: 'Pending',
      value: tasksLoading ? '...' : String(pendingCount),
      color: colors.warning,
    },
    {
      icon: Users,
      title: 'Clients',
      value: clientsLoading ? '...' : String(clientsCount),
      color: colors.secondary,
    },
    {
      icon: TrendingUp,
      title: 'This Week',
      value: leadsLoading ? '...' : `+${thisWeekNewLeads}`,
      color: colors.primary,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Overview</Text>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[styles.statCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}
            >
              <stat.icon size={20} color={stat.color} strokeWidth={2} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              {stat.title}
            </Text>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
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
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
