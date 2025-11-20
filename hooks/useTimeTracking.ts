import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TimeEntry,
  TaskRecord,
  DateRange,
  TimeTrackingMetrics,
} from '@/types/task-management';

const timeTrackingKeys = {
  all: ['time-tracking'] as const,
  entries: (userId?: string) =>
    [...timeTrackingKeys.all, 'entries', userId] as const,
  byTask: (taskId: string) =>
    [...timeTrackingKeys.all, 'task', taskId] as const,
  active: (userId?: string) =>
    [...timeTrackingKeys.all, 'active', userId] as const,
  reports: (userId?: string, dateRange?: DateRange) =>
    [...timeTrackingKeys.all, 'reports', userId, dateRange] as const,
};

// Interface for active timer state
export interface ActiveTimer {
  id: string;
  task_id: string;
  start_time: string;
  elapsed_seconds: number;
  task_title: string;
  task_priority: TaskRecord['priority'];
}

// Interface for time tracking statistics
export interface TimeTrackingStats {
  total_time_today: number; // in minutes
  total_time_week: number;
  total_time_month: number;
  average_session_length: number;
  most_productive_hour: number;
  tasks_with_time: number;
  total_tasks: number;
}

// Hook to get all time entries for a user
export function useTimeEntries(dateRange?: DateRange) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: timeTrackingKeys.entries(userId),
    queryFn: async (): Promise<TimeEntry[]> => {
      if (!userId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      let query = supabase
        .from('time_entries')
        .select(
          `
          *,
          task:tasks(id, title, priority, status, client_id, clients(name, company))
        `
        )
        .eq('user_id', profile?.id)
        .order('start_time', { ascending: false });

      // Apply date range filter if provided
      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start)
          .lte('start_time', dateRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []) as TimeEntry[];
    },
    enabled: !!userId,
  });
}

// Hook to get time entries for a specific task
export function useTaskTimeEntries(taskId: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: timeTrackingKeys.byTask(taskId),
    queryFn: async (): Promise<TimeEntry[]> => {
      if (!userId || !taskId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', profile?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return (data ?? []) as TimeEntry[];
    },
    enabled: !!userId && !!taskId,
  });
}

// Hook to get active timer
export function useActiveTimer() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: timeTrackingKeys.active(userId),
    queryFn: async (): Promise<ActiveTimer | null> => {
      if (!userId) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const { data, error } = await supabase
        .from('time_entries')
        .select(
          `
          *,
          task:tasks(id, title, priority)
        `
        )
        .eq('user_id', profile?.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No active timer
        throw error;
      }

      if (!data) return null;

      const startTime = new Date(data.start_time);
      const now = new Date();
      const elapsedSeconds = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );

      return {
        id: data.id,
        task_id: data.task_id,
        start_time: data.start_time,
        elapsed_seconds: elapsedSeconds,
        task_title: (data.task as any)?.title || 'Unknown Task',
        task_priority: (data.task as any)?.priority || 'medium',
      };
    },
    enabled: !!userId,
    refetchInterval: 1000, // Update every second for real-time display
  });
}

// Start a timer for a task
export function useStartTimer() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string): Promise<TimeEntry> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Check if there's already an active timer
      const { data: activeTimer } = await supabase
        .from('time_entries')
        .select('id, task_id')
        .eq('user_id', profile?.id)
        .is('end_time', null)
        .single();

      if (activeTimer) {
        throw new Error(
          `Timer is already running for another task. Please stop the current timer first.`
        );
      }

      // Check for incomplete task dependencies
      const { data: dependencies, error: depsError } = await supabase
        .from('task_dependencies')
        .select(
          `
          depends_on_task:tasks!depends_on_task_id(
            id, title, status
          )
        `
        )
        .eq('task_id', taskId);

      if (depsError) throw depsError;

      if (dependencies && dependencies.length > 0) {
        const incompleteDeps = (dependencies as any[])
          .map((dep) => dep.depends_on_task)
          .filter((task) => task && task.status !== 'completed');

        if (incompleteDeps.length > 0) {
          const depTitles = incompleteDeps
            .map((task) => `"${task.title}"`)
            .join(', ');
          throw new Error(
            `Cannot start timer. This task depends on ${
              incompleteDeps.length
            } incomplete ${
              incompleteDeps.length === 1 ? 'task' : 'tasks'
            }: ${depTitles}. Please complete ${
              incompleteDeps.length === 1 ? 'it' : 'them'
            } first.`
          );
        }
      }

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: profile?.id,
          start_time: new Date().toISOString(),
          is_manual: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.active() });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.entries() });
    },
  });
}

