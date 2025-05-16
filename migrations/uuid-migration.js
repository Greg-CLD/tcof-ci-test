/**
 * Migration script to convert success factor IDs from sf-X format to UUID
 * This script:
 * 1. Creates a backup of the original success_factors table
 * 2. Converts sf-X IDs to deterministic UUIDs 
 * 3. Updates references in success_factor_tasks and other related tables
 * 4. Alters the column types to use proper UUID types
 */

import { v5 as uuidv5 } from 'uuid';
import pkg from 'pg';
const { Pool } = pkg;

// Setup the database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// The namespace for generating deterministic UUIDs
// This MUST match the namespace in client/server uuid utils
const TCOF_NAMESPACE = '88c11a30-d9a5-4d97-ac16-01a9f25c2abb';

// Function to convert sf-X format to deterministic UUID
function convertToUuid(id) {
  return uuidv5(id, TCOF_NAMESPACE);
}

async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting UUID migration...');
    
    // Start a transaction
    await client.query('BEGIN');

    // Step 1: Create backups of relevant tables
    console.log('Creating backups of tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_factors_backup AS 
      SELECT * FROM success_factors;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_factor_tasks_backup AS 
      SELECT * FROM success_factor_tasks;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_factor_ratings_backup AS 
      SELECT * FROM success_factor_ratings;
    `);
    console.log('Backups created successfully');

    // Step 2: Get all existing success factors
    const { rows: factors } = await client.query('SELECT id, title FROM success_factors');
    console.log(`Found ${factors.length} success factors to migrate`);

    // Step 3: Create a mapping of old IDs to new UUIDs
    const idMapping = {};
    factors.forEach(factor => {
      idMapping[factor.id] = convertToUuid(factor.id);
      console.log(`Mapping: ${factor.id} -> ${idMapping[factor.id]}`);
    });

    // Step 4: Temporarily disable foreign key constraints by dropping them first
    console.log('Temporarily disabling foreign key constraints...');
    await client.query(`
      ALTER TABLE success_factor_tasks DROP CONSTRAINT IF EXISTS fk_success_factor;
      ALTER TABLE success_factor_ratings DROP CONSTRAINT IF EXISTS success_factor_ratings_factor_id_fkey;
    `);

    // Step 5: Update success_factors table to use UUIDs
    console.log('Updating success_factors with UUID values...');
    for (const oldId in idMapping) {
      const newId = idMapping[oldId];
      await client.query(
        'UPDATE success_factors SET id = $1 WHERE id = $2',
        [newId, oldId]
      );
    }
    console.log('success_factors updated with UUID values');

    // Step 6: Update success_factor_tasks with new UUIDs 
    console.log('Updating success_factor_tasks references...');
    for (const oldId in idMapping) {
      const newId = idMapping[oldId];
      await client.query(
        'UPDATE success_factor_tasks SET factor_id = $1 WHERE factor_id = $2',
        [newId, oldId]
      );
    }
    console.log('success_factor_tasks references updated');

    // Step 7: Update success_factor_ratings with new UUIDs 
    console.log('Updating success_factor_ratings references...');
    for (const oldId in idMapping) {
      const newId = idMapping[oldId];
      await client.query(
        'UPDATE success_factor_ratings SET factor_id = $1 WHERE factor_id = $2',
        [newId, oldId]
      );
    }
    console.log('success_factor_ratings references updated');

    // Step 8: Update project_tasks sourceId with UUIDs (only for factor origins)
    console.log('Updating project_tasks.sourceId references...');
    for (const oldId in idMapping) {
      const newId = idMapping[oldId];
      await client.query(
        'UPDATE project_tasks SET source_id = $1 WHERE source_id = $2 AND origin = $3',
        [newId, oldId, 'factor']
      );
    }
    console.log('project_tasks sourceId references updated');

    // Step 9: Update non-UUID source_ids in project_tasks to random UUIDs
    console.log('Fixing null or empty source_ids...');
    await client.query(`
      UPDATE project_tasks
      SET source_id = gen_random_uuid()::TEXT
      WHERE source_id IS NULL OR source_id = ''
    `);
    
    // Step 10: Ensure all source IDs are valid UUIDs
    console.log('Validating source IDs...');
    const { rows: invalidSourceIds } = await client.query(`
      SELECT id, source_id FROM project_tasks
      WHERE source_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    `);
    
    console.log(`Found ${invalidSourceIds.length} invalid source IDs to fix`);
    for (const task of invalidSourceIds) {
      const newId = uuidv5(task.source_id || task.id, TCOF_NAMESPACE);
      await client.query(
        'UPDATE project_tasks SET source_id = $1 WHERE id = $2',
        [newId, task.id]
      );
    }

    // Step 11: Check and drop dependent views
    console.log('Checking for dependent views...');
    const { rows: views } = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    
    // Save view definitions before dropping
    const viewDefinitions = {};
    for (const view of views) {
      const viewName = view.table_name;
      console.log(`Found view: ${viewName}`);
      
      const { rows: defRows } = await client.query(`
        SELECT pg_get_viewdef('${viewName}'::regclass, true) as view_def
      `);
      
      if (defRows.length > 0) {
        viewDefinitions[viewName] = defRows[0].view_def;
        console.log(`Dropping view: ${viewName}`);
        await client.query(`DROP VIEW IF EXISTS ${viewName}`);
      }
    }
    
    // Step: Alter column types to use proper UUID types
    console.log('Altering column types to UUID...');
    
    // Handle success_factors first
    await client.query(`
      ALTER TABLE success_factors
      ALTER COLUMN id TYPE UUID USING id::UUID
    `);
    
    // Handle success_factor_tasks
    await client.query(`
      ALTER TABLE success_factor_tasks 
      ALTER COLUMN factor_id TYPE UUID USING factor_id::UUID
    `);
    
    // Handle success_factor_ratings
    await client.query(`
      ALTER TABLE success_factor_ratings
      ALTER COLUMN factor_id TYPE UUID USING factor_id::UUID
    `);
    
    // Handle project_tasks
    await client.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN source_id TYPE UUID USING source_id::UUID
    `);
    
    // Set NOT NULL constraint
    await client.query(`
      ALTER TABLE project_tasks
      ALTER COLUMN source_id SET NOT NULL
    `);
    
    // Recreate the views with updated types
    console.log('Recreating views with updated column types...');
    for (const viewName in viewDefinitions) {
      let viewDef = viewDefinitions[viewName];
      console.log(`Recreating view: ${viewName}`);
      await client.query(`CREATE OR REPLACE VIEW ${viewName} AS ${viewDef}`);
    }
    
    // Step 12: Recreate foreign key constraints
    console.log('Recreating foreign key constraints...');
    await client.query(`
      ALTER TABLE success_factor_tasks 
      ADD CONSTRAINT fk_success_factor 
      FOREIGN KEY (factor_id) REFERENCES success_factors (id) ON DELETE CASCADE;
      
      ALTER TABLE success_factor_ratings
      ADD CONSTRAINT success_factor_ratings_factor_id_fkey
      FOREIGN KEY (factor_id) REFERENCES success_factors (id) ON DELETE CASCADE;
    `);
    
    // Verify the migration
    console.log('Verifying migration...');
    const { rows: successFactorsCount } = await client.query('SELECT COUNT(*) FROM success_factors');
    console.log(`Success factors count: ${successFactorsCount[0].count}`);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    // Don't end the pool if this might be called multiple times
    if (process.argv[1].endsWith('uuid-migration.js')) {
      await pool.end();
    }
  }
}

// Export the function for command line execution
export default runMigration;

// Directly run the migration if this script is executed directly
if (process.argv[1].endsWith('uuid-migration.js')) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}