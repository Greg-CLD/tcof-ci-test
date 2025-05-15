/**
 * Script to migrate numeric project IDs to UUID format
 * 
 * This script:
 * 1. Finds all projects with numeric IDs
 * 2. Converts them to UUIDs using our deterministic algorithm
 * 3. Updates the database records
 * 
 * NOTE: This script contains a local implementation of the convertNumericIdToUuid
 * function that has been removed from the main codebase as part of the UUID migration.
 * The application now only supports UUID format and rejects numeric IDs.
 */

import pg from 'pg';

/**
 * Converts a numeric ID to a UUID using a deterministic algorithm
 * This is a local implementation for the migration script only
 * 
 * @param {string|number} numericId The numeric ID to convert
 * @returns {string} A UUID format string derived from the numeric ID
 */
function convertNumericIdToUuid(numericId) {
  // Convert to string first
  const idStr = String(numericId);
  
  // Convert to hexadecimal and pad to 4 characters
  const hexId = parseInt(idStr, 10).toString(16).padStart(4, '0');
  
  // Create deterministic UUID following our PostgreSQL format
  return `00000000-${hexId}-4000-8000-000000000000`;
}

// Create a connection pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateNumericProjectIds() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration of numeric project IDs to UUIDs...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Find all projects with numeric IDs
    const { rows: projects } = await client.query(`
      SELECT id 
      FROM projects 
      WHERE id ~ '^[0-9]+$'
    `);
    
    console.log(`Found ${projects.length} projects with numeric IDs`);
    
    // Process each project
    const migrations = [];
    for (const project of projects) {
      const numericId = project.id;
      const uuidId = convertNumericIdToUuid(numericId);
      
      console.log(`Converting project ID: ${numericId} -> ${uuidId}`);
      
      // Update the project record
      await client.query(`
        UPDATE projects 
        SET id = $1 
        WHERE id = $2
      `, [uuidId, numericId]);
      
      // Update related records in other tables
      // We should check each table that might have project_id as a foreign key
      
      // Update tasks table if it exists
      try {
        await client.query(`
          UPDATE project_tasks 
          SET project_id = $1 
          WHERE project_id = $2
        `, [uuidId, numericId]);
      } catch (err) {
        console.log('No project_tasks table or no matching records');
      }
      
      // Add any other tables with project_id foreign keys here
      try {
        await client.query(`
          UPDATE success_factor_ratings 
          SET project_id = $1 
          WHERE project_id = $2
        `, [uuidId, numericId]);
      } catch (err) {
        console.log('No success_factor_ratings table or no matching records');
      }
      
      try {
        await client.query(`
          UPDATE personal_heuristics 
          SET project_id = $1 
          WHERE project_id = $2
        `, [uuidId, numericId]);
      } catch (err) {
        console.log('No personal_heuristics table or no matching records');
      }
      
      migrations.push({ numericId, uuidId });
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Print migration report
    console.log('\nMigration Report:');
    console.log('=================');
    
    if (migrations.length === 0) {
      console.log('No migrations performed - all projects already have UUID IDs');
    } else {
      console.log('The following projects were migrated:');
      migrations.forEach(m => {
        console.log(`Original ID: ${m.numericId} -> New UUID: ${m.uuidId}`);
      });
    }
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    // Roll back in case of error
    await client.query('ROLLBACK');
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateNumericProjectIds().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});