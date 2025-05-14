CREATE OR REPLACE VIEW v_success_factors_full AS
SELECT  f.id,
        f.title,
        f.description,
        json_object_agg(ft.stage, COALESCE(ft.tasks, '[]')::json) AS tasks
FROM    success_factors      f
LEFT JOIN (
     SELECT factor_id,
            stage,
            json_agg(text ORDER BY id) FILTER (WHERE text IS NOT NULL) AS tasks
     FROM   success_factor_tasks
     GROUP  BY factor_id, stage
) ft ON ft.factor_id = f.id
GROUP BY f.id, f.title, f.description
ORDER BY f.title;