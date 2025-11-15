import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SequenceEnrollment {
  id: string;
  user_id: string;
  sequence_id: string;
  contact_email: string;
  client_id: string | null;
  lead_id: string | null;
  current_step: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  enrolled_at: string;
  completed_at: string | null;
  last_email_sent_at: string | null;
  next_email_scheduled_at: string | null;
}

export interface SequenceEnrollmentWithDetails extends SequenceEnrollment {
  sequence_name?: string;
  contact_name?: string;
  total_steps?: number;
}

// Fetch all enrollments for the current user
export function useSequenceEnrollments(sequenceId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sequence-enrollments', user?.id, sequenceId],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from('sequence_enrollments')
        .select('*')
        .eq('user_id', user!.id);

      if (sequenceId) {
        query = query.eq('sequence_id', sequenceId);
      }

      const { data, error } = await query.order('enrolled_at', {
        ascending: false,
      });

      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
  });
}

// Fetch enrollments with additional details (sequence name, contact name)
export function useSequenceEnrollmentsWithDetails(sequenceId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sequence-enrollments-details', user?.id, sequenceId],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase
        .from('sequence_enrollments')
        .select(
          `
          *,
          email_sequences!inner(name),
          clients(name),
          leads(name)
        `
        )
        .eq('user_id', user!.id);

      if (sequenceId) {
        query = query.eq('sequence_id', sequenceId);
      }

      const { data, error } = await query.order('enrolled_at', {
        ascending: false,
      });

      if (error) throw error;

      // Fetch step counts for each sequence
      const sequenceIds = [
        ...new Set(data?.map((e: any) => e.sequence_id) || []),
      ];
      const stepCounts = new Map<string, number>();

      if (sequenceIds.length > 0) {
        const { data: steps, error: stepsError } = await supabase
          .from('sequence_steps')
          .select('sequence_id')
          .in('sequence_id', sequenceIds);

        if (!stepsError && steps) {
          steps.forEach((step: any) => {
            const count = stepCounts.get(step.sequence_id) || 0;
            stepCounts.set(step.sequence_id, count + 1);
          });
        }
      }

      return (data || []).map((enrollment: any) => ({
        ...enrollment,
        sequence_name: enrollment.email_sequences?.name || null,
        contact_name:
          enrollment.clients?.name || enrollment.leads?.name || null,
        total_steps: stepCounts.get(enrollment.sequence_id) || 0,
      })) as SequenceEnrollmentWithDetails[];
    },
  });
}

// Fetch active enrollments (for processing)
export function useActiveSequenceEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sequence-enrollments', 'active', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('next_email_scheduled_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
  });
}

// Fetch enrollments due for sending
export function useDueSequenceEnrollments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sequence-enrollments', 'due', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .not('next_email_scheduled_at', 'is', null)
        .lte('next_email_scheduled_at', now)
        .order('next_email_scheduled_at', { ascending: true });

      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
  });
}

// Get enrollment statistics for a sequence
export function useSequenceEnrollmentStats(sequenceId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sequence-enrollment-stats', sequenceId],
    enabled: !!user?.id && !!sequenceId,
    queryFn: async () => {
      if (!sequenceId) return null;

      const { data, error } = await supabase
        .from('sequence_enrollments')
        .select('status')
        .eq('sequence_id', sequenceId)
        .eq('user_id', user!.id);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        active: data?.filter((e) => e.status === 'active').length || 0,
        completed: data?.filter((e) => e.status === 'completed').length || 0,
        paused: data?.filter((e) => e.status === 'paused').length || 0,
        cancelled: data?.filter((e) => e.status === 'cancelled').length || 0,
      };

      return stats;
    },
  });
}

