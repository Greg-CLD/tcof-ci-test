-- UUID MIGRATION PHASE 3: Cleanup legacy columns
-- This phase is optional and can be performed after the application has been running stably with UUIDs

-- Start transaction
BEGIN;

\echo 'Phase 3 Cleanup - Started at: ' `date`

-- 1. Drop legacy columns after confirming everything is working properly
-- Only run this after verification that the application is working properly with UUIDs!
ALTER TABLE projects DROP COLUMN IF EXISTS legacy_id;
ALTER TABLE plans DROP COLUMN IF EXISTS legacy_project_id;
ALTER TABLE project_tasks DROP COLUMN IF EXISTS legacy_project_id;
ALTER TABLE success_factor_ratings DROP COLUMN IF EXISTS legacy_project_id;
ALTER TABLE personal_heuristics DROP COLUMN IF EXISTS legacy_project_id;
ALTER TABLE outcome_progress DROP COLUMN IF EXISTS legacy_project_id;

-- 2. Drop the integer_to_uuid function as it's no longer needed
DROP FUNCTION IF EXISTS integer_to_uuid;

-- 3. Drop backup tables if they're no longer needed
-- WARNING: Only run this if the backups are no longer needed!
DROP TABLE IF EXISTS backup_projects;
DROP TABLE IF EXISTS backup_plans;
DROP TABLE IF EXISTS backup_project_tasks;
DROP TABLE IF EXISTS backup_success_factor_ratings;
DROP TABLE IF EXISTS backup_personal_heuristics;
DROP TABLE IF EXISTS backup_outcome_progress;

\echo 'Phase 3 Cleanup - Completed at: ' `date`

-- Commit transaction
COMMIT;
