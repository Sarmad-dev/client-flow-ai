import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmailTemplateWithUsage extends EmailTemplate {
  usage_count?: number;
  last_used_at?: string | null;
}

// Fetch all templates for the current user
export function useEmailTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-templates', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
  });
}

// Fetch a single template by ID
export function useEmailTemplate(templateId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-template', templateId],
    enabled: !!user?.id && !!templateId,
    queryFn: async () => {
      if (!templateId) return null;
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
  });
}

// Search and filter templates
export function useSearchEmailTemplates(searchQuery?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-templates', 'search', user?.id, searchQuery],
    enabled: !!user?.id && !!searchQuery && searchQuery.trim().length > 0,
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length === 0) return [];

      const query = searchQuery.toLowerCase().trim();
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('user_id', user!.id)
        .or(
          `name.ilike.%${query}%,subject.ilike.%${query}%,body_text.ilike.%${query}%`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
  });
}

// Get template usage statistics
export function useTemplateUsageStats(templateId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-template-usage', templateId],
    enabled: !!user?.id && !!templateId,
    queryFn: async () => {
      if (!templateId) return { usage_count: 0, last_used_at: null };

      // Count how many times this template was used in email_communications
      const { count, error: countError } = await supabase
        .from('email_communications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('template_id', templateId);

      if (countError) throw countError;

      // Get the most recent usage
      const { data: lastUsed, error: lastUsedError } = await supabase
        .from('email_communications')
        .select('created_at')
        .eq('user_id', user!.id)
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastUsedError) throw lastUsedError;

      return {
        usage_count: count || 0,
        last_used_at: lastUsed?.created_at || null,
      };
    },
  });
}

// Check if template is used in active sequences
export function useTemplateSequenceUsage(templateId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-template-sequence-usage', templateId],
    enabled: !!user?.id && !!templateId,
    queryFn: async () => {
      if (!templateId) return { is_used: false, sequences: [] };

      // Check if template is used in any active sequence steps
      const { data, error } = await supabase
        .from('sequence_steps')
        .select(
          `
          id,
          sequence_id,
          email_sequences!inner(
            id,
            name,
            active,
            user_id
          )
        `
        )
        .eq('template_id', templateId)
        .eq('email_sequences.user_id', user!.id)
        .eq('email_sequences.active', true);

      if (error) throw error;

      const sequences = (data || []).map((step: any) => ({
        id: step.email_sequences.id,
        name: step.email_sequences.name,
      }));

      return {
        is_used: sequences.length > 0,
        sequences,
      };
    },
  });
}

// Create a new template
export function useCreateEmailTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      template: Omit<
        EmailTemplate,
        'id' | 'user_id' | 'created_at' | 'updated_at'
      >
    ) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          ...template,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

// Update an existing template
export function useUpdateEmailTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      qc.invalidateQueries({ queryKey: ['email-template', data.id] });
    },
  });
}

// Delete a template
export function useDeleteEmailTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user!.id);
      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
}

// Legacy upsert function (kept for backward compatibility)
export function useUpsertEmailTemplate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: Partial<EmailTemplate>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .upsert({ ...tpl, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  });
}
