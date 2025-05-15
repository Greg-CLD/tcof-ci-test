/**
 * Debug script to analyze task persistence issues
 * This script will:
 * 1. Get a specific project by ID 
 * 2. Attempt to find all tasks for that project directly from the database
 * 3. Try creating a new task for the project
 * 4. Check if the task was successfully saved by querying the database again
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Create a PostgreSQL client using the DATABASE_URL environment variable
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function debugTaskPersistence() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');

    // Fetch a specific project by its UUID (replace with an actual UUID from your database)
    // You can get this from the database or from your browser's localStorage
    const projectId = process.argv[2];
    
    if (!projectId) {
      console.error('Please provide a project ID as command line argument');
      process.exit(1);
    }
    
    console.log(`Debugging task persistence for project ID: ${projectId}`);
    
    // Step 1: Verify the project exists
    const projectResult = await client.query(
      'SELECT * FROM projects WHERE id = $1::uuid',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      console.error(`Project with ID ${projectId} not found`);
      process.exit(1);
    }
    
    console.log(`Found project: ${JSON.stringify(projectResult.rows[0])}`);
    
    // Step 2: Check for existing tasks for this project
    const existingTasksResult = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1::uuid',
      [projectId]
    );
    
    console.log(`Found ${existingTasksResult.rows.length} existing tasks for project ${projectId}`);
    
    if (existingTasksResult.rows.length > 0) {
      console.log('Sample existing task:', JSON.stringify(existingTasksResult.rows[0]));
    }
    
    // Step 3: Create a new task with a deterministic name for testing
    const newTaskId = uuidv4();
    const now = new Date().toISOString();
    const taskName = `Debug Test Task ${Date.now()}`;
    
    console.log(`Creating new test task: ${taskName} with ID ${newTaskId}`);
    
    const insertResult = await client.query(
      `INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, 
        completed, notes, priority, due_date, owner, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        newTaskId,                              // id
        projectId,                              // project_id
        taskName,                               // text
        'identification',                       // stage
        'custom',                               // origin
        'debug-test',                           // source_id
        false,                                  // completed
        'Created by debug script',              // notes
        'medium',                               // priority
        '',                                     // due_date
        'Debug System',                         // owner
        'pending',                              // status
        now,                                    // created_at
        now                                     // updated_at
      ]
    );
    
    if (insertResult.rows.length === 0) {
      console.error('Failed to insert new task');
    } else {
      console.log('New task inserted successfully:');
      console.log(JSON.stringify(insertResult.rows[0], null, 2));
    }
    
    // Step 4: Verify the task was saved by fetching it back
    const verifyTaskResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [newTaskId]
    );
    
    if (verifyTaskResult.rows.length === 0) {
      console.error(`Failed to find newly created task with ID ${newTaskId}`);
    } else {
      console.log('Verified task exists in database:');
      console.log(JSON.stringify(verifyTaskResult.rows[0], null, 2));
    }
    
    // Step 5: Check for all tasks again after insertion
    const afterTasksResult = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1::uuid',
      [projectId]
    );
    
    console.log(`Found ${afterTasksResult.rows.length} tasks for project ${projectId} after insertion`);
    
    // Step 6: Check database schema for project_tasks table
    const schemaResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position
    `);
    
    console.log('Project tasks table schema:');
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Step 7: Check database schema for projects table
    const projectsSchemaResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    
    console.log('Projects table schema:');
    projectsSchemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Error in debug task persistence:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the debug function
debugTaskPersistence();