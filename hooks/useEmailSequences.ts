import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  template_id: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmailSequence {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmailSequenceWithSteps extends EmailSequence {
  steps: SequenceStep[];
}

// Fetch all sequences for the current user
export function useEmailSequences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-sequences', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EmailSequence[];
    },
  });
}

// Fetch a single sequence with its steps
export function useEmailSequence(sequenceId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-sequence', sequenceId],
    enabled: !!user?.id && !!sequenceId,
    queryFn: async () => {
      if (!sequenceId) return null;

      // Fetch sequence
      const { data: sequence, error: seqError } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('id', sequenceId)
        .eq('user_id', user!.id)
        .single();

      if (seqError) throw seqError;

      // Fetch steps
      const { data: steps, error: stepsError } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true });

      if (stepsError) throw stepsError;

      return {
        ...sequence,
        steps: steps || [],
      } as EmailSequenceWithSteps;
    },
  });
}

// Fetch only active sequences
export function useActiveEmailSequences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-sequences', 'active', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('user_id', user!.id)
        .eq('active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as EmailSequence[];
    },
  });
}

// Create a new sequence
export function useCreateEmailSequence() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      sequence: Omit<
        EmailSequence,
        'id' | 'user_id' | 'created_at' | 'updated_at'
      >
    ) => {
      const { data, error } = await supabase
        .from('email_sequences')
        .insert({
          ...sequence,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EmailSequence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-sequences'] });
    },
  });
}

// Update an existing sequence
export function useUpdateEmailSequence() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<EmailSequence> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_sequences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as EmailSequence;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['email-sequences'] });
      qc.invalidateQueries({ queryKey: ['email-sequence', data.id] });
    },
  });
}

// Delete a sequence
export function useDeleteEmailSequence() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sequenceId: string) => {
      // First check if there are active enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('sequence_enrollments')
        .select('id')
        .eq('sequence_id', sequenceId)
        .eq('status', 'active')
        .limit(1);

      if (enrollError) throw enrollError;

      if (enrollments && enrollments.length > 0) {
        throw new Error(
          'Cannot delete sequence with active enrollments. Please cancel all enrollments first.'
        );
      }

      const { error } = await supabase
        .from('email_sequences')
        .delete()
        .eq('id', sequenceId)
        .eq('user_id', user!.id);
      if (error) throw error;
      return sequenceId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-sequences'] });
    },
  });
}

// Create a sequence step
export function useCreateSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      step: Omit<SequenceStep, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('sequence_steps')
        .insert(step)
        .select()
        .single();
      if (error) throw error;
      return data as SequenceStep;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: ['email-sequence', data.sequence_id],
      });
    },
  });
}

// Update a sequence step
export function useUpdateSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      sequence_id,
      ...updates
    }: Partial<SequenceStep> & { id: string; sequence_id: string }) => {
      const { data, error } = await supabase
        .from('sequence_steps')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data: data as SequenceStep, sequence_id };
    },
    onSuccess: ({ sequence_id }) => {
      qc.invalidateQueries({ queryKey: ['email-sequence', sequence_id] });
    },
  });
}

// Delete a sequence step
export function useDeleteSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stepId,
      sequenceId,
    }: {
      stepId: string;
      sequenceId: string;
    }) => {
      const { error } = await supabase
        .from('sequence_steps')
        .delete()
        .eq('id', stepId);
      if (error) throw error;
      return { stepId, sequenceId };
    },
    onSuccess: ({ sequenceId }) => {
      qc.invalidateQueries({ queryKey: ['email-sequence', sequenceId] });
    },
  });
}

// Bulk update sequence steps (for reordering)
export function useBulkUpdateSequenceSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      steps,
      sequenceId,
    }: {
      steps: Array<{ id: string; step_order: number }>;
      sequenceId: string;
    }) => {
      // Update each step's order
      const updates = steps.map((step) =>
        supabase
          .from('sequence_steps')
          .update({ step_order: step.step_order })
          .eq('id', step.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw errors[0].error;

      return sequenceId;
    },
    onSuccess: (sequenceId) => {
      qc.invalidateQueries({ queryKey: ['email-sequence', sequenceId] });
    },
  });
}

// Validate sequence before activation
export function useValidateSequence() {
  return useMutation({
    mutationFn: async (sequenceId: string) => {
      // Fetch sequence and steps
      const { data: steps, error } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true });

      if (error) throw error;

      const errors: string[] = [];

      if (!steps || steps.length === 0) {
        errors.push('Sequence must have at least one step');
      }

      steps?.forEach((step, index) => {
        // Check if step has content (either template or custom content)
        const hasTemplate = !!step.template_id;
        const hasCustomContent =
          (!!step.subject && !!step.body_html) || !!step.body_text;

        if (!hasTemplate && !hasCustomContent) {
          errors.push(
            `Step ${index + 1} must have either a template or custom content`
          );
        }

        // Check delay hours
        if (step.delay_hours < 0) {
          errors.push(`Step ${index + 1} has invalid delay hours`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
      };
    },
  });
}
