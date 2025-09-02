-- Email extensions: templates, sequences, events, suppression, and scheduling support
BEGIN;

-- Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sequences and steps
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  delay_hours integer DEFAULT 24,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject text,
  body_html text,
  body_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_communication_id uuid REFERENCES public.email_communications(id) ON DELETE CASCADE,
  event_type text CHECK (event_type IN ('delivered','opened','clicked','failed','complained','received')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Suppression list
CREATE TABLE IF NOT EXISTS public.suppression_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Extend email_communications for scheduling
ALTER TABLE public.email_communications
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_user ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_user ON public.email_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON public.sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_events_comm ON public.email_events(email_communication_id);
CREATE INDEX IF NOT EXISTS idx_suppression_user_email ON public.suppression_list(user_id, email);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_list ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Read own templates" ON public.email_templates
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insert own templates" ON public.email_templates
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Update own templates" ON public.email_templates
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Read own sequences" ON public.email_sequences
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insert own sequences" ON public.email_sequences
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Update own sequences" ON public.email_sequences
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Read own sequence steps" ON public.sequence_steps
    FOR SELECT TO authenticated USING (EXISTS (
      SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insert own sequence steps" ON public.sequence_steps
    FOR INSERT TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Update own sequence steps" ON public.sequence_steps
    FOR UPDATE TO authenticated USING (EXISTS (
      SELECT 1 FROM public.email_sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Read own email events" ON public.email_events
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insert own email events" ON public.email_events
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Read own suppression" ON public.suppression_list
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Insert own suppression" ON public.suppression_list
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Delete own suppression" ON public.suppression_list
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


