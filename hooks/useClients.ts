import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export interface ClientRecord {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  google_place_id: string | null;
  status: 'prospect' | 'active' | 'inactive' | 'closed';
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

const clientsKeys = {
  all: ['clients'] as const,
  list: (userId?: string) => [...clientsKeys.all, 'list', userId] as const,
  detail: (id?: string) => [...clientsKeys.all, 'detail', id] as const,
};

export function useClients() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: clientsKeys.list(userId),
    queryFn: async (): Promise<ClientRecord[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientRecord[];
    },
    enabled: !!userId,
  });
}

export function useClient(id?: string) {
  return useQuery({
    queryKey: clientsKeys.detail(id),
    queryFn: async (): Promise<ClientRecord | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as ClientRecord;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { incrementUsage } = useSubscription();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (
      payload: Partial<ClientRecord> & {
        name: string;
        status?: ClientRecord['status'];
      }
    ): Promise<ClientRecord> => {
      if (!userId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          name: payload.name,
          company: payload.company ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          whatsapp_phone: payload.whatsapp_phone ?? null,
          address: payload.address ?? null,
          location_lat: payload.location_lat ?? null,
          location_lng: payload.location_lng ?? null,
          google_place_id: payload.google_place_id ?? null,
          status: payload.status ?? 'prospect',
          notes: payload.notes ?? null,
          last_contact_date: payload.last_contact_date ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClientRecord;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.all as any });
      await incrementUsage('clients');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: { id: string } & Partial<ClientRecord>
    ): Promise<ClientRecord> => {
      const { id, ...updateData } = payload;
      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClientRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.all as any });
    },
  });
}
