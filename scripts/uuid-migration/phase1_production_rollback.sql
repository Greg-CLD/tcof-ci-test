-- UUID MIGRATION PHASE 1 ROLLBACK: Remove UUID columns and revert to original schema
-- This script rolls back the Phase 1 migration if necessary

-- Start transaction
BEGIN;

\echo 'Phase 1 Rollback - Started at: ' `date`

-- 1. Drop the UUID columns
ALTER TABLE projects DROP COLUMN IF EXISTS uuid_id;
ALTER TABLE plans DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE project_tasks DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE success_factor_ratings DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE personal_heuristics DROP COLUMN IF EXISTS uuid_project_id;
ALTER TABLE outcome_progress DROP COLUMN IF EXISTS uuid_project_id;

-- 2. Drop the UUID conversion function
DROP FUNCTION IF EXISTS integer_to_uuid;

\echo 'Phase 1 Rollback - Completed at: ' `date`

-- Commit the transaction
COMMIT;
