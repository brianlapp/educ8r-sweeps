
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
  error_count INTEGER := 0;
  subscriber JSONB;
  email_value TEXT;
BEGIN
  -- Start a transaction
  BEGIN
    -- Process each subscriber
    FOR subscriber IN SELECT * FROM jsonb_array_elements(subscribers_data)
    LOOP
      -- Extract and validate email
      email_value := subscriber->>'email';
      
      -- Skip empty emails
      IF email_value IS NULL OR email_value = '' THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;
      
      -- Try to insert the subscriber
      BEGIN
        INSERT INTO public.email_migration (
          email,
          first_name,
          last_name,
          status
        ) VALUES (
          email_value,
          COALESCE(subscriber->>'first_name', ''),
          COALESCE(subscriber->>'last_name', ''),
          'pending'
        );
        
        inserted_count := inserted_count + 1;
      EXCEPTION 
        WHEN unique_violation THEN
          -- Skip duplicates
          duplicate_count := duplicate_count + 1;
        WHEN OTHERS THEN
          -- Count other errors
          error_count := error_count + 1;
          RAISE NOTICE 'Error inserting subscriber %: %', email_value, SQLERRM;
      END;
    END LOOP;
    
    -- Return results
    result := jsonb_build_object(
      'inserted', inserted_count,
      'duplicates', duplicate_count,
      'errors', error_count,
      'total', jsonb_array_length(subscribers_data)
    );
    
    RETURN result;
  END;
END;
$$;
