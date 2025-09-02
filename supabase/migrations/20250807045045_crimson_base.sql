/*
  # Add Lead Management and Onboarding System

  1. New Tables
    - `leads` - Lead information with location data and conversion tracking
    - `user_onboarding` - Track onboarding completion status
    - `lead_interactions` - Track interactions with leads (calls, emails, etc.)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their own data

  3. Changes
    - Add lead-specific fields and status tracking
    - Add onboarding completion tracking
    - Add lead interaction history
*/

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  whatsapp_phone text,
  address text,
  location_lat decimal,
  location_lng decimal,
  google_place_id text,
  business_type text,
  website text,
  rating decimal,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'map_search', 'referral', 'website')),
  notes text,
  tags text[],
  last_contact_date timestamptz,
  conversion_date timestamptz,
  converted_client_id uuid REFERENCES clients(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_onboarding table
CREATE TABLE IF NOT EXISTS user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  completed boolean DEFAULT false,
  current_step integer DEFAULT 1,
  steps_completed jsonb DEFAULT '[]',
  welcome_completed boolean DEFAULT false,
  features_viewed boolean DEFAULT false,
  first_client_added boolean DEFAULT false,
  first_task_created boolean DEFAULT false,
  voice_recording_tried boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead_interactions table
CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type text CHECK (interaction_type IN ('call', 'email', 'whatsapp', 'meeting', 'note')),
  subject text,
  content text,
  outcome text,
  follow_up_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Users can read own leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for user_onboarding
CREATE POLICY "Users can read own onboarding"
  ON user_onboarding
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON user_onboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON user_onboarding
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for lead_interactions
CREATE POLICY "Users can read own lead interactions"
  ON lead_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lead interactions"
  ON lead_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead interactions"
  ON lead_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to handle onboarding creation
CREATE OR REPLACE FUNCTION handle_new_user_onboarding()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_onboarding (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing user creation trigger to include onboarding
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  INSERT INTO user_onboarding (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_user_id ON lead_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);