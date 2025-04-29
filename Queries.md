## Table column statistics
```
SELECT
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
    CASE a.attstorage
        WHEN 'p' THEN 'plain'
        WHEN 'e' THEN 'external (TOAST)'
        WHEN 'm' THEN 'main'
        WHEN 'x' THEN 'extended'
    END as storage_type,
    CASE WHEN a.attlen > 0
         THEN a.attlen
         ELSE pg_catalog.pg_column_size(a.atttypid)
    END as column_length
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = 'data_entries'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
ORDER BY a.attnum;
```

## TOAST Statistics
```
(SELECT *, CURRENT_TIMESTAMP
FROM pg_stat_all_tables
WHERE relname = 'data_entries'
UNION ALL
SELECT *, CURRENT_TIMESTAMP
FROM pg_stat_all_tables
WHERE relid = (SELECT oid
FROM pg_class
WHERE relname = 'pg_toast_' || (SELECT oid
    FROM pg_class
    WHERE relname = 'data_entries')::text
)
);
```

## sizez for main table and TOAST table
```
SELECT 
    c.relname AS main_table,
    pg_size_pretty(pg_table_size(c.oid)) AS main_table_size,
    pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) AS toast_table_size
FROM pg_class c
WHERE c.relname = 'data_entries';
```

## Get TOAST Statistics and table size in single query
```
WITH input_table AS (
    SELECT 'data_entries' AS table_name -- Specify the table name here
),
main_and_toast_stats AS (
    -- Stats for the main table
    SELECT 
        psat.*, 
        ts.main_table_size AS table_size, 
        CURRENT_TIMESTAMP AS query_timestamp
    FROM pg_stat_all_tables psat
    JOIN (
        SELECT 
            pg_size_pretty(pg_table_size(c.oid)) AS main_table_size
        FROM pg_class c
        WHERE c.relname = (SELECT table_name FROM input_table)
    ) ts ON TRUE
    WHERE psat.relname = (SELECT table_name FROM input_table)

    UNION ALL

    -- Stats for the TOAST table
    SELECT 
        psat.*, 
        ts.toast_table_size AS table_size, 
        CURRENT_TIMESTAMP AS query_timestamp
    FROM pg_stat_all_tables psat
    JOIN (
        SELECT 
            pg_size_pretty(pg_total_relation_size(c.reltoastrelid)) AS toast_table_size
        FROM pg_class c
        WHERE c.relname = (SELECT table_name FROM input_table)
    ) ts ON TRUE
    WHERE psat.relid = (
        SELECT reltoastrelid
        FROM pg_class
        WHERE relname = (SELECT table_name FROM input_table)
    )
)
SELECT 
    ms.* 
FROM main_and_toast_stats ms;
```