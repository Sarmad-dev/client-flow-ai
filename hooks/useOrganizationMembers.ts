import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import type {
  OrganizationMember,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '@/types/organization';

const organizationMembersKeys = {
  all: ['organization-members'] as const,
  byOrganization: (organizationId?: string) =>
    [
      ...organizationMembersKeys.all,
      'by-organization',
      organizationId,
    ] as const,
  assignable: (organizationId?: string) =>
    [...organizationMembersKeys.all, 'assignable', organizationId] as const,
};

export function useOrganizationMembers(organizationId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: organizationMembersKeys.byOrganization(orgId),
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!orgId || !user) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          *,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrganizationMember[];
    },
    enabled: !!orgId && !!user,
  });
}

// Hook specifically for getting assignable members (active members only)
export function useAssignableMembers(organizationId?: string) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: organizationMembersKeys.assignable(orgId),
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!orgId || !user) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          *,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrganizationMember[];
    },
    enabled: !!orgId && !!user,
  });
}

export function useInviteMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase.rpc('invite_organization_member', {
        p_organization_id: input.organization_id,
        p_user_email: input.user_email,
        p_role: input.role || 'member',
        p_invited_by: profile.id,
      });

      if (error) {
        console.log('Invite Error: ', error);
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.byOrganization(
          variables.organization_id
        ),
      });
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.assignable(variables.organization_id),
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMemberRoleInput) => {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role: input.role })
        .eq('id', input.membership_id)
        .select(
          `
          *,
          organization_id,
          user:profiles!user_id(
            id,
            user_id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.byOrganization(data.organization_id),
      });
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.assignable(data.organization_id),
      });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      membershipId: string;
      organizationId: string;
    }) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', payload.membershipId);

      if (error) throw error;
      return payload.organizationId;
    },
    onSuccess: (organizationId) => {
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.byOrganization(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.assignable(organizationId),
      });
    },
  });
}

export function useLeaveOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', profile.id);

      if (error) throw error;
      return organizationId;
    },
    onSuccess: (organizationId) => {
      queryClient.invalidateQueries({
        queryKey: organizationMembersKeys.byOrganization(organizationId),
      });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useAcceptInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase.rpc('accept_organization_invite', {
        p_membership_id: membershipId,
        p_user_id: profile.id,
      });

      if (error) throw error;

      // Delete the notification after accepting the invite
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id)
        .eq('type', 'organization_invite')
        .eq('data->>membership_id', membershipId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationMembersKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useRejectInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase.rpc('reject_organization_invite', {
        p_membership_id: membershipId,
        p_user_id: profile.id,
      });

      if (error) throw error;

      // Delete the notification after rejecting the invite
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.id)
        .eq('type', 'organization_invite')
        .eq('data->>membership_id', membershipId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationMembersKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
