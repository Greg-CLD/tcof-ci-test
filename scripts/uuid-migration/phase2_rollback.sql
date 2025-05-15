-- ROLLBACK SCRIPT FOR PHASE 2
-- ===========================
-- This script rolls back the schema changes made in Phase 2
-- WARNING: Only use if Phase 2 fails - this will restore the integer ID schema
-- NOTE: Requires the projects_backup table from Phase 1

BEGIN;

-- 1. Add back the integer id column to projects
ALTER TABLE projects ADD COLUMN integer_id INTEGER;

-- 2. Restore original IDs from backup
UPDATE projects p
SET integer_id = pb.id
FROM projects_backup pb
WHERE p.id = integer_to_uuid(pb.id);

-- 3. Drop primary key constraint
ALTER TABLE projects DROP CONSTRAINT projects_pkey;

-- 4. Add primary key on integer_id
ALTER TABLE projects ADD PRIMARY KEY (integer_id);

-- 5. Rename columns
ALTER TABLE projects RENAME COLUMN id TO uuid_id;
ALTER TABLE projects RENAME COLUMN integer_id TO id;

-- 6. Now restore foreign key columns for all related tables
-- For project_tasks
ALTER TABLE project_tasks ADD COLUMN integer_project_id INTEGER;
UPDATE project_tasks pt
SET integer_project_id = p.id
FROM projects p
WHERE pt.project_id = p.uuid_id;
ALTER TABLE project_tasks DROP CONSTRAINT project_tasks_project_id_fkey;
ALTER TABLE project_tasks DROP COLUMN project_id;
ALTER TABLE project_tasks RENAME COLUMN integer_project_id TO project_id;
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (id);

-- For success_factor_ratings
ALTER TABLE success_factor_ratings ADD COLUMN integer_project_id INTEGER;
UPDATE success_factor_ratings sfr
SET integer_project_id = p.id
FROM projects p
WHERE sfr.project_id = p.uuid_id;
ALTER TABLE success_factor_ratings DROP CONSTRAINT success_factor_ratings_project_id_fkey;
ALTER TABLE success_factor_ratings DROP COLUMN project_id;
ALTER TABLE success_factor_ratings RENAME COLUMN integer_project_id TO project_id;
ALTER TABLE success_factor_ratings ADD CONSTRAINT success_factor_ratings_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (id);

-- For personal_heuristics
ALTER TABLE personal_heuristics ADD COLUMN integer_project_id INTEGER;
UPDATE personal_heuristics ph
SET integer_project_id = p.id
FROM projects p
WHERE ph.project_id = p.uuid_id;
ALTER TABLE personal_heuristics DROP CONSTRAINT personal_heuristics_project_id_fkey;
ALTER TABLE personal_heuristics DROP COLUMN project_id;
ALTER TABLE personal_heuristics RENAME COLUMN integer_project_id TO project_id;
ALTER TABLE personal_heuristics ADD CONSTRAINT personal_heuristics_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (id);

-- For plans
ALTER TABLE plans ADD COLUMN integer_project_id INTEGER;
UPDATE plans pl
SET integer_project_id = p.id
FROM projects p
WHERE pl.project_id = p.uuid_id;
ALTER TABLE plans DROP CONSTRAINT plans_project_id_fkey;
ALTER TABLE plans DROP COLUMN project_id;
ALTER TABLE plans RENAME COLUMN integer_project_id TO project_id;
ALTER TABLE plans ADD CONSTRAINT plans_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (id);

-- For outcome_progress
ALTER TABLE outcome_progress ADD COLUMN integer_project_id INTEGER;
UPDATE outcome_progress op
SET integer_project_id = p.id
FROM projects p
WHERE op.project_id = p.uuid_id;
ALTER TABLE outcome_progress DROP CONSTRAINT outcome_progress_project_id_fkey;
ALTER TABLE outcome_progress DROP COLUMN project_id;
ALTER TABLE outcome_progress RENAME COLUMN integer_project_id TO project_id;
ALTER TABLE outcome_progress ADD CONSTRAINT outcome_progress_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (id);

COMMIT;