
CREATE OR REPLACE FUNCTION public.get_status_counts()
RETURNS TABLE (status text, count bigint, percentage numeric) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count bigint;
BEGIN
  -- Get the total count first
  SELECT COUNT(id) INTO total_count FROM public.email_migration;
  
  -- Only calculate percentages if we have records
  IF total_count > 0 THEN
    RETURN QUERY 
    SELECT 
      e.status,
      COUNT(e.id)::bigint as count,
      ROUND((COUNT(e.id)::numeric / total_count::numeric) * 100, 2) as percentage
    FROM 
      public.email_migration e
    GROUP BY 
      e.status
    ORDER BY
      count DESC;
  ELSE
    -- If no records, return zeros
    RETURN QUERY 
    SELECT 
      e.status,
      COUNT(e.id)::bigint as count,
      0::numeric as percentage
    FROM 
      public.email_migration e
    GROUP BY 
      e.status
    ORDER BY
      count DESC;
  END IF;
END;
$$;
