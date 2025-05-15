-- ROLLBACK SCRIPT FOR PHASE 1
-- ===========================
-- This script removes all columns added in Phase 1
-- Use if Phase 1 failed or needs to be reversed

BEGIN;

-- Remove UUID columns from related tables
ALTER TABLE project_tasks DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE success_factor_ratings DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE personal_heuristics DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE plans DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE outcome_progress DROP COLUMN IF EXISTS uuid_project_id;

-- Remove UUID column from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS uuid_id;

-- Drop the function for converting integers to UUIDs
DROP FUNCTION IF EXISTS integer_to_uuid;

COMMIT;