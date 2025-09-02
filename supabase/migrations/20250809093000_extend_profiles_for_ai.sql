-- Extend profiles table with additional fields useful for AI-generated emails
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS email_signature text,
  ADD COLUMN IF NOT EXISTS preferred_tone text DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS address text;

COMMIT;


