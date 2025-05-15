-- UUID MIGRATION PHASE 2: Schema transformation - REQUIRES DOWNTIME
-- This phase restructures the schema to use UUIDs as primary keys

-- Start transaction
BEGIN;

\echo 'Phase 2 Migration - Started at: ' `date`
\echo 'WARNING: This migration requires application downtime!'

-- 1. Drop existing foreign key constraints to allow schema changes
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_project_id_fkey;
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_project_id_fkey;
ALTER TABLE success_factor_ratings DROP CONSTRAINT IF EXISTS success_factor_ratings_project_id_fkey;
ALTER TABLE personal_heuristics DROP CONSTRAINT IF EXISTS personal_heuristics_project_id_fkey;
ALTER TABLE outcome_progress DROP CONSTRAINT IF EXISTS outcome_progress_project_id_fkey;

-- 2. Make uuid_id the primary key of projects table
-- First, drop the existing primary key
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pkey;

-- Make sure all uuid_id values are non-null
UPDATE projects SET uuid_id = integer_to_uuid(id) WHERE uuid_id IS NULL;
ALTER TABLE projects ALTER COLUMN uuid_id SET NOT NULL;

-- Add primary key constraint on uuid_id
ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (uuid_id);

-- 3. Rename columns to their final names
-- For projects table
ALTER TABLE projects RENAME COLUMN id TO legacy_id;
ALTER TABLE projects RENAME COLUMN uuid_id TO id;

-- For related tables
ALTER TABLE plans RENAME COLUMN project_id TO legacy_project_id;
ALTER TABLE plans RENAME COLUMN uuid_project_id TO project_id;

ALTER TABLE project_tasks RENAME COLUMN project_id TO legacy_project_id;
ALTER TABLE project_tasks RENAME COLUMN uuid_project_id TO project_id;

ALTER TABLE success_factor_ratings RENAME COLUMN project_id TO legacy_project_id;
ALTER TABLE success_factor_ratings RENAME COLUMN uuid_project_id TO project_id;

ALTER TABLE personal_heuristics RENAME COLUMN project_id TO legacy_project_id;
ALTER TABLE personal_heuristics RENAME COLUMN uuid_project_id TO project_id;

ALTER TABLE outcome_progress RENAME COLUMN project_id TO legacy_project_id;
ALTER TABLE outcome_progress RENAME COLUMN uuid_project_id TO project_id;

-- 4. Add NOT NULL constraints to the UUID columns
ALTER TABLE plans ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE project_tasks ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE success_factor_ratings ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE personal_heuristics ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE outcome_progress ALTER COLUMN project_id SET NOT NULL;

-- 5. Re-establish foreign key relationships with the UUID columns
ALTER TABLE plans
ADD CONSTRAINT plans_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE project_tasks
ADD CONSTRAINT project_tasks_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE success_factor_ratings
ADD CONSTRAINT success_factor_ratings_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE personal_heuristics
ADD CONSTRAINT personal_heuristics_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE outcome_progress
ADD CONSTRAINT outcome_progress_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id);

-- 6. Verification query to check schema and data integrity
SELECT COUNT(*) AS "Projects Count" FROM projects;
SELECT COUNT(*) AS "Plans Count" FROM plans;
SELECT COUNT(*) AS "Project Tasks Count" FROM project_tasks;
SELECT COUNT(*) AS "Success Factor Ratings Count" FROM success_factor_ratings;
SELECT COUNT(*) AS "Personal Heuristics Count" FROM personal_heuristics;
SELECT COUNT(*) AS "Outcome Progress Count" FROM outcome_progress;

-- Check foreign key relationships
SELECT 
    'Plans' AS table_name, 
    COUNT(*) AS total_rows,
    SUM(CASE WHEN project_id IS NULL THEN 1 ELSE 0 END) AS null_project_ids,
    (SELECT COUNT(*) FROM plans p JOIN projects pr ON p.project_id = pr.id) AS valid_references
FROM plans

UNION ALL

SELECT 
    'Project Tasks' AS table_name, 
    COUNT(*) AS total_rows,
    SUM(CASE WHEN project_id IS NULL THEN 1 ELSE 0 END) AS null_project_ids,
    (SELECT COUNT(*) FROM project_tasks pt JOIN projects pr ON pt.project_id = pr.id) AS valid_references
FROM project_tasks

UNION ALL

SELECT 
    'Success Factor Ratings' AS table_name, 
    COUNT(*) AS total_rows,
    SUM(CASE WHEN project_id IS NULL THEN 1 ELSE 0 END) AS null_project_ids,
    (SELECT COUNT(*) FROM success_factor_ratings sfr JOIN projects pr ON sfr.project_id = pr.id) AS valid_references
FROM success_factor_ratings

UNION ALL

SELECT 
    'Personal Heuristics' AS table_name, 
    COUNT(*) AS total_rows,
    SUM(CASE WHEN project_id IS NULL THEN 1 ELSE 0 END) AS null_project_ids,
    (SELECT COUNT(*) FROM personal_heuristics ph JOIN projects pr ON ph.project_id = pr.id) AS valid_references
FROM personal_heuristics

UNION ALL

SELECT 
    'Outcome Progress' AS table_name, 
    COUNT(*) AS total_rows,
    SUM(CASE WHEN project_id IS NULL THEN 1 ELSE 0 END) AS null_project_ids,
    (SELECT COUNT(*) FROM outcome_progress op JOIN projects pr ON op.project_id = pr.id) AS valid_references
FROM outcome_progress;

\echo 'Phase 2 Migration - Completed at: ' `date`

-- Commit transaction
COMMIT;
