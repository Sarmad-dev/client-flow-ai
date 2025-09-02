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
}

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
