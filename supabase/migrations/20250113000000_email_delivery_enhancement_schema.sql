-- Email Delivery Enhancement Schema
-- This migration adds new tables and columns for enhanced email management features
-- including drafts, signatures, sequence enrollments, and analytics caching

BEGIN;

-- ============================================================================
-- 1. Enhance email_communications table with new columns
-- ============================================================================

ALTER TABLE public.email_communications
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS thread_id text,
  ADD COLUMN IF NOT EXISTS sequence_enrollment_id uuid,
  ADD COLUMN IF NOT EXISTS signature_used text,
  ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_attachment_size integer DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.email_communications.is_draft IS 'Indicates if this is a draft email not yet sent';
COMMENT ON COLUMN public.email_communications.is_scheduled IS 'Indicates if this email is scheduled for future delivery';
COMMENT ON COLUMN public.email_communications.is_read IS 'Indicates if the email has been read by the user';
COMMENT ON COLUMN public.email_communications.thread_id IS 'Thread identifier for grouping related emails';
COMMENT ON COLUMN public.email_communications.sequence_enrollment_id IS 'Reference to sequence enrollment if part of automated sequence';
COMMENT ON COLUMN public.email_communications.signature_used IS 'Name or ID of the signature used in this email';
COMMENT ON COLUMN public.email_communications.attachment_count IS 'Number of attachments in the email';
COMMENT ON COLUMN public.email_communications.total_attachment_size IS 'Total size of all attachments in bytes';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_email_communications_is_draft 
  ON public.email_communications(user_id, is_draft) WHERE is_draft = true;

CREATE INDEX IF NOT EXISTS idx_email_communications_is_scheduled 
  ON public.email_communications(user_id, scheduled_at) WHERE is_scheduled = true AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_communications_thread_id 
  ON public.email_communications(user_id, thread_id) WHERE thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_communications_is_read 
  ON public.email_communications(user_id, is_read) WHERE is_read = false;

-- ============================================================================
-- 2. Create email_drafts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email text,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb DEFAULT '[]'::jsonb,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.email_drafts IS 'Stores email drafts that are being composed but not yet sent';
COMMENT ON COLUMN public.email_drafts.attachments IS 'JSON array of attachment metadata including uri, mime type, and size';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_drafts_user 
  ON public.email_drafts(user_id);

CREATE INDEX IF NOT EXISTS idx_email_drafts_updated 
  ON public.email_drafts(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_drafts_client 
  ON public.email_drafts(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_drafts_lead 
  ON public.email_drafts(lead_id) WHERE lead_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
  CREATE POLICY "Users can read own drafts" ON public.email_drafts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own drafts" ON public.email_drafts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own drafts" ON public.email_drafts
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own drafts" ON public.email_drafts
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. Create email_signatures table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  html_content text NOT NULL,
  text_content text NOT NULL,
  is_default boolean DEFAULT false,
  auto_insert boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_signature_name UNIQUE(user_id, name)
);

-- Add comments
COMMENT ON TABLE public.email_signatures IS 'Stores user email signatures for automatic insertion';
COMMENT ON COLUMN public.email_signatures.is_default IS 'Indicates if this is the default signature for the user';
COMMENT ON COLUMN public.email_signatures.auto_insert IS 'Whether to automatically insert this signature in new emails';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_signatures_user 
  ON public.email_signatures(user_id);

CREATE INDEX IF NOT EXISTS idx_email_signatures_default 
  ON public.email_signatures(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
  CREATE POLICY "Users can read own signatures" ON public.email_signatures
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own signatures" ON public.email_signatures
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own signatures" ON public.email_signatures
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own signatures" ON public.email_signatures
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 4. Create sequence_enrollments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  current_step integer DEFAULT 0,
  status text CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_email_sent_at timestamptz,
  next_email_scheduled_at timestamptz,
  CONSTRAINT unique_sequence_contact UNIQUE(sequence_id, contact_email)
);

-- Add comments
COMMENT ON TABLE public.sequence_enrollments IS 'Tracks contacts enrolled in email sequences';
COMMENT ON COLUMN public.sequence_enrollments.current_step IS 'Current step number in the sequence (0-based index)';
COMMENT ON COLUMN public.sequence_enrollments.status IS 'Enrollment status: active, completed, paused, or cancelled';
COMMENT ON COLUMN public.sequence_enrollments.next_email_scheduled_at IS 'Timestamp when the next email in sequence should be sent';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_user 
  ON public.sequence_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence 
  ON public.sequence_enrollments(sequence_id);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status 
  ON public.sequence_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_scheduled 
  ON public.sequence_enrollments(next_email_scheduled_at)
  WHERE status = 'active' AND next_email_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_contact 
  ON public.sequence_enrollments(contact_email);

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_client 
  ON public.sequence_enrollments(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_lead 
  ON public.sequence_enrollments(lead_id) WHERE lead_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
  CREATE POLICY "Users can read own enrollments" ON public.sequence_enrollments
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own enrollments" ON public.sequence_enrollments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own enrollments" ON public.sequence_enrollments
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own enrollments" ON public.sequence_enrollments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add foreign key constraint to email_communications
ALTER TABLE public.email_communications
  ADD CONSTRAINT fk_email_communications_sequence_enrollment
  FOREIGN KEY (sequence_enrollment_id)
  REFERENCES public.sequence_enrollments(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_communications_sequence_enrollment 
  ON public.email_communications(sequence_enrollment_id) 
  WHERE sequence_enrollment_id IS NOT NULL;

-- ============================================================================
-- 5. Create email_analytics_cache table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT unique_user_metric_range UNIQUE(user_id, metric_type, date_range_start, date_range_end)
);

-- Add comments
COMMENT ON TABLE public.email_analytics_cache IS 'Caches computed email analytics for performance optimization';
COMMENT ON COLUMN public.email_analytics_cache.metric_type IS 'Type of metric cached (e.g., daily_stats, template_performance)';
COMMENT ON COLUMN public.email_analytics_cache.data IS 'JSON object containing the cached analytics data';
COMMENT ON COLUMN public.email_analytics_cache.expires_at IS 'Timestamp when this cache entry should be refreshed';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_analytics_cache_user 
  ON public.email_analytics_cache(user_id);

CREATE INDEX IF NOT EXISTS idx_email_analytics_cache_expires 
  ON public.email_analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_analytics_cache_metric_type 
  ON public.email_analytics_cache(user_id, metric_type);

-- Enable RLS
ALTER TABLE public.email_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
  CREATE POLICY "Users can read own analytics cache" ON public.email_analytics_cache
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own analytics cache" ON public.email_analytics_cache
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own analytics cache" ON public.email_analytics_cache
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own analytics cache" ON public.email_analytics_cache
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 6. Create function to automatically update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_email_drafts_updated_at ON public.email_drafts;
CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON public.email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_signatures_updated_at ON public.email_signatures;
CREATE TRIGGER update_email_signatures_updated_at
  BEFORE UPDATE ON public.email_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Create helper function to ensure only one default signature per user
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_single_default_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other signatures for this user to non-default
    UPDATE public.email_signatures
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_signature_trigger ON public.email_signatures;
CREATE TRIGGER ensure_single_default_signature_trigger
  BEFORE INSERT OR UPDATE ON public.email_signatures
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_signature();

COMMIT;
