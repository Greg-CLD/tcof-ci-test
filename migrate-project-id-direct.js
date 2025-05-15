/**
 * Direct migration script for converting numeric project ID 11 to UUID format
 * 
 * This script uses SQL commands directly to perform the conversion
 * since the ID column in the database is an integer type
 */

import pg from 'pg';

// Our target UUID - using the same deterministic format as our converter
const targetUuid = '00000000-1100-4000-8000-000000000000';

// Database connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateProjectId() {
  const client = await pool.connect();
  
  try {
    console.log(`Starting migration of project ID 11 to UUID: ${targetUuid}`);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check schema to see what columns we're working with
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current schema for projects table:');
    schemaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
    
    // Verify the project exists
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [11]);
    
    if (projectResult.rows.length === 0) {
      console.error('Project with ID 11 not found');
      await client.query('ROLLBACK');
      return;
    }
    
    const project = projectResult.rows[0];
    console.log('Found project to migrate:', project);
    
    // Step 1: Create a temporary table with a UUID column
    await client.query(`
      CREATE TEMP TABLE project_migration AS 
      SELECT * FROM projects WHERE id = 11;
    `);
    
    // Step 2: Add a UUID column to the temp table
    await client.query(`
      ALTER TABLE project_migration ADD COLUMN uuid_id UUID NOT NULL DEFAULT '${targetUuid}';
    `);
    
    // Step 3: Insert the data into the projects table with the new UUID
    // We need to handle the column list explicitly
    const columns = Object.keys(project)
      .filter(col => col !== 'id') // Exclude the original ID column
      .join(', ');
    
    await client.query(`
      INSERT INTO projects (id, ${columns})
      SELECT uuid_id, ${columns} FROM project_migration;
    `);
    
    // Step 4: Remove the original record
    await client.query('DELETE FROM projects WHERE id = 11;');
    
    // Step 5: Check related tables and update references if needed
    // For plans
    try {
      await client.query(`
        UPDATE plans 
        SET project_id = $1 
        WHERE project_id = $2
      `, [targetUuid, '11']);
      console.log('Updated references in plans table');
    } catch (err) {
      console.log('No matching references in plans table');
    }
    
    // For project_tasks
    try {
      await client.query(`
        UPDATE project_tasks 
        SET project_id = $1 
        WHERE project_id = $2
      `, [targetUuid, '11']);
      console.log('Updated references in project_tasks table');
    } catch (err) {
      console.log('No matching references in project_tasks table');
    }
    
    // For success_factor_ratings
    try {
      await client.query(`
        UPDATE success_factor_ratings 
        SET project_id = $1 
        WHERE project_id = $2
      `, [targetUuid, '11']);
      console.log('Updated references in success_factor_ratings table');
    } catch (err) {
      console.log('No matching references in success_factor_ratings table');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Verify the migration
    const newProjectResult = await client.query('SELECT * FROM projects WHERE id = $1', [targetUuid]);
    
    if (newProjectResult.rows.length === 0) {
      console.error('Migration failed: new project not found');
    } else {
      console.log('Migration successful. New project:');
      console.log(newProjectResult.rows[0]);
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateProjectId()
  .then(() => console.log('Migration complete'))
  .catch(err => {
    console.error('Unhandled error during migration:', err);
    process.exit(1);
  });