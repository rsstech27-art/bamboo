-- Run through executeSql separately against development and production.
-- This is read-only. Emit normalized UUID paths, never customer data,
-- signed URL query strings, bucket names, or raw settings.
SELECT json_build_object(
  'capturedAt', now(),
  'complete', true,
  'scannedTables', ARRAY['orders', 'products', 'manager_settings'],
  'objectPaths', COALESCE(json_agg(path) FILTER (WHERE path IS NOT NULL), '[]'::json)
) AS snapshot
FROM (
  SELECT DISTINCT
    '/objects/uploads/' || matches.parts[1] AS path
  FROM (
    SELECT v.value #>> '{}' AS value
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_path_query(to_jsonb(o), 'strict $.** ? (@.type() == "string")') AS v(value)
    UNION ALL
    SELECT v.value #>> '{}' AS value
    FROM public.products p
    CROSS JOIN LATERAL jsonb_path_query(to_jsonb(p), 'strict $.** ? (@.type() == "string")') AS v(value)
    UNION ALL
    SELECT v.value #>> '{}' AS value
    FROM public.manager_settings s
    CROSS JOIN LATERAL jsonb_path_query(to_jsonb(s), 'strict $.** ? (@.type() == "string")') AS v(value)
  ) source
  -- Global matches: one JSON/text value can contain more than one reference.
  -- Normalize encoded URL slashes and UUID casing conservatively for protection.
  CROSS JOIN LATERAL regexp_matches(
    regexp_replace(lower(source.value), '%2f', '/', 'g'),
    '/uploads/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})',
    'g'
  ) AS matches(parts)
) paths;