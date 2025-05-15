-- SCHEMA VALIDATION QUERIES
-- These queries check the database schema before and after migration
-- Run them to verify database structure and collect important information
-- for planning the migration

-- Check current project table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Get primary key information
SELECT 
    tc.table_schema, 
    tc.table_name, 
    tc.constraint_name, 
    kcu.column_name 
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.constraint_type = 'PRIMARY KEY' 
    AND tc.table_name = 'projects';

-- List foreign key constraints referencing projects table
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'projects';

-- Count total projects
SELECT COUNT(*) AS total_projects FROM projects;

-- Sample of project IDs to understand format
SELECT id, name FROM projects ORDER BY id LIMIT 10;

-- Count records in related tables
SELECT 'projects' AS table_name, COUNT(*) FROM projects
UNION ALL
SELECT 'project_tasks', COUNT(*) FROM project_tasks
UNION ALL
SELECT 'success_factor_ratings', COUNT(*) FROM success_factor_ratings
UNION ALL
SELECT 'personal_heuristics', COUNT(*) FROM personal_heuristics
UNION ALL
SELECT 'plans', COUNT(*) FROM plans
UNION ALL
SELECT 'outcome_progress', COUNT(*) FROM outcome_progress;

-- Check project_tasks column types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'project_tasks'
ORDER BY ordinal_position;

-- Check if any tables have existing UUID columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE data_type = 'uuid'
ORDER BY table_name, column_name;