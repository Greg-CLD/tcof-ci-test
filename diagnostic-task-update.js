/**
 * Direct database diagnostic for Success Factor task update persistence
 * 
 * This script:
 * 1. Connects directly to the database
 * 2. Finds a Success Factor task in a specific project
 * 3. Updates the task completion status in the database
 * 4. Verifies the update was saved correctly
 * 5. Checks how the PUT endpoint processes the update
 */

require('dotenv').config();
const { Client } = require('pg');

async function main() {
  try {
    console.log('=== Task Update Persistence Diagnostic ===');
    
    // Connect to the database
    console.log('Connecting to database...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    console.log('✅ Connected to database');
    
    // Step 1: Find a project with Success Factor tasks
    console.log('\nStep 1: Finding test project...');
    const projectsResult = await client.query('SELECT id, name FROM projects LIMIT 2');
    if (projectsResult.rows.length === 0) {
      console.log('❌ No projects found in database');
      await client.end();
      return;
    }
    
    const projectId = projectsResult.rows[0].id;
    console.log(`Found project: ${projectsResult.rows[0].name} (${projectId})`);
    
    // Step 2: Find a Success Factor task in this project
    console.log('\nStep 2: Finding a Success Factor task...');
    const tasksResult = await client.query(
      `SELECT id, text, completed, origin, source, "sourceId", "projectId" 
       FROM project_tasks 
       WHERE "projectId" = $1 AND (origin = 'factor' OR origin = 'success-factor')
       LIMIT 5`,
      [projectId]
    );
    
    if (tasksResult.rows.length === 0) {
      console.log('❌ No Success Factor tasks found for this project');
      await client.end();
      return;
    }
    
    // Display the tasks
    console.log(`Found ${tasksResult.rows.length} Success Factor tasks:`);
    tasksResult.rows.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id.slice(0, 8)}... | Text: ${task.text.slice(0, 30)}... | Completed: ${task.completed}`);
    });
    
    // Use the first task for testing
    const taskToUpdate = tasksResult.rows[0];
    console.log(`\nSelected task for testing: ${taskToUpdate.id}`);
    console.log(`Initial state: completed=${taskToUpdate.completed}, origin=${taskToUpdate.origin}`);
    
    // Step 3: Directly update the task in the database
    console.log('\nStep 3: Directly updating task in database...');
    const newStatus = !taskToUpdate.completed;
    
    // First query to update
    const updateResult = await client.query(
      `UPDATE project_tasks 
       SET completed = $1, 
           status = $2,
           "updatedAt" = NOW()
       WHERE id = $3 AND "projectId" = $4
       RETURNING id, completed, status, "updatedAt"`,
      [newStatus, newStatus ? 'Done' : 'To Do', taskToUpdate.id, projectId]
    );
    
    if (updateResult.rows.length === 0) {
      console.log('❌ Database update failed - no rows returned');
    } else {
      console.log('✅ Database update successful:');
      console.log(`Task ${updateResult.rows[0].id} updated to completed=${updateResult.rows[0].completed}`);
      console.log(`Updated at: ${updateResult.rows[0].updatedAt}`);
    }
    
    // Step 4: Verify the update was saved
    console.log('\nStep 4: Verifying update was saved...');
    const verifyResult = await client.query(
      `SELECT id, text, completed, status, origin, "updatedAt"
       FROM project_tasks
       WHERE id = $1 AND "projectId" = $2`,
      [taskToUpdate.id, projectId]
    );
    
    if (verifyResult.rows.length === 0) {
      console.log('❌ Task not found after update!');
    } else {
      const updatedTask = verifyResult.rows[0];
      console.log('Task after update:');
      console.log(`ID: ${updatedTask.id}`);
      console.log(`Completed: ${updatedTask.completed}`);
      console.log(`Status: ${updatedTask.status}`);
      console.log(`Origin: ${updatedTask.origin}`);
      console.log(`Updated At: ${updatedTask.updatedAt}`);
      
      if (updatedTask.completed === newStatus) {
        console.log('✅ Task completion status was correctly updated in the database');
      } else {
        console.log('❌ Task completion status was NOT updated correctly in the database');
      }
    }
    
    // Step 5: Check the PUT endpoint execution path
    console.log('\nStep 5: Checking UPDATE route handler in routes.ts...');
    console.log(`Check in server/routes.ts at lines ~1040-1300 for the PUT endpoint`);
    console.log(`Look for a confirmation or transaction commit after the updateTask call`);
    
    await client.end();
    console.log('\n=== Diagnostic Complete ===');
    
  } catch (error) {
    console.error('Error during diagnostic:', error);
  }
}

main();