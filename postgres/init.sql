-- Enable required extensions
\c testdb;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgbench;

-- Configure PostgreSQL for better metrics collection
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_functions = 'all';
ALTER SYSTEM SET track_activity_query_size = 2048;

-- Configure pg_stat_statements
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Enable statistics collection
ALTER SYSTEM SET stats_temp_directory = '/var/lib/postgresql/data/pg_stat_tmp';

-- Ensure appropriate permissions
ALTER USER postgres SET search_path = public;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Create a function to initialize pgbench that can be called after DB is ready
CREATE OR REPLACE FUNCTION initialize_pgbench() RETURNS void AS $$
BEGIN
    -- pgbench tables will be created when we run the command from outside
    RAISE NOTICE 'pgbench initialization should be done via command line';
END;
$$ LANGUAGE plpgsql;
