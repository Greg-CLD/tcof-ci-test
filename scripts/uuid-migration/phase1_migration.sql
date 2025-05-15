-- MIGRATION SCRIPT PHASE 1
-- ========================
-- This script adds UUID columns and prepares for the migration
-- No schema constraints or primary keys are modified yet
-- Estimated downtime: Minimal (can run during low traffic)

-- Start transaction
BEGIN;

-- 1. Create a backup table to store original data
CREATE TABLE projects_backup AS SELECT * FROM projects;
SELECT COUNT(*) AS "Total Projects Backed Up" FROM projects_backup;

-- 2. Add UUID column to projects table
ALTER TABLE projects ADD COLUMN uuid_id UUID DEFAULT NULL;

-- 3. Create a UUID generation function for reproducible conversions
CREATE OR REPLACE FUNCTION integer_to_uuid(int_id INTEGER) RETURNS UUID AS $$
BEGIN
    RETURN FORMAT('00000000-%04X-4000-8000-000000000000', int_id)::UUID;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Fill UUID values for all existing projects
UPDATE projects SET uuid_id = integer_to_uuid(id);
SELECT id, uuid_id FROM projects ORDER BY id;

-- 5. Add UUID columns to related tables
ALTER TABLE project_tasks ADD COLUMN uuid_project_id UUID DEFAULT NULL;
ALTER TABLE success_factor_ratings ADD COLUMN uuid_project_id UUID DEFAULT NULL;
ALTER TABLE personal_heuristics ADD COLUMN uuid_project_id UUID DEFAULT NULL;
ALTER TABLE plans ADD COLUMN uuid_project_id UUID DEFAULT NULL;
ALTER TABLE outcome_progress ADD COLUMN uuid_project_id UUID DEFAULT NULL;

-- 6. Update the new columns with UUID references
-- For project_tasks
UPDATE project_tasks pt 
SET uuid_project_id = p.uuid_id
FROM projects p 
WHERE pt.project_id::integer = p.id;

-- For success_factor_ratings
UPDATE success_factor_ratings sfr 
SET uuid_project_id = p.uuid_id
FROM projects p 
WHERE sfr.project_id::integer = p.id;

-- For personal_heuristics
UPDATE personal_heuristics ph 
SET uuid_project_id = p.uuid_id
FROM projects p 
WHERE ph.project_id::integer = p.id;

-- For plans
UPDATE plans pl 
SET uuid_project_id = p.uuid_id
FROM projects p 
WHERE pl.project_id::integer = p.id;

-- For outcome_progress
UPDATE outcome_progress op 
SET uuid_project_id = p.uuid_id
FROM projects p 
WHERE op.project_id::integer = p.id;

-- 7. Verification checks for data consistency
SELECT COUNT(*) AS "Projects without UUID" 
FROM projects WHERE uuid_id IS NULL;

SELECT COUNT(*) AS "Project Tasks with Missing UUID" 
FROM project_tasks pt
WHERE pt.project_id IS NOT NULL AND pt.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Success Factor Ratings with Missing UUID" 
FROM success_factor_ratings sfr
WHERE sfr.project_id IS NOT NULL AND sfr.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Personal Heuristics with Missing UUID" 
FROM personal_heuristics ph
WHERE ph.project_id IS NOT NULL AND ph.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Plans with Missing UUID" 
FROM plans pl
WHERE pl.project_id IS NOT NULL AND pl.uuid_project_id IS NULL;

SELECT COUNT(*) AS "Outcome Progress with Missing UUID" 
FROM outcome_progress op
WHERE op.project_id IS NOT NULL AND op.uuid_project_id IS NULL;

-- If all verifications pass, commit transaction
COMMIT;