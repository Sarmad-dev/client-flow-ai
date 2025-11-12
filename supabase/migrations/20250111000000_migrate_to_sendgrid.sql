-- Migration to replace Mailgun with SendGrid
-- This migration updates the email_communications table to use SendGrid message IDs

-- Add new SendGrid message ID column
ALTER TABLE email_communications 
ADD COLUMN IF NOT EXISTS sendgrid_message_id text;

-- Copy existing Mailgun message IDs to SendGrid column (if any exist)
UPDATE email_communications 
SET sendgrid_message_id = mailgun_message_id 
WHERE mailgun_message_id IS NOT NULL;

-- Create index for SendGrid message ID for better performance
CREATE INDEX IF NOT EXISTS idx_email_communications_sendgrid_message_id 
ON email_communications(sendgrid_message_id);

-- Update any existing queries that reference mailgun_message_id
-- Note: The old column is kept for backward compatibility during transition
-- You can drop it later once you're sure the migration is complete:
-- ALTER TABLE email_communications DROP COLUMN IF EXISTS mailgun_message_id;

-- Add comment to document the change
COMMENT ON COLUMN email_communications.sendgrid_message_id IS 'SendGrid message ID for tracking email delivery events';
COMMENT ON COLUMN email_communications.mailgun_message_id IS 'Legacy Mailgun message ID - to be removed after SendGrid migration';