export interface Organization {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
  member_count?: number;
  user_role?: 'owner' | 'admin' | 'member';
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'inactive';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
  organization?: Organization;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  action_url?: string;
  created_at: string;
  expires_at?: string;
}

export type NotificationType =
  | 'organization_invite'
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'meeting_scheduled'
  | 'meeting_reminder'
  | 'meeting_cancelled'
  | 'lead_assigned'
  | 'client_updated'
  | 'comment_added'
  | 'mention';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  preferences: Record<
    NotificationType,
    {
      email: boolean;
      push: boolean;
      in_app: boolean;
    }
  >;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberInput {
  organization_id: string;
  user_email: string;
  role?: 'admin' | 'member';
}

export interface UpdateMemberRoleInput {
  membership_id: string;
  role: 'admin' | 'member';
}
