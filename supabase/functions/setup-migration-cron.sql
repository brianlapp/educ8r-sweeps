
-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists
SELECT cron.unschedule('email-migration-automation');

-- Schedule automation to run every 5 minutes
SELECT cron.schedule(
  'email-migration-automation',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://epfzraejquaxqrfmkmyx.supabase.co/functions/v1/server-automation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZnpyYWVqcXVheHFyZm1rbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NzA2ODIsImV4cCI6MjA1NTA0NjY4Mn0.LY300ASTr6cn4vl2ZkCR0pV0rmah9YKLaUXVM5ISytM"}'::jsonb,
    body:='{"action":"continuous-automation"}'::jsonb
  ) as request_id;
  $$
);
