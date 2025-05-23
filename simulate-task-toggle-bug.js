/**
 * Success Factor Task Toggle Bug Simulation
 * 
 * This script directly demonstrates the task toggle persistence bug by:
 * 1. Finding two projects with the same sourceId for a task
 * 2. Toggling the task in Project A
 * 3. Showing how the buggy code would update a task in Project B instead
 * 4. Demonstrating the fix by enforcing project boundaries
 * 
 * Run with: node simulate-task-toggle-bug.js
 */

import pg from 'pg';
const { Client } = pg;

// The canonical sourceId for the "Ask Why" Success Factor
const TARGET_SOURCE_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

// Project IDs to test with
const PROJECT_A = '9a4c7110-bb5b-4321-a4ba-6c59366c8e96';  // Project where user initiates toggle
const PROJECT_B = '03ec667b-f7d5-496e-9131-7d975f51f8ba';  // Different project with same sourceId

async function simulateBug() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    console.log('=== SIMULATING SUCCESS FACTOR TASK TOGGLE BUG ===\n');
    
    // 1. Get the initial state of tasks in both projects
    console.log('Initial state of tasks:');
    
    const initialQuery = `
      SELECT id, project_id, source_id, completed, text
      FROM project_tasks
      WHERE source_id = $1 AND project_id IN ($2, $3)
      ORDER BY project_id, id;
    `;
    
    const initialResult = await client.query(initialQuery, [TARGET_SOURCE_ID, PROJECT_A, PROJECT_B]);
    console.table(initialResult.rows);
    
    // 2. Find a task to toggle in Project A
    const taskAQuery = `
      SELECT id, project_id, completed 
      FROM project_tasks 
      WHERE source_id = $1 AND project_id = $2 AND completed = false
      LIMIT 1;
    `;
    
    const taskAResult = await client.query(taskAQuery, [TARGET_SOURCE_ID, PROJECT_A]);
    
    if (taskAResult.rows.length === 0) {
      console.log('No toggleable task found in Project A');
      await client.end();
      return;
    }
    
    const taskA = taskAResult.rows[0];
    console.log(`\nSelected task to toggle in Project A: ${taskA.id}, completed = ${taskA.completed}`);
    
    // 3. Simulate the bug: Use the buggy lookup function
    console.log('\n=== SIMULATING BUGGY CODE PATH ===');
    console.log('User trying to toggle task in Project A by sending:');
    console.log(`PUT /api/projects/${PROJECT_A}/tasks/${TARGET_SOURCE_ID}`);
    console.log('Body: { completed: true }');
    
    // This mimics the buggy lookup function that doesn't check project boundaries
    const buggyLookupQuery = `
      SELECT id, project_id, completed 
      FROM project_tasks 
      WHERE source_id = $1
      LIMIT 1;
    `;
    
    const buggyLookupResult = await client.query(buggyLookupQuery, [TARGET_SOURCE_ID]);
    
    if (buggyLookupResult.rows.length === 0) {
      console.log('No task found by sourceId');
      await client.end();
      return;
    }
    
    const wrongTask = buggyLookupResult.rows[0];
    console.log(`\nBuggy lookup found: Task ${wrongTask.id} in Project ${wrongTask.project_id}`);
    
    if (wrongTask.project_id !== PROJECT_A) {
      console.log(`❌ BUG DETECTED: Found task in Project ${wrongTask.project_id} instead of requested Project ${PROJECT_A}`);
    }
    
    // 4. Update the wrong task (simulating the bug)
    await client.query(
      `UPDATE project_tasks SET completed = true WHERE id = $1`,
      [wrongTask.id]
    );
    
    console.log(`\nUpdated wrong task ${wrongTask.id} to completed = true`);
    
    // 5. Check the state after the buggy update
    console.log('\n=== STATE AFTER BUGGY UPDATE ===');
    
    const buggyUpdateQuery = `
      SELECT id, project_id, source_id, completed, text
      FROM project_tasks
      WHERE source_id = $1 AND project_id IN ($2, $3)
      ORDER BY project_id, id;
    `;
    
    const buggyUpdateResult = await client.query(buggyUpdateQuery, [TARGET_SOURCE_ID, PROJECT_A, PROJECT_B]);
    console.table(buggyUpdateResult.rows);
    
    // 6. Check what the UI would show after reload (tasks from Project A only)
    console.log('\n=== WHAT UI SHOWS AFTER PAGE RELOAD ===');
    console.log('GET /api/projects/' + PROJECT_A + '/tasks');
    
    const uiStateQuery = `
      SELECT id, source_id, completed, text
      FROM project_tasks
      WHERE project_id = $1 AND source_id = $2;
    `;
    
    const uiStateResult = await client.query(uiStateQuery, [PROJECT_A, TARGET_SOURCE_ID]);
    console.table(uiStateResult.rows);
    
    console.log("\nEXPLANATION: Even though the toggle appeared to work initially,");
    console.log("after page reload, the task in Project A still shows as uncompleted,");
    console.log("because the update actually affected a task in Project B!");
    
    // 7. Restore original state
    await client.query(
      `UPDATE project_tasks SET completed = $1 WHERE id = $2`,
      [wrongTask.completed, wrongTask.id]
    );
    
    console.log('\n=== DEMONSTRATING FIXED CODE PATH ===');
    console.log('User trying to toggle task in Project A by sending:');
    console.log(`PUT /api/projects/${PROJECT_A}/tasks/${TARGET_SOURCE_ID}`);
    console.log('Body: { completed: true }');
    
    // This mimics the fixed lookup function that properly checks project boundaries
    const fixedLookupQuery = `
      SELECT id, project_id, completed 
      FROM project_tasks 
      WHERE source_id = $1 AND project_id = $2
      LIMIT 1;
    `;
    
    const fixedLookupResult = await client.query(fixedLookupQuery, [TARGET_SOURCE_ID, PROJECT_A]);
    
    if (fixedLookupResult.rows.length === 0) {
      console.log('No task found in the requested project');
    } else {
      const correctTask = fixedLookupResult.rows[0];
      console.log(`\nFixed lookup found: Task ${correctTask.id} in Project ${correctTask.project_id}`);
      
      // Update the correct task
      await client.query(
        `UPDATE project_tasks SET completed = true WHERE id = $1`,
        [correctTask.id]
      );
      
      console.log(`\nUpdated correct task ${correctTask.id} to completed = true`);
      
      // Check state after correct update
      console.log('\n=== STATE AFTER FIXED UPDATE ===');
      
      const fixedUpdateQuery = `
        SELECT id, project_id, source_id, completed, text
        FROM project_tasks
        WHERE source_id = $1 AND project_id IN ($2, $3)
        ORDER BY project_id, id;
      `;
      
      const fixedUpdateResult = await client.query(fixedUpdateQuery, [TARGET_SOURCE_ID, PROJECT_A, PROJECT_B]);
      console.table(fixedUpdateResult.rows);
      
      // Restore again
      await client.query(
        `UPDATE project_tasks SET completed = $1 WHERE id = $2`,
        [taskA.completed, correctTask.id]
      );
    }
    
    console.log('\n=== BUG SUMMARY ===');
    console.log('1. The application has multiple projects with tasks sharing the same sourceId.');
    console.log('2. When looking up tasks by sourceId, the code doesn\'t verify project boundaries.');
    console.log('3. This causes updates intended for Project A to affect tasks in Project B.');
    console.log('4. After page reload, the UI shows the unchanged state in Project A.');
    console.log('\n=== FIX REQUIRED ===');
    console.log('1. Add proper project boundary checking in the task lookup function.');
    console.log('2. When resolving by sourceId, always verify the project matches the requested one.');
    
    await client.end();
    console.log('\nDatabase connection closed');
    
  } catch (err) {
    console.error('Error:', err);
    if (client) await client.end();
  }
}

simulateBug();
