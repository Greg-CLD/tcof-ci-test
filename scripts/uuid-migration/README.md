# Project ID UUID Migration

## Overview

This directory contains scripts and utilities for migrating project IDs from integer to UUID format. The migration addresses a critical schema mismatch where `schema.ts` defines `project.id` as UUID but the actual database uses integer type.

## Migration Strategy

The migration is divided into three phases:

### Phase 1: Add UUID Columns (Low Risk)
- Adds UUID columns to projects and related tables
- Populates UUID columns with deterministic values derived from integer IDs
- Doesn't modify constraints or primary keys
- Requires minimal to no downtime

### Phase 2: Schema Transformation (Requires Downtime)
- Restructures the schema to use UUID columns as primary keys
- Drops and recreates foreign key constraints
- Renames columns (old IDs become legacy_id, UUID columns become primary id)
- Requires application downtime (~15-30 minutes)

### Phase 3: Cleanup (Optional)
- Removes legacy ID columns after confirming application stability
- Performed days or weeks after Phase 2, once system stability is verified

## Files

- `phase1_production.sql` - Adds UUID columns and populates with values
- `phase1_production_rollback.sql` - Rolls back Phase 1 if needed
- `phase2_production.sql` - Performs schema transformation (requires downtime)
- `phase2_production_rollback.sql` - Rolls back Phase 2 if needed
- `phase3_cleanup.sql` - Removes legacy columns (optional)
- `execute_migration.js` - Script to execute the migration with verification

## UUID Generation

We use a deterministic algorithm to ensure the same numeric ID always generates the same UUID:

```sql
-- SQL Function
CREATE OR REPLACE FUNCTION integer_to_uuid(int_id INTEGER) RETURNS UUID AS $$
BEGIN
    RETURN ('00000000-' || LPAD(to_hex(int_id), 4, '0') || '-4000-8000-000000000000')::UUID;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

```javascript
// JavaScript function
function convertNumericIdToUuid(numericId) {
  const idStr = String(numericId);
  const hexId = parseInt(idStr, 10).toString(16).padStart(4, '0');
  return `00000000-${hexId}-4000-8000-000000000000`;
}
```

## Execution Instructions

1. **Preparation**
   - Create a backup of the database
   - Review the migration scripts
   - Schedule maintenance window for Phase 2

2. **Phase 1: Add UUID Columns**
   ```
   node execute_migration.js 1
   ```
   - Deploy updated code that can handle both ID formats
   - Continue using numeric IDs for a short transition period

3. **Phase 2: Schema Transformation**
   ```
   node execute_migration.js 2
   ```
   - Take application offline
   - Execute Phase 2 migration
   - Deploy code that exclusively uses UUID IDs
   - Bring application back online

4. **Phase 3: Cleanup**
   ```
   node execute_migration.js 3
   ```
   - Perform this phase after verifying application stability
   - Removes legacy columns to simplify the schema

## Rollback Procedures

Each phase has a corresponding rollback script:

```
# To rollback Phase 1
psql -f phase1_production_rollback.sql

# To rollback Phase 2
psql -f phase2_production_rollback.sql
```

## Code Changes Required

1. Update server-side UUID validation and conversion:
   - Add middleware to validate and reject numeric IDs
   - Add utility for deterministic ID conversion
   - Update all project ID handling code

2. Update client-side UUID validation:
   - Add UUID format validation to ProjectContext
   - Filter out any legacy numeric IDs
   - Ensure all API calls use proper UUID format

## Verification Steps

- After Phase 1: Verify all projects have corresponding UUID values
- After Phase 2: Verify all foreign key relationships are intact
- After Phase 3: Verify application functions correctly without legacy columns

## Additional Info

- The migration targets project ID 11 which is the only legacy numeric ID in the system.
- The deterministic UUID conversion ensures consistent IDs across the migration.
- All migrations are wrapped in transactions for atomicity.
