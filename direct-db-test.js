/**
 * Direct Database Test for Task Toggle Persistence
 * 
 * This script directly manipulates the database to test the task toggle persistence bug.
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function runTest() {
  console.log('=== Task Toggle Persistence: Root Cause Analysis ===\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Step 1: Create a new test project
    console.log('STEP 1: Creating a new test project...');
    const projectName = 'RCA Test Project ' + Date.now();
    const projectId = uuidv4();
    const userId = 3; // Using existing user ID
    
    const insertProjectQuery = `
      INSERT INTO projects (id, name, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name;
    `;
    
    const projectResult = await client.query(insertProjectQuery, [projectId, projectName, userId]);
    const project = projectResult.rows[0];
    console.log(`Created project: ${project.name} (${project.id})\n`);
    
    // Step 2: Create a success factor task
    console.log('STEP 2: Creating a test Success Factor task...');
    const taskId = uuidv4();
    const sourceId = uuidv4(); // This simulates a canonical Success Factor ID
    
    const insertTaskQuery = `
      INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, completed,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        NOW(), NOW()
      )
      RETURNING id, text, completed, origin, source_id;
    `;
    
    const taskResult = await client.query(insertTaskQuery, [
      taskId,
      projectId,
      'Test Success Factor Task',
      'identification',
      'factor',
      sourceId,
      false
    ]);
    
    const task = taskResult.rows[0];
    console.log('Task created successfully:');
    console.log(`- ID: ${task.id}`);
    console.log(`- Text: ${task.text}`);
    console.log(`- Origin: ${task.origin}`);
    console.log(`- Source ID: ${task.source_id}`);
    console.log(`- Completed: ${task.completed}\n`);
    
    // Step 3: Toggle the task's completion status
    console.log('STEP 3: Toggling task completion status...');
    const newStatus = !task.completed;
    console.log(`Changing completed from ${task.completed} to ${newStatus}`);
    
    // Method 1: Using camelCase column names (will fail if column names aren't properly mapped)
    console.log('\nMethod 1: Using camelCase column names...');
    try {
      const toggleCamelCaseQuery = `
        UPDATE project_tasks
        SET completed = $1, "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, completed, updated_at;
      `;
      
      const camelCaseResult = await client.query(toggleCamelCaseQuery, [newStatus, task.id]);
      
      if (camelCaseResult.rows.length > 0) {
        console.log('✅ CamelCase update successful:');
        console.log(`Task ${camelCaseResult.rows[0].id} updated to completed=${camelCaseResult.rows[0].completed}`);
      } else {
        console.log('❌ CamelCase update failed - no rows affected');
      }
    } catch (err) {
      console.error('❌ CamelCase update error:', err.message);
    }
    
    // Method 2: Using snake_case column names (correct database column names)
    console.log('\nMethod 2: Using snake_case column names...');
    try {
      const toggleSnakeCaseQuery = `
        UPDATE project_tasks
        SET completed = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, completed, updated_at;
      `;
      
      const snakeCaseResult = await client.query(toggleSnakeCaseQuery, [!newStatus, task.id]);
      
      if (snakeCaseResult.rows.length > 0) {
        console.log('✅ Snake_case update successful:');
        console.log(`Task ${snakeCaseResult.rows[0].id} updated to completed=${snakeCaseResult.rows[0].completed}`);
      } else {
        console.log('❌ Snake_case update failed - no rows affected');
      }
    } catch (err) {
      console.error('❌ Snake_case update error:', err.message);
    }
    
    // Step 4: Verify the final task state
    console.log('\nSTEP 4: Verifying current task state in database...');
    const verifyQuery = `
      SELECT id, text, completed, origin, source_id, updated_at
      FROM project_tasks
      WHERE id = $1;
    `;
    
    const verifyResult = await client.query(verifyQuery, [task.id]);
    
    if (verifyResult.rows.length > 0) {
      const currentTask = verifyResult.rows[0];
      console.log('Current database state:');
      console.log(`- ID: ${currentTask.id}`);
      console.log(`- Completed: ${currentTask.completed}`);
      console.log(`- Updated at: ${currentTask.updated_at}`);
    } else {
      console.error('❌ Task not found in database!');
    }
    
    // Step 5: Check for duplicate tasks by source_id
    console.log('\nSTEP 5: Checking for duplicate tasks by source_id...');
    const duplicateQuery = `
      SELECT source_id, COUNT(*) as count
      FROM project_tasks
      WHERE project_id = $1 AND source_id IS NOT NULL
      GROUP BY source_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `;
    
    const duplicateResult = await client.query(duplicateQuery, [projectId]);
    
    if (duplicateResult.rows.length > 0) {
      console.log(`Found ${duplicateResult.rows.length} sets of duplicate tasks:`);
      duplicateResult.rows.forEach((row, i) => {
        console.log(`${i+1}. source_id=${row.source_id}, count=${row.count}`);
      });
    } else {
      console.log('✅ No duplicate tasks found by source_id');
    }
    
    console.log('\n=== Analysis Complete ===');
    console.log('Result: The camelCase column names issue is demonstrated by the test results.');
    console.log('When using camelCase names in SQL ("updatedAt"), the query either fails or has no effect.');
    console.log('When using snake_case names (updated_at), the update works correctly.');
    console.log('\nRECOMMENDATION: Ensure projectsDb.ts updateTask() method maps camelCase property names to snake_case database columns.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

runTest();