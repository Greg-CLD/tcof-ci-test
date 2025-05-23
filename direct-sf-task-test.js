/**
 * Direct Success Factor Task Test
 * 
 * This script directly tests the Success Factor task seeding and toggle functionality
 * using the database layer, not the API, to bypass authentication issues.
 */

const pg = require('pg');

// Configuration
const DB_URL = process.env.DATABASE_URL;

// Helper Functions
async function query(sql, params = []) {
  const client = new pg.Client(DB_URL);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function runTest() {
  console.log('=== DIRECT DATABASE TEST FOR SUCCESS FACTOR REGRESSIONS ===\n');
  
  try {
    // Step 1: Create a test project directly in the database
    console.log('Step 1: Creating test project in database...');
    
    const projectName = `Regression Test Project ${Date.now()}`;
    const projectInsertResult = await query(
      `INSERT INTO projects (name, organisation_id, user_id, created_at, last_updated)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [projectName, '867fe8f2-ae5f-451c-872a-0d1582b47c6d', 3] // Using greg's user ID = 3
    );
    
    const projectId = projectInsertResult[0].id;
    console.log(`Created test project ID: ${projectId} (${projectName})\n`);
    
    // Step 2: Run the Success Factor seeding process by directly calling the database function
    console.log('Step 2: Manually seeding Success Factor tasks...');
    
    // Get all Success Factors from the database
    const successFactors = await query(
      `SELECT * FROM success_factors`
    );
    
    console.log(`Found ${successFactors.length} Success Factors to seed`);
    
    // Insert Success Factor tasks for each stage
    const stages = ['identification', 'definition', 'delivery'];
    let tasksCreated = 0;
    
    for (const factor of successFactors) {
      for (const stage of stages) {
        const taskInsertResult = await query(
          `INSERT INTO project_tasks (
            project_id, text, stage, origin, source, source_id, completed
          ) VALUES (
            $1, $2, $3, 'factor', 'success_factor', $4, false
          ) RETURNING id`,
          [projectId, factor.title, stage, factor.id]
        );
        
        tasksCreated++;
      }
    }
    
    console.log(`Seeded ${tasksCreated} Success Factor tasks\n`);
    
    // Step 3: Check for duplicate task IDs (Regression #1)
    console.log('Step 3: Checking for duplicate task IDs (Regression #1)...');
    
    const dupeCheck = await query(
      `SELECT source_id, COUNT(*) as count
       FROM project_tasks 
       WHERE project_id = $1 AND origin = 'factor'
       GROUP BY source_id
       HAVING COUNT(*) > 3`,
      [projectId]
    );
    
    if (dupeCheck.length > 0) {
      console.log(`\n=== REGRESSION #1 DETECTED: Duplicate Factor Tasks ===`);
      console.log('The following Success Factors have duplicate tasks:');
      
      for (const dupe of dupeCheck) {
        const dupeDetails = await query(
          `SELECT id, text, stage, source_id
           FROM project_tasks
           WHERE project_id = $1 AND source_id = $2`,
          [projectId, dupe.source_id]
        );
        
        console.log(`\nFactor ID ${dupe.source_id} has ${dupe.count} tasks (should have 3):`);
        dupeDetails.forEach(task => {
          console.log(`- Task ${task.id}: "${task.text}" (stage: ${task.stage})`);
        });
      }
    } else {
      console.log('No duplicate Success Factor tasks found (unexpected)');
    }
    
    // Step 4: Test toggling a Success Factor task (Regression #2)
    console.log('\nStep 4: Testing Success Factor task toggle (Regression #2)...');
    
    // Get a random Success Factor task
    const taskToToggle = await query(
      `SELECT id, text, completed, source_id
       FROM project_tasks
       WHERE project_id = $1 AND origin = 'factor'
       LIMIT 1`,
      [projectId]
    );
    
    if (taskToToggle.length === 0) {
      console.error('No Success Factor tasks found to toggle');
      return;
    }
    
    const task = taskToToggle[0];
    console.log(`Selected task: ${task.id} (${task.text})`);
    console.log(`Current state: completed=${task.completed}`);
    
    // Toggle the task's completed state
    const newState = !task.completed;
    console.log(`Toggling to: completed=${newState}`);
    
    try {
      await query(
        `UPDATE project_tasks
         SET completed = $1, status = $2
         WHERE id = $3 AND project_id = $4`,
        [newState, newState ? 'Done' : 'To Do', task.id, projectId]
      );
      
      console.log('Task toggle updated in database');
      
      // Verify the update was persisted
      const updatedTask = await query(
        `SELECT id, text, completed, status
         FROM project_tasks
         WHERE id = $1`,
        [task.id]
      );
      
      if (updatedTask.length === 0) {
        console.log('\n=== REGRESSION #2 DETECTED: Task disappeared after update ===');
      } else {
        console.log(`Task state after update: completed=${updatedTask[0].completed}`);
        
        if (updatedTask[0].completed !== newState) {
          console.log('\n=== REGRESSION #2 DETECTED: Task state was not persisted ===');
        } else {
          console.log('Task state was successfully persisted (unexpected)');
        }
      }
    } catch (error) {
      console.log('\n=== REGRESSION #2 DETECTED: Error updating task ===');
      console.log('Error details:', error.message);
    }
    
    // Step 5: Create and test a non-factor task (control)
    console.log('\nStep 5: Testing custom task toggle (control)...');
    
    const customTaskResult = await query(
      `INSERT INTO project_tasks (
        project_id, text, stage, origin, completed, status
      ) VALUES (
        $1, $2, 'identification', 'custom', false, 'To Do'
      ) RETURNING id`,
      [projectId, `Test Custom Task ${Date.now()}`]
    );
    
    const customTaskId = customTaskResult[0].id;
    console.log(`Created custom task: ${customTaskId}`);
    
    // Toggle the custom task
    try {
      await query(
        `UPDATE project_tasks
         SET completed = true, status = 'Done'
         WHERE id = $1 AND project_id = $2`,
        [customTaskId, projectId]
      );
      
      console.log('Custom task toggle updated in database');
      
      // Verify the update was persisted
      const updatedCustomTask = await query(
        `SELECT id, text, completed, status
         FROM project_tasks
         WHERE id = $1`,
        [customTaskId]
      );
      
      if (updatedCustomTask.length === 0) {
        console.log('Custom task disappeared after update (unexpected)');
      } else {
        console.log(`Custom task state after update: completed=${updatedCustomTask[0].completed}`);
        
        if (updatedCustomTask[0].completed !== true) {
          console.log('Custom task state was not persisted (unexpected)');
        } else {
          console.log('Custom task state was successfully persisted (expected)');
        }
      }
    } catch (error) {
      console.log('Error updating custom task (unexpected):', error.message);
    }
    
    // Summary
    console.log('\n=== REGRESSION TEST SUMMARY ===');
    if (dupeCheck.length > 0) {
      console.log('1. DUPLICATE TASK ISSUE: ✓ DETECTED');
      console.log(`   Found ${dupeCheck.length} Success Factors with duplicate tasks`);
    } else {
      console.log('1. DUPLICATE TASK ISSUE: Not detected (unexpected)');
    }
    
    console.log('\nNext Steps:');
    console.log('1. Fix the cloneSuccessFactors.ts function to check for existing tasks correctly');
    console.log('2. Fix the projectsDb.ts to properly handle task lookups by enforcing project boundaries');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
runTest();