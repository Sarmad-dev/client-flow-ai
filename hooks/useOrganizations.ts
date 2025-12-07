import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Organization,
  CreateOrganizationInput,
  OrganizationMember,
  InviteMemberInput,
  UpdateMemberRoleInput,
} from '@/types/organization';

export function useOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: organizations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Get organizations where user is owner
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select(
          `
          *,
          organization_members(count)
        `
        )
        .eq('owner_id', profile?.id)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.log('Owned Organizations Error: ', ownedError);
        throw ownedError;
      }

      // Get organizations where user is a member
      const { data: memberOrgs, error: memberError } = await supabase
        .from('organization_members')
        .select(
          `
          role,
          organization:organizations(
            *,
            organization_members(count)
          )
        `
        )
        .eq('user_id', profile?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (memberError) {
        console.log('Member Organizations Error: ', memberError);
        throw memberError;
      }

      // Transform owned organizations
      const ownedOrgsWithCount =
        ownedOrgs?.map((org) => ({
          ...org,
          member_count: org.organization_members?.[0]?.count || 0,
          user_role: 'owner' as const,
          organization_members: undefined,
        })) || [];

      // Transform member organizations
      const memberOrgsWithCount =
        memberOrgs
          ?.filter((m) => m.organization) // Filter out null organizations
          .map((m) => {
            const org = m.organization as any;
            return {
              ...org,
              member_count: org.organization_members?.[0]?.count || 0,
              user_role: m.role as 'admin' | 'member',
              organization_members: undefined,
            };
          }) || [];

      // Combine and deduplicate (in case user is both owner and member)
      const allOrgs = [...ownedOrgsWithCount, ...memberOrgsWithCount];
      const uniqueOrgs = Array.from(
        new Map(allOrgs.map((org) => [org.id, org])).values()
      );

      // Sort by created_at descending
      uniqueOrgs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return uniqueOrgs as Organization[];
    },
    enabled: !!user,
  });

  const createOrganization = useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: input.name,
          description: input.description,
          owner_id: profile?.id,
          settings: input.settings || {},
        })
        .select()
        .single();

      if (error) {
        console.log('Organization Error: ', error);
        throw error;
      }
      return data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Organization> & { id: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  return {
    organizations,
    isLoading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  };
}

export function useOrganizationMembers(organizationId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          *,
          user:profiles!user_id(email, full_name)
        `
        )
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!organizationId,
  });

  const inviteMember = useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase.rpc('invite_organization_member', {
        p_organization_id: input.organization_id,
        p_user_email: input.user_email,
        p_role: input.role || 'member',
        p_invited_by: profile?.id,
      });

      if (error) {
        console.log('Invite Error: ', error);
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization-members', variables.organization_id],
      });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async (input: UpdateMemberRoleInput) => {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role: input.role })
        .eq('id', input.membership_id)
        .select()
        .single();

      if (error) throw error;
      return data as OrganizationMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
  });

  const leaveOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', profile?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  const acceptInvite = useMutation({
    mutationFn: async (membershipId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase.rpc('accept_organization_invite', {
        p_membership_id: membershipId,
        p_user_id: profile?.id,
      });

      if (error) throw error;

      // Delete the notification after accepting the invite
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile?.id)
        .eq('type', 'organization_invite')
        .eq('data->>membership_id', membershipId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const rejectInvite = useMutation({
    mutationFn: async (membershipId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase.rpc('reject_organization_invite', {
        p_membership_id: membershipId,
        p_user_id: profile?.id,
      });

      if (error) throw error;

      // Delete the notification after rejecting the invite
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile?.id)
        .eq('type', 'organization_invite')
        .eq('data->>membership_id', membershipId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    members,
    isLoading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    leaveOrganization,
    acceptInvite,
    rejectInvite,
  };
}
