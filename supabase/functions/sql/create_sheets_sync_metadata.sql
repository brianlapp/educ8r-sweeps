
-- Function to create the sheets_sync_metadata table if it doesn't exist
CREATE OR REPLACE FUNCTION create_sheets_sync_metadata_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'sheets_sync_metadata'
  ) THEN
    -- Create the table
    CREATE TABLE public.sheets_sync_metadata (
      id TEXT PRIMARY KEY,
      last_sync_time TIMESTAMP WITH TIME ZONE,
      entries_synced INTEGER,
      total_entries_synced INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Add RLS policies if needed
    -- For now, we'll just create the table
  END IF;
END;
$$;
