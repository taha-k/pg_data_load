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