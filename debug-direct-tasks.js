/**
 * Script to directly test task persistence using SQL queries
 * This bypasses the API layer and tests the direct database operations
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function debugDirectTaskPersistence() {
  // For NodeJS type="module"
  const __filename = new URL(import.meta.url).pathname;
  console.log(`Running debug script: ${__filename}`);
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');
    
    console.log('Checking project_tasks table schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Schema for project_tasks table:');
    console.table(schemaResult.rows);
    
    // Generate a random UUID for testing
    const testProjectId = process.argv[2] || uuidv4();
    console.log(`Using test project ID: ${testProjectId}`);
    
    // Check if project exists first - use the CAST to ensure proper type comparison
    const projectExists = await client.query(
      'SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1::uuid)',
      [testProjectId]
    );
    
    if (!projectExists.rows[0].exists) {
      console.log(`Project ${testProjectId} doesn't exist, creating test project...`);
      
      // Create a test project - check schema first
      const projectSchema = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        ORDER BY ordinal_position;
      `);
      
      console.log('Project table schema:');
      console.table(projectSchema.rows);
      
      // Create a test project with proper fields
      await client.query(`
        INSERT INTO projects (id, name, user_id, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, NOW(), NOW())
      `, [testProjectId, 'Test Project for Task Debugging', '1']);
      
      console.log(`Created test project with ID: ${testProjectId}`);
    } else {
      console.log(`Using existing project with ID: ${testProjectId}`);
    }
    
    // Generate a test task
    const testTaskId = uuidv4();
    const taskText = `Direct SQL Test Task ${Date.now()}`;
    
    console.log('Creating task via direct SQL...');
    // Use correct field names based on the schema we retrieved
    const insertResult = await client.query(`
      INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, 
        completed, notes, priority, due_date, owner, status,
        created_at, updated_at
      )
      VALUES (
        $1::uuid, $2::uuid, $3, $4, $5, $6, 
        $7, $8, $9, $10, $11, $12,
        NOW(), NOW()
      )
      RETURNING *
    `, [
      testTaskId,
      testProjectId,
      taskText,
      'identification',
      'custom',
      'direct-debug-test',
      false,
      'Debug test notes',
      'medium',
      '2023-12-31',
      'DirectDebugTest',
      'pending'
    ]);
    
    console.log('Task created successfully:', insertResult.rows[0]);
    
    // Retrieve all tasks for the project
    console.log(`Retrieving tasks for project ${testProjectId}...`);
    const tasksResult = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1::uuid',
      [testProjectId]
    );
    
    console.log(`Found ${tasksResult.rows.length} tasks for project`);
    
    if (tasksResult.rows.length > 0) {
      // Look for the task we just created
      const foundTask = tasksResult.rows.find(task => task.id === testTaskId);
      
      if (foundTask) {
        console.log('Successfully found newly created task in database:');
        console.log(foundTask);
      } else {
        console.log('ERROR: Could not find newly created task in database!');
        console.log('All tasks found:');
        console.log(tasksResult.rows);
      }
    } else {
      console.log('ERROR: No tasks found for project after task creation!');
    }
    
  } catch (error) {
    console.error('Error in direct task persistence debug:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the debug function
debugDirectTaskPersistence();