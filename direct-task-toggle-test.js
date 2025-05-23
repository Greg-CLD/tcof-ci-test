/**
 * Direct Task Toggle Test
 * 
 * This script uses only the DB connection to test Success Factor task toggling
 * without any external dependencies.
 */
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';

// Test with a known project that has Success Factor tasks
const TEST_PROJECT_ID = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';

async function runTest() {
  console.log('=== DIRECT SUCCESS FACTOR TASK TOGGLE TEST ===\n');
  
  try {
    // Step 1: Query tasks for the test project directly from database
    console.log('Step 1: Querying database for tasks...');
    
    const tasksBefore = await db.execute(sql`
      SELECT id, source_id, origin, completed, text, project_id
      FROM project_tasks
      WHERE project_id = ${TEST_PROJECT_ID}
      ORDER BY id
    `);
    
    console.log(`Found ${tasksBefore.rows.length} tasks in database for project ${TEST_PROJECT_ID}`);
    
    // Debug output - save task data to file
    await fs.writeFile('tasks-before.json', JSON.stringify(tasksBefore.rows, null, 2));
    
    // Step 2: Find Success Factor tasks
    const successFactorTasks = tasksBefore.rows.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
    
    if (successFactorTasks.length === 0) {
      console.error('No Success Factor tasks found. Test cannot proceed.');
      return;
    }
    
    // Step 3: Select a task to toggle
    const taskToToggle = successFactorTasks[0];
    
    console.log('\nSelected task to toggle:');
    console.log(`ID: ${taskToToggle.id}`);
    console.log(`Origin: ${taskToToggle.origin}`);
    console.log(`Source ID: ${taskToToggle.source_id || 'none'}`);
    console.log(`Current completion state: ${taskToToggle.completed}`);
    
    // Step 4: Toggle the task directly in the database
    const newCompletionState = !taskToToggle.completed;
    console.log(`\nStep 2: Toggling task to ${newCompletionState}...`);
    
    // Include full SQL query for easier debugging 
    console.log(`Running SQL update: 
      UPDATE project_tasks 
      SET completed = ${newCompletionState}
      WHERE id = '${taskToToggle.id}' AND project_id = '${TEST_PROJECT_ID}'
      RETURNING *`);
    
    const updateResult = await db.execute(sql`
      UPDATE project_tasks 
      SET completed = ${newCompletionState}
      WHERE id = ${taskToToggle.id} AND project_id = ${TEST_PROJECT_ID}
      RETURNING *
    `);
    
    console.log(`Update affected ${updateResult.rowCount} rows`);
    
    if (updateResult.rowCount === 0) {
      console.error('❌ FAILURE: Update did not affect any rows!');
      
      // Extra diagnostic - check if task exists
      const taskCheck = await db.execute(sql`
        SELECT id FROM project_tasks 
        WHERE id = ${taskToToggle.id}
      `);
      
      if (taskCheck.rowCount === 0) {
        console.error('Task does not exist in database!');
      } else {
        console.error('Task exists, but update condition did not match!');
      }
      
      return;
    }
    
    // Log the updated task
    console.log('\nUpdated task:');
    console.log(updateResult.rows[0]);
    
    // Step 5: Query the database again to verify persistence
    console.log('\nStep 3: Verifying persistence in database...');
    
    const tasksAfter = await db.execute(sql`
      SELECT id, source_id, origin, completed, text
      FROM project_tasks
      WHERE project_id = ${TEST_PROJECT_ID}
      ORDER BY id
    `);
    
    // Save tasks after to a file
    await fs.writeFile('tasks-after.json', JSON.stringify(tasksAfter.rows, null, 2));
    
    // Find the toggled task
    const toggledTask = tasksAfter.rows.find(t => t.id === taskToToggle.id);
    
    if (!toggledTask) {
      console.error('❌ FAILURE: Task disappeared from database after toggle!');
      return;
    }
    
    console.log('\nTask in database after toggle:');
    console.log(`ID: ${toggledTask.id}`);
    console.log(`Origin: ${toggledTask.origin}`);
    console.log(`Source ID: ${toggledTask.source_id || 'none'}`);
    console.log(`New completion state: ${toggledTask.completed}`);
    
    // Check if the toggle was successful
    if (toggledTask.completed === newCompletionState) {
      console.log('\n✅ SUCCESS: Task toggle was successfully persisted to database!');
    } else {
      console.log('\n❌ FAILURE: Task toggle was not persisted to database!');
      console.log(`Expected: ${newCompletionState}, Actual: ${toggledTask.completed}`);
    }
    
    // Step 6: Final diagnosis
    console.log('\n=== DIAGNOSIS ===');
    
    console.log('1. Task ID Resolution:');
    const exactIdMatch = tasksBefore.rows.find(t => t.id === taskToToggle.id);
    console.log(`- Exact ID match: ${exactIdMatch ? 'SUCCESS' : 'FAILED'}`);
    
    console.log('2. Task Persistence:');
    const dbToggleWorked = toggledTask.completed === newCompletionState;
    console.log(`- Database update: ${dbToggleWorked ? 'SUCCESS' : 'FAILED'}`);
    
    // Analyze source_id to see if it's a potential issue
    if (taskToToggle.source_id) {
      console.log('3. Source ID Analysis:');
      
      // Check for duplicate source_ids
      const sameSourceIdTasks = tasksBefore.rows.filter(t => 
        t.source_id === taskToToggle.source_id
      );
      
      if (sameSourceIdTasks.length > 1) {
        console.log(`- WARNING: Multiple tasks (${sameSourceIdTasks.length}) share the same source_id: "${taskToToggle.source_id}"`);
        console.log('  This could cause task ID resolution problems!');
        
        // Log the duplicate tasks
        console.log('  Duplicate tasks:');
        sameSourceIdTasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ID: ${task.id}, Project: ${task.project_id}, Completed: ${task.completed}`);
        });
      } else {
        console.log(`- Source ID uniqueness: GOOD (source_id "${taskToToggle.source_id}" is unique)`);
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
runTest().then(() => console.log('Test complete'));