-- Email Encryption Support Migration
-- Adds support for client-side email encryption

BEGIN;

-- Add flag to track encryption status for inbound emails
-- This helps identify emails that need to be encrypted when first accessed by client
ALTER TABLE public.email_communications
  ADD COLUMN IF NOT EXISTS needs_encryption boolean DEFAULT false;

-- Add index for efficient querying of emails needing encryption
CREATE INDEX IF NOT EXISTS idx_email_communications_needs_encryption 
  ON public.email_communications(user_id, needs_encryption) 
  WHERE needs_encryption = true;

-- Add comment to document the encryption approach
COMMENT ON COLUMN public.email_communications.needs_encryption IS 
  'Flag indicating if email content needs client-side encryption on first access. Used for inbound emails that arrive as plain text.';

-- Update existing inbound emails to mark them as needing encryption
-- This is a one-time operation for existing data
UPDATE public.email_communications 
SET needs_encryption = true 
WHERE direction = 'received' 
  AND (body_text IS NOT NULL OR body_html IS NOT NULL OR subject IS NOT NULL)
  AND needs_encryption IS NULL;

-- Add function to help with encryption migration
CREATE OR REPLACE FUNCTION public.mark_email_encrypted(email_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark email as encrypted (no longer needs encryption)
  UPDATE public.email_communications 
  SET needs_encryption = false 
  WHERE id = email_id 
    AND user_id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_email_encrypted(uuid) TO authenticated;

-- Add RLS policy for the new column
-- Users can only see and modify their own emails' encryption status
DO $$ BEGIN
  CREATE POLICY "Users can update own email encryption status" 
    ON public.email_communications
    FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;