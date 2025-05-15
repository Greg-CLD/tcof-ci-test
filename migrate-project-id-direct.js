/**
 * Direct migration script for converting numeric project ID 11 to UUID format
 * 
 * This script handles the mismatch between our schema definition (which assumes UUID)
 * and the actual database (which uses integer for project IDs)
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
    
    // First, check the database schema to verify the actual column type
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'id'
    `);
    
    if (schemaResult.rows.length === 0) {
      throw new Error('Could not determine schema for projects.id column');
    }
    
    const idColumnType = schemaResult.rows[0].data_type;
    console.log(`Current projects.id column type: ${idColumnType}`);
    
    // Determine our migration approach based on the actual column type
    if (idColumnType === 'integer') {
      console.log('Database has integer ID column, need to alter table structure');
      await migrateIntegerToUuid(client);
    } else if (idColumnType === 'uuid') {
      console.log('Database already has UUID column, performing data migration only');
      await migrateDataOnly(client);
    } else {
      throw new Error(`Unexpected column type for projects.id: ${idColumnType}`);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
  } catch (error) {
    console.error('Error during migration:', error);
    await client.query('ROLLBACK');
    console.log('Transaction rolled back due to error');
  } finally {
    client.release();
    await pool.end();
  }
}

// Migration strategy for integer ID column -> UUID column
async function migrateIntegerToUuid(client) {
  console.log('Starting migration from integer to UUID...');
  
  // Step 1: Add a new UUID column to the projects table
  await client.query(`
    ALTER TABLE projects 
    ADD COLUMN temp_uuid UUID NOT NULL DEFAULT '${targetUuid}'
  `);
  console.log('Added temporary UUID column');
  
  // Step 2: Create a backup of the original project
  await client.query(`
    CREATE TEMP TABLE project_backup AS 
    SELECT * FROM projects WHERE id = 11
  `);
  
  // Step 3: Update foreign keys in related tables to use the UUID
  // For project_tasks
  try {
    const hasProjectTasks = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'project_tasks'
      )
    `);
    
    if (hasProjectTasks.rows[0].exists) {
      // Check if there's a column reference
      const columnCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'project_tasks' AND column_name = 'project_id'
      `);
      
      if (columnCheck.rows.length > 0) {
        console.log(`project_tasks.project_id data type: ${columnCheck.rows[0].data_type}`);
        
        // Check if there's data to migrate
        const taskCount = await client.query(`
          SELECT COUNT(*) FROM project_tasks WHERE project_id = '11'
        `);
        
        if (parseInt(taskCount.rows[0].count) > 0) {
          console.log(`Found ${taskCount.rows[0].count} tasks to migrate`);
          
          // Depending on the column type, different approaches
          if (columnCheck.rows[0].data_type === 'uuid') {
            // Create new entries with UUID reference
            await client.query(`
              UPDATE project_tasks
              SET project_id = '${targetUuid}'
              WHERE project_id = '11'
            `);
          } else {
            // Handle differently if needed
            console.log(`Skipping task migration due to column type: ${columnCheck.rows[0].data_type}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Issue with project_tasks migration:', err.message);
  }
  
  // Handle other related tables similarly...
  
  // Step 4: Delete the original project from the table
  await client.query(`DELETE FROM projects WHERE id = 11`);
  console.log('Deleted original project with ID 11');
  
  // Step 5: Insert project with new UUID as ID
  const project = (await client.query(`SELECT * FROM project_backup`)).rows[0];
  if (!project) {
    throw new Error('Project backup not found');
  }
  
  const columnNames = Object.keys(project)
    .filter(key => key !== 'id' && key !== 'temp_uuid')
    .join(', ');
  
  await client.query(`
    INSERT INTO projects (id, ${columnNames})
    VALUES ('${targetUuid}', ${Object.keys(project)
      .filter(key => key !== 'id' && key !== 'temp_uuid')
      .map(key => {
        const val = project[key];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (val instanceof Date) return `'${val.toISOString()}'`;
        return val;
      })
      .join(', ')})
  `);
  
  console.log('Created new project with UUID');
  
  // Verify the migration
  const verifyResult = await client.query(`SELECT * FROM projects WHERE id = '${targetUuid}'`);
  if (verifyResult.rows.length === 0) {
    throw new Error('Verification failed: Could not find migrated project');
  }
  
  console.log('Successfully migrated project with data:', verifyResult.rows[0]);
}

// Migration strategy when ID column is already UUID
async function migrateDataOnly(client) {
  console.log('Starting data-only migration...');
  
  // Verify the project exists by numeric ID (might be stored as string)
  const projectResult = await client.query("SELECT * FROM projects WHERE id = '11'");
  
  if (projectResult.rows.length === 0) {
    console.log("Project with ID '11' not found, trying as integer...");
    const projectResultInt = await client.query('SELECT * FROM projects WHERE id = 11');
    
    if (projectResultInt.rows.length === 0) {
      throw new Error('Project with ID 11 not found');
    }
    
    const project = projectResultInt.rows[0];
    console.log('Found project to migrate:', project);
    
    // Create a copy with the new UUID
    const columnNames = Object.keys(project).filter(key => key !== 'id').join(', ');
    const placeholders = Object.keys(project).filter(key => key !== 'id').map((_, i) => `$${i + 2}`).join(', ');
    const values = Object.keys(project).filter(key => key !== 'id').map(key => project[key]);
    
    const insertQuery = `
      INSERT INTO projects (id, ${columnNames})
      VALUES ($1, ${placeholders})
      RETURNING *
    `;
    
    console.log('Executing query:', insertQuery);
    console.log(`With UUID: ${targetUuid}`);
    
    const newProjectResult = await client.query(insertQuery, [targetUuid, ...values]);
    
    if (newProjectResult.rows.length === 0) {
      throw new Error('Failed to create new project with UUID');
    }
    
    console.log('Successfully created new project with UUID:', newProjectResult.rows[0]);
    
    // Update references in related tables
    await updateRelatedTables(client, 11, targetUuid);
    
    // Delete the original project
    await client.query('DELETE FROM projects WHERE id = 11');
    console.log('Successfully deleted original project with ID 11');
  } else {
    console.log('Project already uses string ID, attempting to update to UUID format');
    // For this case, we'd update the existing record to use UUID format
    // This would be a direct update rather than create+delete
    
    await client.query(`
      UPDATE projects
      SET id = '${targetUuid}'
      WHERE id = '11'
    `);
    
    console.log('Updated project ID from "11" to UUID format');
    
    // Update references
    await updateRelatedTables(client, '11', targetUuid);
  }
}

// Helper to update related tables
async function updateRelatedTables(client, oldId, newId) {
  const relatedTables = [
    { name: 'project_tasks', column: 'project_id' },
    { name: 'success_factor_ratings', column: 'project_id' },
    { name: 'personal_heuristics', column: 'project_id' },
    { name: 'plans', column: 'project_id' },
    { name: 'outcome_progress', column: 'project_id' }
  ];
  
  for (const table of relatedTables) {
    try {
      // Check if table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${table.name}'
        )
      `);
      
      if (tableExists.rows[0].exists) {
        // Check for references to update
        const countQuery = `SELECT COUNT(*) FROM ${table.name} WHERE ${table.column} = $1`;
        const countResult = await client.query(countQuery, [oldId]);
        const count = parseInt(countResult.rows[0].count);
        
        if (count > 0) {
          console.log(`Updating ${count} references in ${table.name}`);
          const updateQuery = `UPDATE ${table.name} SET ${table.column} = $1 WHERE ${table.column} = $2`;
          await client.query(updateQuery, [newId, oldId]);
          console.log(`Successfully updated ${table.name} references`);
        } else {
          console.log(`No references found in ${table.name}`);
        }
      } else {
        console.log(`Table ${table.name} does not exist`);
      }
    } catch (err) {
      console.warn(`Error updating references in ${table.name}:`, err.message);
    }
  }
}

// Run the migration
migrateProjectId()
  .then(() => console.log('Migration complete'))
  .catch(err => {
    console.error('Unhandled error during migration:', err);
    process.exit(1);
  });