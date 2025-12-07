-- Enhanced Meeting Management Schema
-- This migration adds comprehensive meeting management features including:
-- - Meeting participants tracking
-- - Real-time transcription storage
-- - Action item extraction
-- - Meeting notes and templates
-- - Meeting decisions tracking
-- - Analytics caching

-- ============================================================================
-- 1. Enhance existing meetings table with new fields
-- ============================================================================

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS zoom_meeting_id text,
  ADD COLUMN IF NOT EXISTS teams_meeting_id text,
  ADD COLUMN IF NOT EXISTS meet_link text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS engagement_score decimal(3,2),
  ADD COLUMN IF NOT EXISTS preparation_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_sent boolean DEFAULT false;

-- Update status check constraint to include 'in_progress'
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check 
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- ============================================================================
-- 2. Create meeting_participants table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_type text NOT NULL CHECK (participant_type IN ('client', 'lead', 'team_member', 'external')),
  participant_id uuid, -- References clients, leads, or profiles
  participant_name text NOT NULL,
  participant_email text,
  role text CHECK (role IN ('organizer', 'required', 'optional')),
  attendance_status text DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'accepted', 'declined', 'tentative', 'attended', 'no_show')),
  joined_at timestamptz,
  left_at timestamptz,
  duration_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. Create meeting_transcripts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  speaker_id text,
  speaker_name text,
  text text NOT NULL,
  start_time decimal(10,3), -- seconds from meeting start
  end_time decimal(10,3),
  confidence decimal(3,2),
  is_edited boolean DEFAULT false,
  original_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, segment_index)
);

-- ============================================================================
-- 4. Create meeting_action_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  assignee_name text,
  due_date timestamptz,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  source_transcript_segment uuid REFERENCES meeting_transcripts(id) ON DELETE SET NULL,
  confidence decimal(3,2),
  is_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. Create meeting_notes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('key_points', 'decisions', 'questions', 'general')),
  content text NOT NULL,
  timestamp_in_meeting decimal(10,3), -- seconds from meeting start
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 6. Create meeting_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  meeting_type text DEFAULT 'video' CHECK (meeting_type IN ('video', 'phone', 'in-person')),
  default_duration_minutes integer DEFAULT 60,
  agenda_template text,
  is_system_template boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb, -- {frequency: 'weekly', interval: 1, days: ['monday']}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 7. Create meeting_decisions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  decision_type text CHECK (decision_type IN ('approved', 'rejected', 'deferred', 'information')),
  title text NOT NULL,
  description text,
  agenda_item text,
  impact text,
  related_task_ids uuid[],
  decided_by text,
  timestamp_in_meeting decimal(10,3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. Create meeting_analytics_cache table
-- ============================================================================

CREATE TABLE IF NOT EXISTS meeting_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metrics jsonb NOT NULL, -- Cached analytics data
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);

-- ============================================================================
-- 9. Enable Row Level Security (RLS) on all new tables
-- ============================================================================

ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_analytics_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. Create RLS Policies for meeting_participants
-- ============================================================================

CREATE POLICY "Users can read participants of their meetings"
  ON meeting_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert participants to their meetings"
  ON meeting_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update participants of their meetings"
  ON meeting_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete participants from their meetings"
  ON meeting_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 11. Create RLS Policies for meeting_transcripts
-- ============================================================================

CREATE POLICY "Users can read transcripts of their meetings"
  ON meeting_transcripts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_transcripts.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transcripts to their meetings"
  ON meeting_transcripts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_transcripts.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transcripts of their meetings"
  ON meeting_transcripts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_transcripts.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transcripts from their meetings"
  ON meeting_transcripts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_transcripts.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 12. Create RLS Policies for meeting_action_items
-- ============================================================================

CREATE POLICY "Users can read action items of their meetings"
  ON meeting_action_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_action_items.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert action items to their meetings"
  ON meeting_action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_action_items.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update action items of their meetings"
  ON meeting_action_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_action_items.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete action items from their meetings"
  ON meeting_action_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_action_items.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 13. Create RLS Policies for meeting_notes
-- ============================================================================

CREATE POLICY "Users can read notes of their meetings"
  ON meeting_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_notes.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes to their meetings"
  ON meeting_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_notes.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes"
  ON meeting_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON meeting_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 14. Create RLS Policies for meeting_templates
-- ============================================================================

CREATE POLICY "Users can read their own templates and system templates"
  ON meeting_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_system_template = true);

CREATE POLICY "Users can insert their own templates"
  ON meeting_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system_template = false);

CREATE POLICY "Users can update their own templates"
  ON meeting_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system_template = false);

CREATE POLICY "Users can delete their own templates"
  ON meeting_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system_template = false);

-- ============================================================================
-- 15. Create RLS Policies for meeting_decisions
-- ============================================================================