// Create a new enrollment
export function useCreateSequenceEnrollment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      enrollment: Omit<
        SequenceEnrollment,
        'id' | 'user_id' | 'enrolled_at' | 'completed_at'
      >
    ) => {
      // Check if contact is already enrolled in this sequence
      const { data: existing, error: checkError } = await supabase
        .from('sequence_enrollments')
        .select('id, status')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('contact_email', enrollment.contact_email.toLowerCase())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.status === 'active') {
          throw new Error('Contact is already enrolled in this sequence');
        }
        // If previously enrolled but not active, we can re-enroll
      }

      // Check suppression list
      const { data: suppressed, error: suppressError } = await supabase
        .from('suppression_list')
        .select('id')
        .eq('user_id', user!.id)
        .eq('email', enrollment.contact_email.toLowerCase())
        .maybeSingle();

      if (suppressError) throw suppressError;

      if (suppressed) {
        throw new Error(
          'Cannot enroll suppressed email address. Contact has unsubscribed or bounced.'
        );
      }

      // Get sequence steps to calculate next send time
      const { data: steps, error: stepsError } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', enrollment.sequence_id)
        .order('step_order', { ascending: true });

      if (stepsError) throw stepsError;

      if (!steps || steps.length === 0) {
        throw new Error('Sequence has no steps');
      }

      // Calculate next email scheduled time (first step delay)
      const firstStep = steps[0];
      const nextScheduledAt = new Date();
      nextScheduledAt.setHours(
        nextScheduledAt.getHours() + firstStep.delay_hours
      );

      const { data, error } = await supabase
        .from('sequence_enrollments')
        .insert({
          ...enrollment,
          user_id: user!.id,
          contact_email: enrollment.contact_email.toLowerCase(),
          next_email_scheduled_at: nextScheduledAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Bulk enroll contacts
export function useBulkEnrollContacts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sequenceId,
      contacts,
    }: {
      sequenceId: string;
      contacts: Array<{
        email: string;
        client_id?: string | null;
        lead_id?: string | null;
      }>;
    }) => {
      // Get sequence steps
      const { data: steps, error: stepsError } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true });

      if (stepsError) throw stepsError;

      if (!steps || steps.length === 0) {
        throw new Error('Sequence has no steps');
      }

      // Get suppression list
      const { data: suppressedList, error: suppressError } = await supabase
        .from('suppression_list')
        .select('email')
        .eq('user_id', user!.id);

      if (suppressError) throw suppressError;

      const suppressedEmails = new Set(
        (suppressedList || []).map((s) => s.email.toLowerCase())
      );

      // Get existing enrollments
      const { data: existingEnrollments, error: existingError } = await supabase
        .from('sequence_enrollments')
        .select('contact_email, status')
        .eq('sequence_id', sequenceId)
        .eq('status', 'active');

      if (existingError) throw existingError;

      const activeEmails = new Set(
        (existingEnrollments || []).map((e) => e.contact_email.toLowerCase())
      );

      // Filter contacts
      const validContacts = contacts.filter((contact) => {
        const emailLower = contact.email.toLowerCase();
        return (
          !suppressedEmails.has(emailLower) && !activeEmails.has(emailLower)
        );
      });

      if (validContacts.length === 0) {
        throw new Error(
          'No valid contacts to enroll. All contacts are either suppressed or already enrolled.'
        );
      }

      // Calculate next send time
      const firstStep = steps[0];
      const nextScheduledAt = new Date();
      nextScheduledAt.setHours(
        nextScheduledAt.getHours() + firstStep.delay_hours
      );

      // Create enrollments
      const enrollments = validContacts.map((contact) => ({
        user_id: user!.id,
        sequence_id: sequenceId,
        contact_email: contact.email.toLowerCase(),
        client_id: contact.client_id || null,
        lead_id: contact.lead_id || null,
        current_step: 0,
        status: 'active' as const,
        next_email_scheduled_at: nextScheduledAt.toISOString(),
      }));

      const { data, error } = await supabase
        .from('sequence_enrollments')
        .insert(enrollments)
        .select();

      if (error) throw error;

      return {
        enrolled: data?.length || 0,
        skipped: contacts.length - validContacts.length,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Update enrollment status
export function useUpdateSequenceEnrollment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<SequenceEnrollment> & { id: string }) => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Cancel enrollment
export function useCancelSequenceEnrollment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollmentId)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Pause enrollment
export function usePauseSequenceEnrollment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'paused' })
        .eq('id', enrollmentId)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Resume enrollment
export function useResumeSequenceEnrollment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'active' })
        .eq('id', enrollmentId)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Unenroll contact from sequence (by email)
export function useUnenrollContactFromSequence() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sequenceId,
      contactEmail,
    }: {
      sequenceId: string;
      contactEmail: string;
    }) => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'cancelled' })
        .eq('sequence_id', sequenceId)
        .eq('contact_email', contactEmail.toLowerCase())
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}

// Unenroll contact from all sequences
export function useUnenrollContactFromAllSequences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contactEmail: string) => {
      const { data, error } = await supabase
        .from('sequence_enrollments')
        .update({ status: 'cancelled' })
        .eq('contact_email', contactEmail.toLowerCase())
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence-enrollments'] });
      qc.invalidateQueries({ queryKey: ['sequence-enrollment-stats'] });
    },
  });
}
