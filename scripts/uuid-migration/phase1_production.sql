-- UUID MIGRATION PHASE 1: Add UUID columns and populate with deterministic values
-- This phase is non-destructive and can be performed with minimal downtime

-- Start transaction
BEGIN;

-- Record start time for monitoring
\echo 'Phase 1 Migration - Started at: ' `date`

-- 1. Create a UUID generation function for reproducible conversions
CREATE OR REPLACE FUNCTION integer_to_uuid(int_id INTEGER) RETURNS UUID AS $$
BEGIN
    RETURN ('00000000-' || LPAD(to_hex(int_id), 4, '0') || '-4000-8000-000000000000')::UUID;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add UUID columns to projects and related tables
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT NULL;

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS uuid_project_id UUID DEFAULT NULL;

ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS uuid_project_id UUID DEFAULT NULL;

ALTER TABLE success_factor_ratings
ADD COLUMN IF NOT EXISTS uuid_project_id UUID DEFAULT NULL;

ALTER TABLE personal_heuristics
ADD COLUMN IF NOT EXISTS uuid_project_id UUID DEFAULT NULL;

ALTER TABLE outcome_progress
ADD COLUMN IF NOT EXISTS uuid_project_id UUID DEFAULT NULL;

-- 3. Populate the UUID columns with deterministic values
-- For projects table
UPDATE projects
SET uuid_id = integer_to_uuid(id)
WHERE uuid_id IS NULL;

-- For plans
UPDATE plans p
SET uuid_project_id = projects.uuid_id
FROM projects
WHERE p.project_id = projects.id AND p.uuid_project_id IS NULL;

-- For project_tasks
UPDATE project_tasks pt
SET uuid_project_id = projects.uuid_id
FROM projects
WHERE pt.project_id = projects.id AND pt.uuid_project_id IS NULL;

-- For success_factor_ratings
UPDATE success_factor_ratings sfr
SET uuid_project_id = projects.uuid_id
FROM projects
WHERE sfr.project_id = projects.id AND sfr.uuid_project_id IS NULL;

-- For personal_heuristics
UPDATE personal_heuristics ph
SET uuid_project_id = projects.uuid_id
FROM projects
WHERE ph.project_id = projects.id AND ph.uuid_project_id IS NULL;

-- For outcome_progress
UPDATE outcome_progress op
SET uuid_project_id = projects.uuid_id
FROM projects
WHERE op.project_id = projects.id AND op.uuid_project_id IS NULL;

-- 4. Verification checks for data consistency
SELECT COUNT(*) AS "Projects without UUID" 
FROM projects WHERE uuid_id IS NULL;

SELECT COUNT(*) AS "Plans with Missing UUID" 
FROM plans p
WHERE p.project_id IS NOT NULL AND p.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Project Tasks with Missing UUID" 
FROM project_tasks pt
WHERE pt.project_id IS NOT NULL AND pt.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Success Factor Ratings with Missing UUID" 
FROM success_factor_ratings sfr
WHERE sfr.project_id IS NOT NULL AND sfr.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Personal Heuristics with Missing UUID" 
FROM personal_heuristics ph
WHERE ph.project_id IS NOT NULL AND ph.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Outcome Progress with Missing UUID" 
FROM outcome_progress op
WHERE op.project_id IS NOT NULL AND op.uuid_project_id IS NULL;

-- 5. Create backup tables (snapshot of current state)
CREATE TABLE IF NOT EXISTS backup_projects AS 
SELECT * FROM projects;

CREATE TABLE IF NOT EXISTS backup_plans AS
SELECT * FROM plans;

CREATE TABLE IF NOT EXISTS backup_project_tasks AS
SELECT * FROM project_tasks;

CREATE TABLE IF NOT EXISTS backup_success_factor_ratings AS
SELECT * FROM success_factor_ratings;

CREATE TABLE IF NOT EXISTS backup_personal_heuristics AS
SELECT * FROM personal_heuristics;

CREATE TABLE IF NOT EXISTS backup_outcome_progress AS
SELECT * FROM outcome_progress;

\echo 'Phase 1 Migration - Completed at: ' `date`

-- Commit the transaction
COMMIT;
