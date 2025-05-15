# Task Persistence Fix Guide

This guide explains how to resolve the task persistence issues in the TCOF platform where tasks do not persist after browser refresh.

## Root Cause Analysis

After thorough investigation, we've identified several contributing factors to the task persistence problem:

1. **Schema Mismatch**: The database table (`project_tasks`) has both old column names (`title`, `task_notes`) and new column names (`text`, `notes`), but the Drizzle ORM schema only defines the new columns.

2. **Column Constraints**: The Drizzle schema defines some columns as NOT NULL (text, stage, origin), but the database allows NULL values in these columns.

3. **Source ID Handling**: There's inconsistent use of `factor_id` (old) vs. `source_id` (new) for tracking the origins of tasks.

4. **Authentication Requirements**: All task-related API endpoints require authentication, but test scripts may not be properly authenticated.

## Fix Implementation

We've created several scripts to address these issues:

### 1. Fix Schema Alignment (`fix-project-tasks-schema.cjs`)

This script aligns the database table structure with the Drizzle ORM schema:

- Adds missing columns if they don't exist
- Copies data from old columns to new columns
- Sets NOT NULL constraints to match schema definition
- Ensures all required fields have appropriate default values

```bash
node fix-project-tasks-schema.cjs
```

### 2. Fix Source ID Handling (`fix-project-tasks-source-id.cjs`)

This script ensures consistent use of the `source_id` field:

- Migrates data from `factor_id` to `source_id` where needed
- Generates unique source IDs for tasks that have NULL values
- Updates task origin types for consistency

```bash
node fix-project-tasks-source-id.cjs
```

### 3. Verify Fixes (`test-task-persistence-fix.js`)

This script performs a comprehensive test of task persistence:

- Authenticates with the application
- Creates a test task and verifies it in the database
- Confirms task is retrievable via the API
- Updates the task and verifies changes persist
- Cleans up by deleting the test task

```bash
node test-task-persistence-fix.js
```

## Additional Debugging Tools

1. **Database Schema Inspector**: Use `check-task-schema.js` to examine the actual database schema.

2. **Task Persistence Tester Component**: A UI component at `/task-persistence-test` that allows manual testing of task operations.

3. **API Test Scripts**: Scripts in the root directory for testing task API endpoints: `test-task-api.js`, `test-task-persistence.js`.

## Fix Verification Checklist

- [ ] Schema alignment script completed without errors
- [ ] Source ID fix script completed without errors 
- [ ] Test script passes all checks (create, read, update, delete)
- [ ] Web UI can successfully create tasks that persist after refresh
- [ ] Tasks properly appear in the project checklist

## Implementation Notes

- These fixes do not alter the application code, only the database structure
- The fix is backward compatible with existing task data
- The scripts use transactions to ensure data integrity during updates
- All operations are logged for transparency and debugging