// Stop the active timer
export function useStopTimer() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: {
      description?: string;
    }): Promise<TimeEntry> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Get the active timer
      const { data: activeTimer, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', profile?.id)
        .is('end_time', null)
        .single();

      if (fetchError || !activeTimer) {
        throw new Error('No active timer found');
      }

      const endTime = new Date();
      const startTime = new Date(activeTimer.start_time);
      const durationMinutes = Math.max(
        1,
        Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      );

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          description: payload?.description || null,
        })
        .eq('id', activeTimer.id)
        .select()
        .single();

      if (error) throw error;

      // Update task's actual hours
      await updateTaskActualHours(activeTimer.task_id);

      return data as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.active() });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Pause the active timer (stop without description)
export function usePauseTimer() {
  const stopTimer = useStopTimer();

  return useMutation({
    mutationFn: async () => {
      return stopTimer.mutateAsync({});
    },
  });
}

// Create a manual time entry
export function useCreateManualTimeEntry() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      start_time: string;
      end_time: string;
      description?: string;
    }): Promise<TimeEntry> => {
      if (!userId) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      const startTime = new Date(payload.start_time);
      const endTime = new Date(payload.end_time);

      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      const durationMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60)
      );

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: payload.task_id,
          user_id: profile?.id,
          start_time: payload.start_time,
          end_time: payload.end_time,
          duration_minutes: durationMinutes,
          description: payload.description || null,
          is_manual: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update task's actual hours
      await updateTaskActualHours(payload.task_id);

      return data as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Update a time entry
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      start_time?: string;
      end_time?: string;
      description?: string;
    }): Promise<TimeEntry> => {
      const { id, ...updateData } = payload;

      // Recalculate duration if times are updated
      if (updateData.start_time || updateData.end_time) {
        const { data: currentEntry } = await supabase
          .from('time_entries')
          .select('start_time, end_time')
          .eq('id', id)
          .single();

        if (currentEntry) {
          const startTime = new Date(
            updateData.start_time || currentEntry.start_time
          );
          const endTime = new Date(
            updateData.end_time || currentEntry.end_time
          );

          if (endTime && endTime > startTime) {
            (updateData as any).duration_minutes = Math.round(
              (endTime.getTime() - startTime.getTime()) / (1000 * 60)
            );
          }
        }
      }

      const { data, error } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update task's actual hours
      await updateTaskActualHours(data.task_id);

      return data as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Delete a time entry
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; task_id: string }) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', payload.id);

      if (error) throw error;

      // Update task's actual hours
      await updateTaskActualHours(payload.task_id);

      return payload.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Get time tracking statistics
export function useTimeTrackingStats(dateRange?: DateRange) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: timeTrackingKeys.reports(userId, dateRange),
    queryFn: async (): Promise<TimeTrackingStats> => {
      if (!userId) {
        return {
          total_time_today: 0,
          total_time_week: 0,
          total_time_month: 0,
          average_session_length: 0,
          most_productive_hour: 9,
          tasks_with_time: 0,
          total_tasks: 0,
        };
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Get time entries for different periods
      const [todayEntries, weekEntries, monthEntries, allEntries] =
        await Promise.all([
          // Today
          supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('user_id', profile?.id)
            .gte('start_time', today.toISOString())
            .not('duration_minutes', 'is', null),

          // This week
          supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('user_id', profile?.id)
            .gte('start_time', weekStart.toISOString())
            .not('duration_minutes', 'is', null),

          // This month
          supabase
            .from('time_entries')
            .select('duration_minutes')
            .eq('user_id', profile?.id)
            .gte('start_time', monthStart.toISOString())
            .not('duration_minutes', 'is', null),

          // All entries for averages and productivity analysis
          supabase
            .from('time_entries')
            .select('duration_minutes, start_time')
            .eq('user_id', profile?.id)
            .not('duration_minutes', 'is', null),
        ]);

      // Calculate totals
      const totalTimeToday = (todayEntries.data ?? []).reduce(
        (sum, entry) => sum + (entry.duration_minutes || 0),
        0
      );

      const totalTimeWeek = (weekEntries.data ?? []).reduce(
        (sum, entry) => sum + (entry.duration_minutes || 0),
        0
      );

      const totalTimeMonth = (monthEntries.data ?? []).reduce(
        (sum, entry) => sum + (entry.duration_minutes || 0),
        0
      );

      // Calculate average session length
      const allDurations = (allEntries.data ?? [])
        .map((entry) => entry.duration_minutes || 0)
        .filter((duration) => duration > 0);

      const averageSessionLength =
        allDurations.length > 0
          ? Math.round(
              allDurations.reduce((sum, duration) => sum + duration, 0) /
                allDurations.length
            )
          : 0;

      // Find most productive hour
      const hourCounts = new Array(24).fill(0);
      (allEntries.data ?? []).forEach((entry) => {
        if (entry.start_time && entry.duration_minutes) {
          const hour = new Date(entry.start_time).getHours();
          hourCounts[hour] += entry.duration_minutes;
        }
      });

      const mostProductiveHour = hourCounts.indexOf(Math.max(...hourCounts));

      // Get task counts
      const { data: tasksWithTime } = await supabase
        .from('time_entries')
        .select('task_id')
        .eq('user_id', profile?.id)
        .not('duration_minutes', 'is', null);

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', profile?.id);

      const uniqueTasksWithTime = new Set(
        (tasksWithTime ?? []).map((entry) => entry.task_id)
      ).size;

      return {
        total_time_today: totalTimeToday,
        total_time_week: totalTimeWeek,
        total_time_month: totalTimeMonth,
        average_session_length: averageSessionLength,
        most_productive_hour: mostProductiveHour,
        tasks_with_time: uniqueTasksWithTime,
        total_tasks: (allTasks ?? []).length,
      };
    },
    enabled: !!userId,
  });
}

