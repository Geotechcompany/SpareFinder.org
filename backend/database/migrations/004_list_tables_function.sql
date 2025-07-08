-- Function to list all tables in the current schema
CREATE OR REPLACE FUNCTION list_tables()
RETURNS TABLE (table_name TEXT) AS $$
BEGIN
    RETURN QUERY 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 