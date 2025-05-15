-- UUID MIGRATION PHASE 2 ROLLBACK: Revert schema transformation
-- This script rolls back the Phase 2 migration and returns to integer-based primary keys

-- Start transaction
BEGIN;

\echo 'Phase 2 Rollback - Started at: ' `date`
\echo 'WARNING: This rollback requires application downtime!'

-- 1. Drop existing foreign key constraints
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_project_id_fkey;
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_project_id_fkey;
ALTER TABLE success_factor_ratings DROP CONSTRAINT IF EXISTS success_factor_ratings_project_id_fkey;
ALTER TABLE personal_heuristics DROP CONSTRAINT IF EXISTS personal_heuristics_project_id_fkey;
ALTER TABLE outcome_progress DROP CONSTRAINT IF EXISTS outcome_progress_project_id_fkey;

-- 2. Rename columns back to their original names
-- For projects table
ALTER TABLE projects RENAME COLUMN id TO uuid_id;
ALTER TABLE projects RENAME COLUMN legacy_id TO id;

-- For related tables
ALTER TABLE plans RENAME COLUMN project_id TO uuid_project_id;
ALTER TABLE plans RENAME COLUMN legacy_project_id TO project_id;

ALTER TABLE project_tasks RENAME COLUMN project_id TO uuid_project_id;
ALTER TABLE project_tasks RENAME COLUMN legacy_project_id TO project_id;

ALTER TABLE success_factor_ratings RENAME COLUMN project_id TO uuid_project_id;
ALTER TABLE success_factor_ratings RENAME COLUMN legacy_project_id TO project_id;

ALTER TABLE personal_heuristics RENAME COLUMN project_id TO uuid_project_id;
ALTER TABLE personal_heuristics RENAME COLUMN legacy_project_id TO project_id;

ALTER TABLE outcome_progress RENAME COLUMN project_id TO uuid_project_id;
ALTER TABLE outcome_progress RENAME COLUMN legacy_project_id TO project_id;

-- 3. Restore original primary key
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pkey;
ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

-- 4. Re-establish foreign key relationships with integer columns
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

\echo 'Phase 2 Rollback - Completed at: ' `date`

-- Commit transaction
COMMIT;
