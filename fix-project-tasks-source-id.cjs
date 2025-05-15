/**
 * Script to fix the source_id column in project_tasks table
 * This script will:
 * 1. Check for mixed task formats (using factor_id and source_id)
 * 2. Migrate data from factor_id to source_id
 * 3. Ensure all tasks have appropriate source_id values
 * 
 * Run with: node fix-project-tasks-source-id.cjs
 */
const pg = require('pg');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixSourceIdColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Starting project_tasks source_id fix...');
    
    // Begin transaction
    await client.query('BEGIN');

    // Check column existence
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
        AND column_name = 'factor_id'
      ) AS has_factor_id,
      EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
        AND column_name = 'source_id'
      ) AS has_source_id;
    `);
    
    const { has_factor_id, has_source_id } = columnCheck.rows[0];
    
    if (!has_factor_id && !has_source_id) {
      console.error('Neither factor_id nor source_id columns exist. Schema seems incorrect.');
      await client.query('ROLLBACK');
      return;
    }
    
    // If source_id doesn't exist, add it
    if (!has_source_id) {
      console.log('Adding missing source_id column...');
      await client.query(`
        ALTER TABLE project_tasks 
        ADD COLUMN source_id TEXT;
      `);
    }
    
    // If both exist, copy data from factor_id to source_id where source_id is null
    if (has_factor_id && has_source_id) {
      console.log('Copying data from factor_id to source_id where needed...');
      await client.query(`
        UPDATE project_tasks 
        SET source_id = factor_id 
        WHERE source_id IS NULL AND factor_id IS NOT NULL;
      `);
      
      // Count updated rows
      const updatedCount = await client.query(`
        SELECT COUNT(*) FROM project_tasks 
        WHERE source_id IS NOT NULL AND factor_id IS NOT NULL 
        AND source_id = factor_id;
      `);
      
      console.log(`Migrated ${updatedCount.rows[0].count} tasks from factor_id to source_id`);
    }
    
    // Set source_id to a generated value for tasks that still have NULL
    console.log('Generating unique source_id values for tasks that have NULL...');
    
    // Get all tasks with NULL source_id
    const nullSourceIdTasks = await client.query(`
      SELECT id FROM project_tasks WHERE source_id IS NULL;
    `);
    
    let updatedCount = 0;
    
    for (const task of nullSourceIdTasks.rows) {
      const newSourceId = `gen-${uuidv4().slice(0, 8)}`;
      await client.query(`
        UPDATE project_tasks 
        SET source_id = $1 
        WHERE id = $2;
      `, [newSourceId, task.id]);
      updatedCount++;
    }
    
    console.log(`Generated new source_id values for ${updatedCount} tasks`);
    
    // Verify no NULL source_id values remain
    const nullCheck = await client.query(`
      SELECT COUNT(*) AS null_count 
      FROM project_tasks 
      WHERE source_id IS NULL;
    `);
    
    if (nullCheck.rows[0].null_count > 0) {
      console.warn(`Warning: ${nullCheck.rows[0].null_count} tasks still have NULL source_id values!`);
    } else {
      console.log('All tasks now have source_id values.');
    }
    
    // Update task_type to origin for consistency if needed
    if (has_factor_id) {
      const hasTaskType = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'project_tasks'
          AND column_name = 'task_type'
        ) AS has_task_type;
      `);
      
      const hasOrigin = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'project_tasks'
          AND column_name = 'origin'
        ) AS has_origin;
      `);
      
      if (hasTaskType.rows[0].has_task_type && hasOrigin.rows[0].has_origin) {
        console.log('Copying data from task_type to origin where needed...');
        await client.query(`
          UPDATE project_tasks 
          SET origin = 
            CASE 
              WHEN task_type = 'custom' THEN 'custom'
              WHEN task_type = 'factor' THEN 'factor'
              WHEN task_type = 'heuristic' THEN 'heuristic'
              WHEN task_type = 'policy' THEN 'policy'
              WHEN task_type = 'framework' THEN 'framework'
              ELSE 'custom'
            END
          WHERE origin IS NULL AND task_type IS NOT NULL;
        `);
        
        const updatedOrigin = await client.query(`
          SELECT COUNT(*) FROM project_tasks 
          WHERE origin IS NOT NULL AND task_type IS NOT NULL;
        `);
        
        console.log(`Updated ${updatedOrigin.rows[0].count} tasks' origin from task_type`);
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Source ID fix completed successfully!');
    
  } catch (error) {
    // If any errors occur, roll back the transaction
    await client.query('ROLLBACK');
    console.error('Error fixing source_id column:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Self-invoking async function
(async function() {
  try {
    await fixSourceIdColumn();
    console.log('Source ID fix script completed.');
    process.exit(0);
  } catch (error) {
    console.error('Source ID fix script failed:', error);
    process.exit(1);
  }
})();