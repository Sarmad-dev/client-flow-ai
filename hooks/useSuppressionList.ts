import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SuppressionListEntry {
  id: string;
  user_id: string;
  email: string;
  reason: string | null;
  created_at: string;
}

/**
 * Hook to fetch the suppression list
 */
export function useSuppressionList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suppression-list', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as SuppressionListEntry[];

      const { data, error } = await supabase
        .from('suppression_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SuppressionListEntry[];
    },
  });
}

/**
 * Hook to check if an email is suppressed
 */
export function useIsEmailSuppressed(email?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-email-suppressed', user?.id, email?.toLowerCase()],
    enabled: !!user?.id && !!email,
    queryFn: async () => {
      if (!user?.id || !email) return false;

      const { data, error } = await supabase
        .from('suppression_list')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
  });
}

/**
 * Hook to add an email to the suppression list
 */
export function useAddToSuppressionList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        throw new Error('Invalid email format');
      }

      const { data, error } = await supabase
        .from('suppression_list')
        .insert({
          user_id: user.id,
          email: payload.email.toLowerCase(),
          reason: payload.reason || 'manual',
        })
        .select()
        .single();

      if (error) {
        // Check for duplicate entry
        if (error.code === '23505') {
          throw new Error('Email is already in suppression list');
        }
        throw error;
      }

      return data as SuppressionListEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppression-list'] });
      queryClient.invalidateQueries({ queryKey: ['is-email-suppressed'] });
    },
  });
}

/**
 * Hook to remove an email from the suppression list
 */
export function useRemoveFromSuppressionList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suppressionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('suppression_list')
        .delete()
        .eq('id', suppressionId)
        .eq('user_id', user.id);

      if (error) throw error;

      return suppressionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppression-list'] });
      queryClient.invalidateQueries({ queryKey: ['is-email-suppressed'] });
    },
  });
}

/**
 * Hook to bulk add emails to suppression list
 */
export function useBulkAddToSuppressionList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { emails: string[]; reason?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate all emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = payload.emails.filter(
        (email) => !emailRegex.test(email)
      );

      if (invalidEmails.length > 0) {
        throw new Error(`Invalid email format: ${invalidEmails.join(', ')}`);
      }

      // Prepare entries
      const entries = payload.emails.map((email) => ({
        user_id: user.id,
        email: email.toLowerCase(),
        reason: payload.reason || 'manual',
      }));

      const { data, error } = await supabase
        .from('suppression_list')
        .upsert(entries, { onConflict: 'user_id,email' })
        .select();

      if (error) throw error;

      return data as SuppressionListEntry[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppression-list'] });
      queryClient.invalidateQueries({ queryKey: ['is-email-suppressed'] });
    },
  });
}

/**
 * Hook to get suppression statistics
 */
export function useSuppressionStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suppression-stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('suppression_list')
        .select('reason')
        .eq('user_id', user.id);

      if (error) throw error;

      const total = data?.length || 0;
      const byReason: Record<string, number> = {};

      for (const entry of data || []) {
        const reason = entry.reason || 'unknown';
        byReason[reason] = (byReason[reason] || 0) + 1;
      }

      return {
        total,
        hardBounces: byReason.hard_bounce || 0,
        unsubscribes: byReason.unsubscribe || 0,
        spamComplaints: byReason.spam_complaint || 0,
        manual: byReason.manual || 0,
        byReason,
      };
    },
  });
}
