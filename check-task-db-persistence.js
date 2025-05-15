/**
 * Script to directly check task persistence in the database
 * This script will:
 * 1. Make a direct connection to the PostgreSQL database
 * 2. List all tasks in the project_tasks table
 * 3. Attempt to create a test task
 * 4. Verify the task was actually saved
 * 5. Remove the test task (optional cleanup)
 */
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Test data for task creation
const TEST_PROJECT_ID = process.argv[2]; // Pass project ID as command line argument
const TEST_TASK_ID = uuidv4();
const TEST_TASK_TEXT = `Test Task ${new Date().toISOString()}`;

if (!TEST_PROJECT_ID) {
  console.error('Error: Project ID must be provided as a command line argument');
  console.error('Usage: node check-task-db-persistence.js PROJECT_ID');
  process.exit(1);
}

async function runTest() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database successfully');
    
    // 1. Check if project_tasks table exists
    console.log('\n1. Checking if project_tasks table exists...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.error('Error: project_tasks table does not exist in the database');
      process.exit(1);
    }
    
    console.log('✅ project_tasks table exists');
    
    // 2. Check table structure
    console.log('\n2. Checking project_tasks table structure...');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Table columns:');
    tableStructure.rows.forEach(column => {
      console.log(`  - ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
    });
    
    // 3. Count existing tasks
    console.log('\n3. Counting existing tasks...');
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM project_tasks;
    `);
    
    const totalTasks = parseInt(countResult.rows[0].count);
    console.log(`Total tasks in database: ${totalTasks}`);
    
    // 4. Find tasks for the specified project
    console.log(`\n4. Finding tasks for project ${TEST_PROJECT_ID}...`);
    const projectTasks = await client.query(`
      SELECT * FROM project_tasks 
      WHERE project_id = $1
      ORDER BY created_at DESC;
    `, [TEST_PROJECT_ID]);
    
    console.log(`Found ${projectTasks.rowCount} tasks for this project`);
    
    if (projectTasks.rowCount > 0) {
      console.log('First task example:');
      console.log(projectTasks.rows[0]);
    }
    
    // 5. Create a test task
    console.log('\n5. Creating test task...');
    console.log(`Task ID: ${TEST_TASK_ID}`);
    console.log(`Project ID: ${TEST_PROJECT_ID}`);
    console.log(`Task Text: ${TEST_TASK_TEXT}`);
    
    const now = new Date();
    
    const insertResult = await client.query(`
      INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, 
        completed, notes, priority, due_date, owner, status, 
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, $11, $12, 
        $13, $14
      ) RETURNING *;
    `, [
      TEST_TASK_ID,
      TEST_PROJECT_ID,
      TEST_TASK_TEXT,
      'identification',
      'custom',
      'test-source',
      false,
      'Test notes',
      'medium',
      null,
      'test-user',
      'To Do',
      now,
      now
    ]);
    
    if (insertResult.rowCount === 1) {
      console.log('✅ Task created successfully:');
      console.log(insertResult.rows[0]);
    } else {
      console.error('❌ Failed to create task - no rows returned');
    }
    
    // 6. Verify the task exists after creation
    console.log('\n6. Verifying task was saved...');
    const verifyResult = await client.query(`
      SELECT * FROM project_tasks WHERE id = $1;
    `, [TEST_TASK_ID]);
    
    if (verifyResult.rowCount === 1) {
      console.log('✅ Task verified in database:');
      console.log(verifyResult.rows[0]);
    } else {
      console.error('❌ CRITICAL ISSUE: Task not found after creation!');
      console.error('The task creation appeared to succeed but the task is not in the database.');
      
      // Check for constraints that might be blocking inserts
      console.log('\nChecking table constraints...');
      const constraints = await client.query(`
        SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'project_tasks';
      `);
      
      console.log('Table constraints:');
      constraints.rows.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type} on ${constraint.column_name}`);
      });
    }
    
    // 7. Cleanup (optional - comment out if you want to keep the test task)
    console.log('\n7. Cleaning up test task...');
    const deleteResult = await client.query(`
      DELETE FROM project_tasks WHERE id = $1 RETURNING id;
    `, [TEST_TASK_ID]);
    
    if (deleteResult.rowCount === 1) {
      console.log(`✅ Test task ${TEST_TASK_ID} deleted successfully`);
    } else {
      console.error(`❌ Failed to delete test task ${TEST_TASK_ID}`);
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
runTest().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});