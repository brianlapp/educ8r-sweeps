
-- Add heartbeat and status fields to the email_migration_automation table
ALTER TABLE public.email_migration_automation 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS current_batch_id TEXT;
