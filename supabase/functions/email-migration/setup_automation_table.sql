
-- This SQL file is for reference only and would be used to set up the automation table
-- Create the automation settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_migration_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_total_target INTEGER NOT NULL DEFAULT 1000,
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 17,
  min_batch_size INTEGER NOT NULL DEFAULT 10,
  max_batch_size INTEGER NOT NULL DEFAULT 100,
  last_automated_run TIMESTAMP WITH TIME ZONE,
  publication_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default settings if no records exist
INSERT INTO public.email_migration_automation (id, enabled, daily_total_target, start_hour, end_hour, min_batch_size, max_batch_size)
SELECT '1', FALSE, 1000, 9, 17, 10, 100
WHERE NOT EXISTS (SELECT 1 FROM public.email_migration_automation);

-- Create trigger for updated_at
CREATE TRIGGER update_email_migration_automation_updated_at
BEFORE UPDATE ON public.email_migration_automation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
