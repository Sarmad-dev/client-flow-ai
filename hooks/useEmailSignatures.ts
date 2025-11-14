import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailSignature {
  id: string;
  user_id: string;
  name: string;
  html_content: string;
  text_content: string;
  is_default: boolean;
  auto_insert: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSignaturePayload {
  name: string;
  html_content: string;
  text_content: string;
  is_default?: boolean;
  auto_insert?: boolean;
}

export interface UpdateSignaturePayload {
  id: string;
  name?: string;
  html_content?: string;
  text_content?: string;
  is_default?: boolean;
  auto_insert?: boolean;
}

export function useEmailSignatures() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-signatures', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as EmailSignature[];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_signatures')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as EmailSignature[];
    },
  });
}

export function useDefaultSignature() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-signatures', 'default', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_signatures')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('is_default', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No default signature found
          return null;
        }
        throw error;
      }
      return data as EmailSignature | null;
    },
  });
}

export function useCreateSignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSignaturePayload) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('email_signatures')
        .insert({
          user_id: profile?.id,
          name: payload.name,
          html_content: payload.html_content,
          text_content: payload.text_content,
          is_default: payload.is_default ?? false,
          auto_insert: payload.auto_insert ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmailSignature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
    },
  });
}

export function useUpdateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateSignaturePayload) => {
      const { id, ...updates } = payload;

      const { data, error } = await supabase
        .from('email_signatures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EmailSignature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
    },
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureId: string) => {
      const { error } = await supabase
        .from('email_signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
    },
  });
}

export function useSetDefaultSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureId: string) => {
      const { data, error } = await supabase
        .from('email_signatures')
        .update({ is_default: true })
        .eq('id', signatureId)
        .select()
        .single();

      if (error) throw error;
      return data as EmailSignature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
    },
  });
}
