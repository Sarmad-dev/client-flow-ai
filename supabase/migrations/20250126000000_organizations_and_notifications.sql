-- Organizations and Notifications System Migration

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT organizations_name_check CHECK (char_length(name) >= 2)
);

-- Create organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'organization_invite',
    'task_assigned',
    'task_completed',
    'task_overdue',
    'meeting_scheduled',
    'meeting_reminder',
    'meeting_cancelled',
    'lead_assigned',
    'client_updated',
    'comment_added',
    'mention'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  preferences JSONB DEFAULT '{
    "organization_invite": {"email": true, "push": true, "in_app": true},
    "task_assigned": {"email": true, "push": true, "in_app": true},
    "task_completed": {"email": false, "push": true, "in_app": true},
    "task_overdue": {"email": true, "push": true, "in_app": true},
    "meeting_scheduled": {"email": true, "push": true, "in_app": true},
    "meeting_reminder": {"email": true, "push": true, "in_app": true},
    "meeting_cancelled": {"email": true, "push": true, "in_app": true}
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to existing tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_org ON meetings(organization_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they own"
  ON organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view organizations they are members of"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Only owners can delete organizations"
  ON organizations FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for organization_members
CREATE POLICY "Users can view their own memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view members of organizations they own"
  ON organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_members.organization_id
      AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can invite members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership status"
  ON organization_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Owners can update any membership"
  ON organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave organizations"
  ON organization_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Owners can remove members"
  ON organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = organization_id
      AND o.owner_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification when member is invited
CREATE OR REPLACE FUNCTION notify_organization_invite()
RETURNS TRIGGER AS $$
DECLARE
  v_org_name TEXT;
  v_inviter_email TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT name INTO v_org_name FROM organizations WHERE id = NEW.organization_id;
    SELECT email INTO v_inviter_email FROM auth.users WHERE id = NEW.invited_by;
    
    PERFORM create_notification(
      NEW.user_id,
      'organization_invite',
      'Organization Invitation',
      'You have been invited to join ' || v_org_name,
      jsonb_build_object(
        'organization_id', NEW.organization_id,
        'organization_name', v_org_name,
        'invited_by', v_inviter_email,
        'membership_id', NEW.id
      ),
      '/organizations/' || NEW.organization_id::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_member_invited
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_organization_invite();

-- Trigger to auto-add owner as active member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- Function to accept organization invite
CREATE OR REPLACE FUNCTION accept_organization_invite(p_membership_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE organization_members
  SET status = 'active', joined_at = NOW(), updated_at = NOW()
  WHERE id = p_membership_id
  AND user_id = p_user_id
  AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject organization invite
CREATE OR REPLACE FUNCTION reject_organization_invite(p_membership_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM organization_members
  WHERE id = p_membership_id
  AND user_id = p_user_id
  AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite member by email
CREATE OR REPLACE FUNCTION invite_organization_member(
  p_organization_id UUID,
  p_user_email TEXT,
  p_role TEXT,
  p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_membership_id UUID;
BEGIN
  -- Find user by email in auth.users
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;
  
  -- Check if membership already exists
  SELECT id INTO v_membership_id
  FROM organization_members
  WHERE organization_id = p_organization_id
  AND user_id = v_user_id;
  
  IF v_membership_id IS NOT NULL THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;
  
  -- Create membership
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by
  ) VALUES (
    p_organization_id,
    v_user_id,
    p_role,
    'pending',
    p_invited_by
  )
  RETURNING id INTO v_membership_id;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
