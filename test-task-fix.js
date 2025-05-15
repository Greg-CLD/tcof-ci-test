/**
 * Quick test to verify if task persistence fixes are working
 */
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const { Client } = pg;

/**
 * Convert numeric ID to a deterministic UUID
 * This replicates the same function used in projectsDb.ts
 */
function convertNumericIdToUuid(numericId) {
  // Convert to string to ensure consistent handling of both number and string values
  const idStr = String(numericId);
  
  // Create a deterministic hash based on the ID
  const hash = crypto
    .createHash('md5')
    .update(`project-${idStr}`)
    .digest('hex');
  
  // Format as UUID v4 (with fixed bits as per the standard)
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

// Connect to PostgreSQL database
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testTaskPersistence() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get a project to test with
    const projectResult = await client.query('SELECT id FROM projects LIMIT 1');
    if (projectResult.rows.length === 0) {
      console.log('No projects found. Please create a project first.');
      return;
    }

    const projectId = projectResult.rows[0].id;
    console.log(`Testing with project ID: ${projectId}`);
    
    // Convert project ID to UUID format
    const projectUuid = convertNumericIdToUuid(projectId);
    console.log(`Converted project ID to UUID: ${projectUuid}`);

    // Create a test task with unique text to identify it
    const taskText = `Test task ${new Date().toISOString()}`;
    const taskId = uuidv4();

    console.log(`Creating test task with ID: ${taskId} and text: ${taskText}`);

    // Insert task directly using SQL
    const insertResult = await client.query(
      `INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id,
        completed, notes, priority, due_date, owner, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        taskId,
        projectUuid, // Use the converted UUID
        taskText,
        'identification',
        'custom',
        'test-source',
        false,
        'Test notes',
        'medium',
        new Date().toISOString(), // Use current date for due_date instead of empty string
        'test-owner',
        'pending',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    if (insertResult.rows.length > 0) {
      console.log('Task created successfully:', insertResult.rows[0]);

      // Try to retrieve the task
      console.log('Trying to retrieve the task...');
      
      const selectResult = await client.query(
        'SELECT * FROM project_tasks WHERE id = $1',
        [taskId]
      );

      if (selectResult.rows.length > 0) {
        console.log('Task retrieved successfully:', selectResult.rows[0]);
        console.log('TEST PASSED: Task creation and retrieval working correctly!');
      } else {
        console.log('TEST FAILED: Task was created but could not be retrieved');
      }

      // Retrieve all tasks for the project
      console.log('Retrieving all tasks for the project...');
      
      const allTasksResult = await client.query(
        'SELECT * FROM project_tasks WHERE project_id = $1',
        [projectUuid] // Use the converted UUID
      );

      console.log(`Found ${allTasksResult.rows.length} tasks for project ${projectId}`);
      
      // Clean up - delete the test task
      await client.query('DELETE FROM project_tasks WHERE id = $1', [taskId]);
      console.log('Test task deleted for cleanup');
    } else {
      console.log('TEST FAILED: Failed to create test task');
    }
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

testTaskPersistence();