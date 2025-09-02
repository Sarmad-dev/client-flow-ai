import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface LeadInteractionRecord {
  id: string;
  user_id: string;
  lead_id: string;
  interaction_type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note';
  subject: string | null;
  content: string | null;
  outcome: string | null;
  follow_up_date: string | null;
  created_at: string;
}

const interactionKeys = {
  all: ['lead_interactions'] as const,
  list: (leadId?: string) => [...interactionKeys.all, 'list', leadId] as const,
};

export function useLeadInteractions(leadId?: string) {
  return useQuery({
    queryKey: interactionKeys.list(leadId),
    queryFn: async (): Promise<LeadInteractionRecord[]> => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadInteractionRecord[];
    },
    enabled: !!leadId,
  });
}

export function useLogLeadInteraction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  return useMutation({
    mutationFn: async (
      payload: Omit<LeadInteractionRecord, 'id' | 'created_at' | 'user_id'>
    ): Promise<LeadInteractionRecord> => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('lead_interactions')
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadInteractionRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.list(data.lead_id) as any });
    },
  });
}


