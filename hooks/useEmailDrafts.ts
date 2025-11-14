import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useRef } from 'react';

export interface EmailDraft {
  id: string;
  user_id: string;
  recipient_email: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachments: Array<{
    uri: string;
    base64?: string;
    mime: string;
    size?: number;
  }>;
  client_id: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDraftPayload {
  recipient_email?: string | null;
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  attachments?: Array<{
    uri: string;
    base64?: string;
    mime: string;
    size?: number;
  }>;
  client_id?: string | null;
  lead_id?: string | null;
}

export interface UpdateDraftPayload extends CreateDraftPayload {
  id: string;
}

/**
 * Hook for fetching all email drafts for the current user
 */
export function useEmailDrafts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-drafts', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as EmailDraft[];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('user_id', profile?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data ?? []) as EmailDraft[];
    },
  });
}

/**
 * Hook for fetching a single email draft by ID
 */
export function useEmailDraft(draftId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-draft', draftId],
    enabled: !!user?.id && !!draftId,
    queryFn: async () => {
      if (!user?.id || !draftId) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('id', draftId)
        .eq('user_id', profile?.id)
        .single();

      if (error) throw error;

      return data as EmailDraft;
    },
  });
}

/**
 * Hook for creating a new email draft
 */
export function useCreateDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDraftPayload) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_drafts')
        .insert({
          user_id: profile?.id,
          recipient_email: payload.recipient_email ?? null,
          subject: payload.subject ?? null,
          body_text: payload.body_text ?? null,
          body_html: payload.body_html ?? null,
          attachments: payload.attachments ?? [],
          client_id: payload.client_id ?? null,
          lead_id: payload.lead_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      return data as EmailDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

/**
 * Hook for updating an existing email draft
 */
export function useUpdateDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateDraftPayload) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_drafts')
        .update({
          recipient_email: payload.recipient_email ?? null,
          subject: payload.subject ?? null,
          body_text: payload.body_text ?? null,
          body_html: payload.body_html ?? null,
          attachments: payload.attachments ?? [],
          client_id: payload.client_id ?? null,
          lead_id: payload.lead_id ?? null,
        })
        .eq('id', payload.id)
        .eq('user_id', profile?.id)
        .select()
        .single();

      if (error) throw error;

      return data as EmailDraft;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['email-draft', data.id] });
    },
  });
}

/**
 * Hook for deleting an email draft
 */
export function useDeleteDraft() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('email_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', profile?.id);

      if (error) throw error;

      return draftId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

/**
 * Hook for auto-saving draft with debouncing
 * @param draftId - The ID of the draft to update (null for new draft)
 * @param data - The draft data to save
 * @param delay - Debounce delay in milliseconds (default: 30000 = 30 seconds)
 */
export function useAutoSaveDraft(
  draftId: string | null,
  data: CreateDraftPayload,
  delay: number = 30000
) {
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDraftIdRef = useRef<string | null>(draftId);

  // Update the ref when draftId changes
  useEffect(() => {
    currentDraftIdRef.current = draftId;
  }, [draftId]);

  const saveDraft = useCallback(async () => {
    try {
      // Check if there's any content to save
      const hasContent =
        data.recipient_email ||
        data.subject ||
        data.body_text ||
        data.body_html ||
        (data.attachments && data.attachments.length > 0);

      if (!hasContent) {
        return null;
      }

      if (currentDraftIdRef.current) {
        // Update existing draft
        const result = await updateDraft.mutateAsync({
          id: currentDraftIdRef.current,
          ...data,
        });
        return result;
      } else {
        // Create new draft
        const result = await createDraft.mutateAsync(data);
        currentDraftIdRef.current = result.id;
        return result;
      }
    } catch (error) {
      console.error('Failed to auto-save draft:', error);
      return null;
    }
  }, [data, createDraft, updateDraft]);

  const triggerAutoSave = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, delay);
  }, [saveDraft, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    triggerAutoSave,
    saveDraft,
    isSaving: createDraft.isPending || updateDraft.isPending,
    currentDraftId: currentDraftIdRef.current,
  };
}
