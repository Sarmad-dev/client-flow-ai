import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ScheduledEmail {
  id: string;
  user_id: string;
  client_id: string | null;
  lead_id: string | null;
  recipient_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  scheduled_at: string;
  is_scheduled: boolean;
  signature_used: string | null;
  created_at: string;
}

/**
 * Hook to fetch all scheduled emails for the current user
 */
export function useScheduledEmails() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scheduled-emails', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as ScheduledEmail[];

      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ScheduledEmail[];
    },
  });
}

/**
 * Hook to fetch pending scheduled emails (not yet sent)
 */
export function usePendingScheduledEmails() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-scheduled-emails', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as ScheduledEmail[];

      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .eq('status', 'scheduled')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ScheduledEmail[];
    },
  });
}

/**
 * Hook to schedule an email for future delivery
 */
export function useScheduleEmail() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      to: string;
      subject: string;
      html?: string;
      text?: string;
      scheduled_at: string; // ISO timestamp
      client_id?: string | null;
      lead_id?: string | null;
      signature_used?: string | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate scheduled_at is in the future
      const scheduledDate = new Date(payload.scheduled_at);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Scheduled time must be in the future');
      }

      // Create the scheduled email record in the database
      const { data, error } = await supabase
        .from('email_communications')
        .insert({
          user_id: user.id,
          recipient_email: payload.to,
          subject: payload.subject,
          body_html: payload.html,
          body_text: payload.text,
          scheduled_at: payload.scheduled_at,
          is_scheduled: true,
          status: 'scheduled',
          direction: 'sent',
          client_id: payload.client_id,
          lead_id: payload.lead_id,
          signature_used: payload.signature_used,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ScheduledEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['pending-scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['recent-emails'] });
    },
  });
}

/**
 * Hook to update a scheduled email
 */
export function useUpdateScheduledEmail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
      scheduled_at?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate scheduled_at is in the future if provided
      if (payload.scheduled_at) {
        const scheduledDate = new Date(payload.scheduled_at);
        const now = new Date();
        if (scheduledDate <= now) {
          throw new Error('Scheduled time must be in the future');
        }
      }

      const updateData: any = {};
      if (payload.to !== undefined) updateData.recipient_email = payload.to;
      if (payload.subject !== undefined) updateData.subject = payload.subject;
      if (payload.html !== undefined) updateData.body_html = payload.html;
      if (payload.text !== undefined) updateData.body_text = payload.text;
      if (payload.scheduled_at !== undefined)
        updateData.scheduled_at = payload.scheduled_at;

      const { data, error } = await supabase
        .from('email_communications')
        .update(updateData)
        .eq('id', payload.id)
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .select()
        .single();

      if (error) throw error;
      return data as ScheduledEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['pending-scheduled-emails'] });
    },
  });
}

/**
 * Hook to cancel a scheduled email
 */
export function useCancelScheduledEmail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('email_communications')
        .delete()
        .eq('id', emailId)
        .eq('user_id', user.id)
        .eq('status', 'scheduled');

      if (error) throw error;
      return { id: emailId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['pending-scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['recent-emails'] });
    },
  });
}

/**
 * Hook to get a single scheduled email by ID
 */
export function useScheduledEmail(emailId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scheduled-email', emailId, user?.id],
    enabled: !!user?.id && !!emailId,
    queryFn: async () => {
      if (!user?.id || !emailId) return null;

      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('id', emailId)
        .eq('user_id', user.id)
        .eq('is_scheduled', true)
        .single();

      if (error) throw error;
      return data as ScheduledEmail;
    },
  });
}
