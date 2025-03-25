
CREATE OR REPLACE FUNCTION public.get_migration_batches(limit_count integer DEFAULT 5)
RETURNS TABLE (migration_batch text, count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    e.migration_batch,
    COUNT(e.id)::bigint
  FROM 
    public.email_migration e
  WHERE 
    e.migration_batch IS NOT NULL
  GROUP BY 
    e.migration_batch
  ORDER BY 
    e.migration_batch DESC
  LIMIT limit_count;
END;
$$;