// Get detailed time tracking metrics
export function useTimeTrackingMetrics(dateRange: DateRange) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [
      ...timeTrackingKeys.reports(userId, dateRange),
      'detailed',
    ] as const,
    queryFn: async (): Promise<TimeTrackingMetrics> => {
      if (!userId) {
        return {
          totalTimeTracked: 0,
          averageTimePerTask: 0,
          timeByPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
          timeByStatus: {
            pending: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
            blocked: 0,
          },
          timeByTag: {},
          estimationAccuracy: 0,
        };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      // Get time entries with task details
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select(
          `
          duration_minutes,
          task:tasks(priority, status, tag, estimated_hours, actual_hours)
        `
        )
        .eq('user_id', profile?.id)
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end)
        .not('duration_minutes', 'is', null);

      if (error) throw error;

      const entries = timeEntries ?? [];
      const totalTimeTracked = entries.reduce(
        (sum, entry) => sum + (entry.duration_minutes || 0),
        0
      );

      // Calculate metrics
      const timeByPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
      const timeByStatus = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        blocked: 0,
      };
      const timeByTag: Record<string, number> = {};

      let totalEstimatedHours = 0;
      let totalActualHours = 0;
      let tasksWithEstimates = 0;

      entries.forEach((entry) => {
        const task = entry.task as any;
        const minutes = entry.duration_minutes || 0;

        if (task) {
          // Time by priority
          timeByPriority[task.priority as keyof typeof timeByPriority] +=
            minutes;

          // Time by status
          timeByStatus[task.status as keyof typeof timeByStatus] += minutes;

          // Time by tag
          if (task.tag) {
            timeByTag[task.tag] = (timeByTag[task.tag] || 0) + minutes;
          }

          // Estimation accuracy
          if (task.estimated_hours && task.actual_hours) {
            totalEstimatedHours += task.estimated_hours;
            totalActualHours += task.actual_hours;
            tasksWithEstimates++;
          }
        }
      });

      const uniqueTasks = new Set(
        entries.map((entry) => (entry.task as any)?.id)
      ).size;
      const averageTimePerTask =
        uniqueTasks > 0 ? totalTimeTracked / uniqueTasks : 0;

      const estimationAccuracy =
        tasksWithEstimates > 0 && totalEstimatedHours > 0
          ? Math.round(
              (1 -
                Math.abs(totalActualHours - totalEstimatedHours) /
                  totalEstimatedHours) *
                100
            )
          : 0;

      return {
        totalTimeTracked,
        averageTimePerTask,
        timeByPriority,
        timeByStatus,
        timeByTag,
        estimationAccuracy,
      };
    },
    enabled: !!userId,
  });
}

// Utility function to update task's actual hours
async function updateTaskActualHours(taskId: string) {
  try {
    // Get total time for this task
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('duration_minutes')
      .eq('task_id', taskId)
      .not('duration_minutes', 'is', null);

    const totalMinutes = (timeEntries ?? []).reduce(
      (sum, entry) => sum + (entry.duration_minutes || 0),
      0
    );

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimal places

    // Update task's actual hours
    await supabase
      .from('tasks')
      .update({ actual_hours: totalHours })
      .eq('id', taskId);
  } catch (error) {
    console.error('Error updating task actual hours:', error);
  }
}

// Hook for real-time timer display
export function useTimerDisplay() {
  const { data: activeTimer } = useActiveTimer();
  const [displayTime, setDisplayTime] = React.useState(0);

  React.useEffect(() => {
    if (!activeTimer) {
      setDisplayTime(0);
      return;
    }

    const updateDisplay = () => {
      const startTime = new Date(activeTimer.start_time);
      const now = new Date();
      const elapsedSeconds = Math.floor(
        (now.getTime() - startTime.getTime()) / 1000
      );
      setDisplayTime(elapsedSeconds);
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    activeTimer,
    displayTime,
    formattedTime: formatTime(displayTime),
    isRunning: !!activeTimer,
  };
}
