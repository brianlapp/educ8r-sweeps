
CREATE OR REPLACE FUNCTION public.get_status_counts()
RETURNS TABLE (status text, count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    e.status,
    COUNT(e.id)::bigint
  FROM 
    public.email_migration e
  GROUP BY 
    e.status;
END;
$$;
