CREATE OR REPLACE VIEW v_success_factors_full AS
WITH stage_tasks AS (
    SELECT 
        f.id,
        f.title,
        f.description,
        ft.stage,
        ARRAY_AGG(ft.text ORDER BY ft.id) FILTER (WHERE ft.text IS NOT NULL) AS task_array
    FROM 
        success_factors f
    LEFT JOIN 
        success_factor_tasks ft ON f.id = ft.factor_id
    GROUP BY 
        f.id, f.title, f.description, ft.stage
),
factor_stages AS (
    SELECT
        id,
        title,
        description,
        MAX(CASE WHEN stage = 'Identification' THEN task_array ELSE NULL END) AS identification_tasks,
        MAX(CASE WHEN stage = 'Definition' THEN task_array ELSE NULL END) AS definition_tasks,
        MAX(CASE WHEN stage = 'Delivery' THEN task_array ELSE NULL END) AS delivery_tasks,
        MAX(CASE WHEN stage = 'Closure' THEN task_array ELSE NULL END) AS closure_tasks
    FROM 
        stage_tasks
    GROUP BY 
        id, title, description
)
SELECT
    id,
    title,
    description,
    jsonb_build_object(
        'Identification', COALESCE(identification_tasks, ARRAY[]::text[]),
        'Definition', COALESCE(definition_tasks, ARRAY[]::text[]),
        'Delivery', COALESCE(delivery_tasks, ARRAY[]::text[]),
        'Closure', COALESCE(closure_tasks, ARRAY[]::text[])
    ) AS tasks
FROM
    factor_stages
ORDER BY
    title;