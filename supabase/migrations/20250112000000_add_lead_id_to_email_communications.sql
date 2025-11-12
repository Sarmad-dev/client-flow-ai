-- Add lead_id column to email_communications table
-- This allows emails to be associated with leads, not just clients

-- Add the lead_id column with foreign key reference to leads table
ALTER TABLE public.email_communications 
ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

-- Create index for better performance when querying emails by lead
CREATE INDEX IF NOT EXISTS idx_email_communications_lead_id 
ON public.email_communications(lead_id);

-- Add comment to document the column
COMMENT ON COLUMN public.email_communications.lead_id IS 'Reference to the lead this email communication is associated with';
