/**
 * Simple script to check the database schema for the project_tasks table
 * and test task creation with the correct column types
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');

    // Get the schema for project_tasks
    console.log('Checking project_tasks table schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Schema for project_tasks table:');
    console.table(schemaResult.rows);
    
    // Get a valid project ID from the database
    console.log('Getting existing project IDs...');
    const projectResult = await client.query(`
      SELECT id, user_id, name
      FROM projects
      LIMIT 5;
    `);
    
    if (projectResult.rows.length === 0) {
      console.log('No projects found in the database');
      return;
    }
    
    console.log('Available projects:');
    console.table(projectResult.rows);
    
    // Use the first project ID for testing
    const projectId = projectResult.rows[0].id;
    console.log(`Using project ID: ${projectId} (type: ${typeof projectId})`);
    
    // Get existing tasks for this project
    console.log(`Getting existing tasks for project ${projectId}...`);
    const tasksResult = await client.query(`
      SELECT id, project_id, text, stage, status
      FROM project_tasks
      WHERE project_id = $1
      LIMIT 10;
    `, [projectId]);
    
    console.log(`Found ${tasksResult.rows.length} existing tasks:`);
    if (tasksResult.rows.length > 0) {
      console.table(tasksResult.rows);
    }
    
    // Create a test task
    const taskText = `Test task - ${new Date().toISOString()}`;
    console.log(`Creating test task with text: ${taskText}`);
    
    // Test INSERT using project_id as INT
    if (typeof projectId === 'number') {
      try {
        const insertResult = await client.query(`
          INSERT INTO project_tasks (
            project_id, text, stage, status, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, project_id, text, stage, status;
        `, [
          projectId,
          taskText,
          'identification',
          'pending'
        ]);
        
        console.log('Task created with project_id as NUMBER:');
        console.table(insertResult.rows);
      } catch (err) {
        console.error('Failed to create task with project_id as NUMBER:', err.message);
      }
    }
    
    // Test INSERT using project_id as STRING
    try {
      const insertResult = await client.query(`
        INSERT INTO project_tasks (
          project_id, text, stage, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, project_id, text, stage, status;
      `, [
        String(projectId),
        taskText + ' (string conversion)',
        'identification',
        'pending'
      ]);
      
      console.log('Task created with project_id as STRING:');
      console.table(insertResult.rows);
    } catch (err) {
      console.error('Failed to create task with project_id as STRING:', err.message);
    }
    
    // After insertion, check if the tasks were actually saved
    console.log(`Verifying task creation for project ${projectId}...`);
    const verifyResult = await client.query(`
      SELECT id, project_id, text, stage, status, created_at
      FROM project_tasks
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 5;
    `, [projectId]);
    
    console.log(`Found ${verifyResult.rows.length} tasks after insertion:`);
    console.table(verifyResult.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema()
  .then(() => console.log('Schema check completed'))
  .catch(err => console.error('Schema check failed:', err));