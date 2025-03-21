
-- Function to import subscribers in a transaction
CREATE OR REPLACE FUNCTION public.import_subscribers(subscribers_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  inserted_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  subscriber JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Process each subscriber
    FOR subscriber IN SELECT * FROM jsonb_array_elements(subscribers_data)
    LOOP
      -- Try to insert the subscriber
      BEGIN
        INSERT INTO public.email_migration (
          email,
          first_name,
          last_name,
          status
        ) VALUES (
          subscriber->>'email',
          subscriber->>'first_name',
          subscriber->>'last_name',
          'pending'
        );
        
        inserted_count := inserted_count + 1;
      EXCEPTION 
        WHEN unique_violation THEN
          -- Skip duplicates
          duplicate_count := duplicate_count + 1;
      END;
    END LOOP;
    
    -- Return results
    result := jsonb_build_object(
      'inserted', inserted_count,
      'duplicates', duplicate_count,
      'total', jsonb_array_length(subscribers_data)
    );
    
    RETURN result;
  END;
END;
$$;
