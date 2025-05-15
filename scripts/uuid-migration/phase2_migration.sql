-- MIGRATION SCRIPT PHASE 2
-- ========================
-- This script replaces primary keys and foreign key constraints
-- !!! IMPORTANT: Full application downtime required !!!
-- Estimated downtime: 15-30 minutes

BEGIN;

-- 1. First check that all data is properly mapped
DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM projects WHERE uuid_id IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % projects found without UUID mapped', unmapped_count;
    END IF;
END $$;

-- 2. Update foreign key references one table at a time
-- For project_tasks
ALTER TABLE project_tasks DROP CONSTRAINT IF EXISTS project_tasks_project_id_fkey;
ALTER TABLE project_tasks DROP COLUMN project_id;
ALTER TABLE project_tasks RENAME COLUMN uuid_project_id TO project_id;
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (uuid_id);

-- For success_factor_ratings
ALTER TABLE success_factor_ratings DROP CONSTRAINT IF EXISTS success_factor_ratings_project_id_fkey;
ALTER TABLE success_factor_ratings DROP COLUMN project_id;
ALTER TABLE success_factor_ratings RENAME COLUMN uuid_project_id TO project_id;
ALTER TABLE success_factor_ratings ADD CONSTRAINT success_factor_ratings_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (uuid_id);

-- For personal_heuristics
ALTER TABLE personal_heuristics DROP CONSTRAINT IF EXISTS personal_heuristics_project_id_fkey;
ALTER TABLE personal_heuristics DROP COLUMN project_id;
ALTER TABLE personal_heuristics RENAME COLUMN uuid_project_id TO project_id;
ALTER TABLE personal_heuristics ADD CONSTRAINT personal_heuristics_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (uuid_id);

-- For plans
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_project_id_fkey;
ALTER TABLE plans DROP COLUMN project_id;
ALTER TABLE plans RENAME COLUMN uuid_project_id TO project_id;
ALTER TABLE plans ADD CONSTRAINT plans_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (uuid_id);

-- For outcome_progress
ALTER TABLE outcome_progress DROP CONSTRAINT IF EXISTS outcome_progress_project_id_fkey;
ALTER TABLE outcome_progress DROP COLUMN project_id;
ALTER TABLE outcome_progress RENAME COLUMN uuid_project_id TO project_id;
ALTER TABLE outcome_progress ADD CONSTRAINT outcome_progress_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects (uuid_id);

-- 3. Update projects table - this is the most critical step
ALTER TABLE projects DROP CONSTRAINT projects_pkey;
ALTER TABLE projects ADD PRIMARY KEY (uuid_id);
ALTER TABLE projects DROP COLUMN id;
ALTER TABLE projects RENAME COLUMN uuid_id TO id;

-- 4. Recreate any indexes that referenced the old column
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_success_factor_ratings_project_id ON success_factor_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_personal_heuristics_project_id ON personal_heuristics(project_id);
CREATE INDEX IF NOT EXISTS idx_plans_project_id ON plans(project_id);
CREATE INDEX IF NOT EXISTS idx_outcome_progress_project_id ON outcome_progress(project_id);

-- 5. Final validation
DO $$
DECLARE
    missing_constraints INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_constraints 
    FROM information_schema.table_constraints 
    WHERE table_name = 'projects' AND constraint_type = 'PRIMARY KEY';
    
    IF missing_constraints = 0 THEN
        RAISE EXCEPTION 'Migration verification failed: Missing primary key on projects table';
    END IF;
END $$;

-- If all validations pass, commit transaction
COMMIT;