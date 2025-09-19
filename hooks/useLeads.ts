import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LeadFormData } from '@/lib/validation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

export interface LeadRecord {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  google_place_id: string | null;
  business_type: string | null;
  website: string | null;
  rating: number | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  source: 'manual' | 'map_search' | 'referral' | 'website';
  notes: string | null;
  tags: string[] | null;
  last_contact_date: string | null;
  conversion_date: string | null;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;
}

const leadsKeys = {
  all: ['leads'] as const,
  list: (userId?: string) => [...leadsKeys.all, 'list', userId] as const,
  detail: (id?: string) => [...leadsKeys.all, 'detail', id] as const,
};

export function useLeads() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: leadsKeys.list(userId),
    queryFn: async (): Promise<LeadRecord[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadRecord[];
    },
    enabled: !!userId,
  });

  return query;
}

export function useLead(id?: string) {
  const query = useQuery({
    queryKey: leadsKeys.detail(id),
    queryFn: async (): Promise<LeadRecord | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as LeadRecord;
    },
    enabled: !!id,
  });
  return query;
}

export function useCreateLead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { incrementUsage } = useSubscription();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (
      input: LeadFormData & {
        source?: LeadRecord['source'];
        selectedPlace?: {
          place_id?: string;
          formatted_address?: string;
          geometry?: { location: { lat: number; lng: number } };
          rating?: number;
        } | null;
      }
    ): Promise<LeadRecord> => {
      if (!userId) throw new Error('Not authenticated');

      const { selectedPlace, ...form } = input;
      const payload = {
        user_id: userId,
        name: (form.name || form.company || '').trim(),
        company: form.company?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        address:
          form.address?.trim() ||
          input.selectedPlace?.formatted_address ||
          null,
        location_lat: selectedPlace?.geometry?.location.lat ?? null,
        location_lng: selectedPlace?.geometry?.location.lng ?? null,
        google_place_id: selectedPlace?.place_id ?? null,
        business_type: form.businessType?.trim() || null,
        website: form.website?.trim() || null,
        rating: selectedPlace?.rating ?? null,
        notes: form.notes?.trim() || null,
        status: 'new' as const,
        source: (input.source ||
          (selectedPlace ? 'map_search' : 'manual')) as LeadRecord['source'],
        last_contact_date: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadRecord;
    },
    onSuccess: async (_data) => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.all as any });
      await incrementUsage('leads');
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<LeadRecord>;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: leadsKeys.list(data.user_id) as any,
      });
      queryClient.invalidateQueries({
        queryKey: leadsKeys.detail(data.id) as any,
      });
    },
  });
}

export function useConvertLeadToClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      clientId,
    }: {
      leadId: string;
      clientId: string;
    }) => {
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          conversion_date: new Date().toISOString(),
          converted_client_id: clientId,
        })
        .eq('id', leadId);
      if (error) throw error;
      return { leadId, clientId };
    },
    onSuccess: ({ leadId }) => {
      queryClient.invalidateQueries({
        queryKey: leadsKeys.detail(leadId) as any,
      });
      queryClient.invalidateQueries({ queryKey: leadsKeys.all as any });
    },
  });
}