CREATE POLICY "Users can read decisions of their meetings"
  ON meeting_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_decisions.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert decisions to their meetings"
  ON meeting_decisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_decisions.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update decisions of their meetings"
  ON meeting_decisions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_decisions.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete decisions from their meetings"
  ON meeting_decisions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_decisions.meeting_id
      AND meetings.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 16. Create RLS Policies for meeting_analytics_cache
-- ============================================================================

CREATE POLICY "Users can read their own analytics cache"
  ON meeting_analytics_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics cache"
  ON meeting_analytics_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics cache"
  ON meeting_analytics_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics cache"
  ON meeting_analytics_cache
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 17. Create indexes for performance optimization
-- ============================================================================

-- Indexes for meeting_participants
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_participant_id ON meeting_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_participant_type ON meeting_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_attendance_status ON meeting_participants(attendance_status);

-- Indexes for meeting_transcripts
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_id ON meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_segment_index ON meeting_transcripts(meeting_id, segment_index);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_speaker_id ON meeting_transcripts(speaker_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_text_search ON meeting_transcripts USING gin(to_tsvector('english', text));

-- Indexes for meeting_action_items
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting_id ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_task_id ON meeting_action_items(task_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assignee_id ON meeting_action_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_status ON meeting_action_items(status);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_due_date ON meeting_action_items(due_date);

-- Indexes for meeting_notes
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_id ON meeting_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_id ON meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_section ON meeting_notes(section);

-- Indexes for meeting_templates
CREATE INDEX IF NOT EXISTS idx_meeting_templates_user_id ON meeting_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_templates_is_system ON meeting_templates(is_system_template);

-- Indexes for meeting_decisions
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting_id ON meeting_decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_decision_type ON meeting_decisions(decision_type);

-- Indexes for meeting_analytics_cache
CREATE INDEX IF NOT EXISTS idx_meeting_analytics_cache_user_id ON meeting_analytics_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_analytics_cache_period ON meeting_analytics_cache(user_id, period_start, period_end);

-- Additional indexes on meetings table for new fields
CREATE INDEX IF NOT EXISTS idx_meetings_template_id ON meetings(template_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_engagement_score ON meetings(engagement_score);

-- ============================================================================
-- 18. Create updated_at trigger function if not exists
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 19. Create triggers for updated_at columns
-- ============================================================================

CREATE TRIGGER update_meeting_participants_updated_at
  BEFORE UPDATE ON meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_transcripts_updated_at
  BEFORE UPDATE ON meeting_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_action_items_updated_at
  BEFORE UPDATE ON meeting_action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_templates_updated_at
  BEFORE UPDATE ON meeting_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_decisions_updated_at
  BEFORE UPDATE ON meeting_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_analytics_cache_updated_at
  BEFORE UPDATE ON meeting_analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 20. Insert default system templates
-- ============================================================================

INSERT INTO meeting_templates (
  user_id,
  name,
  description,
  meeting_type,
  default_duration_minutes,
  agenda_template,
  is_system_template,
  is_recurring
) VALUES
  (
    NULL,
    'Sales Call',
    'Standard sales call template with discovery and pitch sections',
    'video',
    30,
    E'1. Introduction and rapport building\n2. Discovery questions\n3. Product/service presentation\n4. Address objections\n5. Next steps and close',
    true,
    false
  ),
  (
    NULL,
    'Client Review',
    'Quarterly or monthly client review meeting',
    'video',
    60,
    E'1. Review previous period performance\n2. Discuss current status and progress\n3. Address challenges and concerns\n4. Plan next period objectives\n5. Action items and follow-up',
    true,
    false
  ),
  (
    NULL,
    'Team Sync',
    'Regular team synchronization meeting',
    'video',
    30,
    E'1. Quick wins and updates\n2. Blockers and challenges\n3. Priorities for the week\n4. Questions and discussion\n5. Action items',
    true,
    true
  ),
  (
    NULL,
    'Discovery Call',
    'Initial discovery call with potential client',
    'video',
    45,
    E'1. Introduction and background\n2. Understand client needs and pain points\n3. Discuss current solutions and gaps\n4. Explore budget and timeline\n5. Determine fit and next steps',
    true,
    false
  ),
  (
    NULL,
    'Project Kickoff',
    'Project kickoff meeting template',
    'video',
    90,
    E'1. Introductions and roles\n2. Project overview and objectives\n3. Timeline and milestones\n4. Communication plan\n5. Risks and dependencies\n6. Q&A and next steps',
    true,
    false
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 21. Add foreign key constraint for template_id
-- ============================================================================

ALTER TABLE meetings
  ADD CONSTRAINT fk_meetings_template_id
  FOREIGN KEY (template_id)
  REFERENCES meeting_templates(id)
  ON DELETE SET NULL;

-- ============================================================================
-- Migration complete
-- ============================================================================
