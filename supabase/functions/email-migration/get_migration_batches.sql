
CREATE OR REPLACE FUNCTION public.get_migration_batches(limit_count integer DEFAULT 10, include_counts boolean DEFAULT true)
RETURNS TABLE (
  migration_batch text, 
  count bigint, 
  created_at timestamp with time zone,
  success_rate numeric,
  status_summary jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF include_counts THEN
    RETURN QUERY 
    SELECT 
      e.migration_batch,
      COUNT(e.id)::bigint as count,
      MAX(e.created_at) as created_at,
      ROUND(
        (COUNT(CASE WHEN e.status = 'migrated' OR e.status = 'already_exists' THEN 1 ELSE NULL END)::numeric / 
         COUNT(e.id)::numeric) * 100, 
        2
      ) as success_rate,
      jsonb_build_object(
        'migrated', COUNT(CASE WHEN e.status = 'migrated' THEN 1 ELSE NULL END),
        'already_exists', COUNT(CASE WHEN e.status = 'already_exists' THEN 1 ELSE NULL END),
        'failed', COUNT(CASE WHEN e.status = 'failed' THEN 1 ELSE NULL END),
        'in_progress', COUNT(CASE WHEN e.status = 'in_progress' THEN 1 ELSE NULL END),
        'pending', COUNT(CASE WHEN e.status = 'pending' THEN 1 ELSE NULL END)
      ) as status_summary
    FROM 
      public.email_migration e
    WHERE 
      e.migration_batch IS NOT NULL
    GROUP BY 
      e.migration_batch
    ORDER BY 
      MAX(e.created_at) DESC
    LIMIT limit_count;
  ELSE
    -- Simple version without counts
    RETURN QUERY 
    SELECT 
      e.migration_batch,
      COUNT(e.id)::bigint as count,
      MAX(e.created_at) as created_at,
      0::numeric as success_rate,
      '{}'::jsonb as status_summary
    FROM 
      public.email_migration e
    WHERE 
      e.migration_batch IS NOT NULL
    GROUP BY 
      e.migration_batch
    ORDER BY 
      MAX(e.created_at) DESC
    LIMIT limit_count;
  END IF;
END;
$$;
