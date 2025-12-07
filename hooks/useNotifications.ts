import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Notification,
  NotificationPreferences,
} from '@/types/organization';
import { useEffect, useState } from 'react';
import { Profile } from './useProfile';

export function useNotifications() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getProfile = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setProfile(profiles);
    };

    getProfile();
  }, [user?.id]);

  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile!.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const getProfile = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setProfile(profiles);
    };

    getProfile();
  }, [user?.id]);

  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as NotificationPreferences | null;
    },
    enabled: !!user,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: profile!.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
  };
}
