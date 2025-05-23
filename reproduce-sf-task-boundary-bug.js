/**
 * Success Factor Task Toggle Bug Reproduction
 * 
 * This script conclusively reproduces the Success Factor task toggle persistence bug by:
 * 1. Finding multiple projects with the same Success Factor sourceId
 * 2. Simulating the actual task toggle request with the bug in our lookup logic
 * 3. Checking the database state before and after the update
 * 
 * Run with: node reproduce-sf-task-boundary-bug.js
 */

import pkg from 'pg';
const { Client } = pkg;

// The canonical sourceId for a Success Factor task (Ask Why)
const TARGET_SOURCE_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to the database');
  return client;
}

/**
 * Find all tasks with a specific sourceId across all projects
 */
async function findTasksBySourceId(client, sourceId) {
  const query = `
    SELECT id, project_id, text, origin, source_id, completed 
    FROM project_tasks 
    WHERE source_id = $1
  `;
  
  const result = await client.query(query, [sourceId]);
  return result.rows;
}

/**
 * Find a task by its ID in a specific project
 */
async function findTaskByIdInProject(client, taskId, projectId) {
  const query = `
    SELECT id, project_id, text, origin, source_id, completed 
    FROM project_tasks 
    WHERE id = $1 AND project_id = $2
  `;
  
  const result = await client.query(query, [taskId, projectId]);
  return result.rows[0] || null;
}

/**
 * The buggy task lookup function (simplified version of what's in the app)
 * that doesn't properly enforce project boundaries
 */
async function buggyFindTaskById(client, taskId, projectId) {
  console.log(`[BUGGY LOOKUP] Looking for task ${taskId} in project ${projectId}`);
  
  // Step 1: Try to find task by exact ID in the project (works correctly)
  const byIdQuery = `
    SELECT id, project_id, text, origin, source_id, completed 
    FROM project_tasks 
    WHERE id = $1 AND project_id = $2
  `;
  
  const byIdResult = await client.query(byIdQuery, [taskId, projectId]);
  
  if (byIdResult.rows.length > 0) {
    console.log('[BUGGY LOOKUP] ✅ Found task by exact ID match');
    return byIdResult.rows[0];
  }
  
  // Step 2 (BUG): Look for task by sourceId WITHOUT checking project boundary
  const bySourceIdQuery = `
    SELECT id, project_id, text, origin, source_id, completed 
    FROM project_tasks 
    WHERE source_id = $1
    LIMIT 1
  `;
  
  const bySourceIdResult = await client.query(bySourceIdQuery, [taskId]);
  
  if (bySourceIdResult.rows.length > 0) {
    const task = bySourceIdResult.rows[0];
    console.log(`[BUGGY LOOKUP] ⚠️ Found task by sourceId in project ${task.project_id} (requested project: ${projectId})`);
    if (task.project_id !== projectId) {
      console.log('[BUGGY LOOKUP] ❌ PROJECT BOUNDARY VIOLATION!');
    }
    return task;
  }
  
  console.log('[BUGGY LOOKUP] Task not found by any method');
  return null;
}

/**
 * The fixed task lookup function that properly enforces project boundaries
 */
async function fixedFindTaskById(client, taskId, projectId) {
  console.log(`[FIXED LOOKUP] Looking for task ${taskId} in project ${projectId}`);
  
  // Step 1: Try to find task by exact ID in the project (same as before)
  const byIdQuery = `
    SELECT id, project_id, text, origin, source_id, completed 
    FROM project_tasks 
    WHERE id = $1 AND project_id = $2
  `;
  
  const byIdResult = await client.query(byIdQuery, [taskId, projectId]);
  
  if (byIdResult.rows.length > 0) {
    console.log('[FIXED LOOKUP] ✅ Found task by exact ID match');
    return byIdResult.rows[0];
  }
  
  // Step 2 (FIXED): Look for task by sourceId WITH project boundary check
  const bySourceIdQuery = `
    SELECT id, project_id, text, origin, source_id, completed 
    FROM project_tasks 
    WHERE source_id = $1 AND project_id = $2
  `;
  
  const bySourceIdResult = await client.query(bySourceIdQuery, [taskId, projectId]);
  
  if (bySourceIdResult.rows.length > 0) {
    console.log('[FIXED LOOKUP] ✅ Found task by sourceId with correct project boundary');
    return bySourceIdResult.rows[0];
  }
  
  console.log('[FIXED LOOKUP] Task not found by any method');
  return null;
}

/**
 * Simulate toggling a task using the buggy implementation
 */
async function simulateBuggyTaskToggle(client, projectId, taskId, completed) {
  console.log(`\n[BUGGY TOGGLE] Simulating task toggle for project ${projectId}, task ${taskId}`);
  
  // Step 1: Look up the task using the buggy finder
  const task = await buggyFindTaskById(client, taskId, projectId);
  
  if (!task) {
    console.log('[BUGGY TOGGLE] ❌ Task not found');
    return null;
  }
  
  // Step 2: Update the task (regardless of which project it belongs to)
  const updateQuery = `
    UPDATE project_tasks
    SET completed = $1
    WHERE id = $2
    RETURNING id, project_id, completed
  `;
  
  const updateResult = await client.query(updateQuery, [completed, task.id]);
  
  if (updateResult.rows.length > 0) {
    const updatedTask = updateResult.rows[0];
    console.log(`[BUGGY TOGGLE] ✅ Updated task ${updatedTask.id} in project ${updatedTask.project_id}`);
    
    if (updatedTask.project_id !== projectId) {
      console.log(`[BUGGY TOGGLE] ❌ BUG: Updated task in project ${updatedTask.project_id} instead of ${projectId}!`);
    }
    
    return updatedTask;
  }
  
  console.log('[BUGGY TOGGLE] ❌ Update failed');
  return null;
}

/**
 * Simulate toggling a task using the fixed implementation
 */
async function simulateFixedTaskToggle(client, projectId, taskId, completed) {
  console.log(`\n[FIXED TOGGLE] Simulating task toggle for project ${projectId}, task ${taskId}`);
  
  // Step 1: Look up the task using the fixed finder
  const task = await fixedFindTaskById(client, taskId, projectId);
  
  if (!task) {
    console.log('[FIXED TOGGLE] ❌ Task not found');
    return null;
  }
  
  // Step 2: Ensure the task belongs to the correct project before updating
  if (task.project_id !== projectId) {
    console.log(`[FIXED TOGGLE] ❌ Task found but belongs to project ${task.project_id}, not ${projectId}`);
    return null;
  }
  
  // Step 3: Update the task
  const updateQuery = `
    UPDATE project_tasks
    SET completed = $1
    WHERE id = $2 AND project_id = $3
    RETURNING id, project_id, completed
  `;
  
  const updateResult = await client.query(updateQuery, [completed, task.id, projectId]);
  
  if (updateResult.rows.length > 0) {
    const updatedTask = updateResult.rows[0];
    console.log(`[FIXED TOGGLE] ✅ Updated task ${updatedTask.id} in project ${updatedTask.project_id}`);
    return updatedTask;
  }
  
  console.log('[FIXED TOGGLE] ❌ Update failed');
  return null;
}

/**
 * Restore original state after the test
 */
async function restoreTaskState(client, taskId, originalState) {
  const query = `
    UPDATE project_tasks
    SET completed = $1
    WHERE id = $2
  `;
  
  await client.query(query, [originalState, taskId]);
  console.log(`Restored task ${taskId} to original state: completed = ${originalState}`);
}

/**
 * Run the bug reproduction test
 */
async function runTest() {
  let client;
  
  try {
    client = await connectToDatabase();
    
    // Step 1: Find all tasks with our target sourceId across all projects
    console.log(`Finding all tasks with sourceId: ${TARGET_SOURCE_ID}`);
    const tasks = await findTasksBySourceId(client, TARGET_SOURCE_ID);
    
    if (tasks.length < 2) {
      console.log('Need at least 2 projects with the same sourceId to reproduce the bug');
      await client.end();
      return;
    }
    
    console.log(`Found ${tasks.length} tasks with the same sourceId across ${new Set(tasks.map(t => t.project_id)).size} projects:`);
    tasks.forEach(t => console.log(`- Project ${t.project_id}: Task ${t.id}, "${t.text}", completed = ${t.completed}`));
    
    // Step 2: Select two projects to demonstrate the bug
    const projectA = tasks[0].project_id;
    const projectB = tasks.find(t => t.project_id !== projectA)?.project_id;
    
    if (!projectB) {
      console.log('Could not find a second project for testing');
      await client.end();
      return;
    }
    
    console.log(`\nSelected Project A: ${projectA}`);
    console.log(`Selected Project B: ${projectB}`);
    
    // Step 3: Save the current state of tasks in both projects
    console.log('\n--- INITIAL STATE ---');
    
    const tasksInProjectA = tasks.filter(t => t.project_id === projectA);
    const tasksInProjectB = tasks.filter(t => t.project_id === projectB);
    
    console.log(`Tasks in Project A:`);
    tasksInProjectA.forEach(t => console.log(`- ${t.id}: "${t.text}", completed = ${t.completed}`));
    
    console.log(`\nTasks in Project B:`);
    tasksInProjectB.forEach(t => console.log(`- ${t.id}: "${t.text}", completed = ${t.completed}`));
    
    // Step 4: Reproduce the bug by using the canonical sourceId in Project A
    // but the finder will accidentally update a task in Project B
    const taskAId = tasksInProjectA[0].id;
    const originalStateA = tasksInProjectA[0].completed;
    const targetStateA = !originalStateA;
    
    console.log(`\n--- REPRODUCING BUG ---`);
    console.log(`Toggling task in Project A (${projectA}) from ${originalStateA} to ${targetStateA}`);
    console.log(`But using canonical sourceId (${TARGET_SOURCE_ID}) instead of task ID (${taskAId})`);
    
    // This simulates the client sending PUT /api/projects/{projectA}/tasks/{SOURCE_ID}
    // with the canonical sourceId instead of the project-specific task ID
    const buggyResult = await simulateBuggyTaskToggle(client, projectA, TARGET_SOURCE_ID, targetStateA);
    
    // Step 5: Check the state after the buggy update
    console.log('\n--- STATE AFTER BUGGY UPDATE ---');
    
    const updatedTasksA = await Promise.all(tasksInProjectA.map(t => 
      findTaskByIdInProject(client, t.id, projectA)
    ));
    
    const updatedTasksB = await Promise.all(tasksInProjectB.map(t => 
      findTaskByIdInProject(client, t.id, projectB)
    ));
    
    console.log(`Tasks in Project A (expecting NO change):`);
    updatedTasksA.forEach(t => 
      console.log(`- ${t.id}: "${t.text}", completed = ${t.completed} ${t.completed === targetStateA ? '✅ (CHANGED)' : '❌ (UNCHANGED)'}`)
    );
    
    console.log(`\nTasks in Project B (expecting accidental change!):`);
    updatedTasksB.forEach(t => 
      console.log(`- ${t.id}: "${t.text}", completed = ${t.completed} ${t.completed !== tasksInProjectB.find(original => original.id === t.id).completed ? '⚠️ (CHANGED BY ACCIDENT)' : '(unchanged)'}`)
    );
    
    // Step 6: Demonstrate the fix
    console.log('\n--- DEMONSTRATING FIX ---');
    
    // Restore original state for all tasks
    for (const task of [...tasksInProjectA, ...tasksInProjectB]) {
      await restoreTaskState(client, task.id, task.completed);
    }
    
    console.log('Restored all tasks to original state');
    
    // Now try the fixed implementation
    console.log(`\nToggling task in Project A (${projectA}) from ${originalStateA} to ${targetStateA}`);
    console.log(`Using canonical sourceId (${TARGET_SOURCE_ID}) with project boundary check`);
    
    const fixedResult = await simulateFixedTaskToggle(client, projectA, TARGET_SOURCE_ID, targetStateA);
    
    // Step 7: Check the state after the fixed update
    console.log('\n--- STATE AFTER FIXED UPDATE ---');
    
    const fixedTasksA = await Promise.all(tasksInProjectA.map(t => 
      findTaskByIdInProject(client, t.id, projectA)
    ));
    
    const fixedTasksB = await Promise.all(tasksInProjectB.map(t => 
      findTaskByIdInProject(client, t.id, projectB)
    ));
    
    console.log(`Tasks in Project A (expecting change to requested task):`);
    fixedTasksA.forEach(t => 
      console.log(`- ${t.id}: "${t.text}", completed = ${t.completed} ${t.completed !== tasksInProjectA.find(original => original.id === t.id).completed ? '✅ (CHANGED)' : '❌ (UNCHANGED)'}`)
    );
    
    console.log(`\nTasks in Project B (expecting NO changes):`);
    fixedTasksB.forEach(t => 
      console.log(`- ${t.id}: "${t.text}", completed = ${t.completed} ${t.completed !== tasksInProjectB.find(original => original.id === t.id).completed ? '⚠️ (CHANGED)' : '✅ (UNCHANGED)'}`)
    );
    
    // Step 8: Summary
    console.log('\n--- BUG REPRODUCTION SUMMARY ---');
    console.log('\n🔍 ROOT CAUSE IDENTIFIED:');
    console.log('1. Success Factor tasks in different projects share the same sourceId');
    console.log('2. When toggling a task, the app uses sourceId lookup without project boundary check');
    console.log('3. This causes task updates to affect the wrong project');
    console.log('4. On page reload, the task in the current project appears unchanged');
    
    console.log('\n💡 SOLUTION:');
    console.log('1. Always enforce project boundaries in task lookups');
    console.log('2. When finding tasks by sourceId, require matching projectId');
    console.log('3. Add transaction integrity with proper error handling');
    
    // Restore original state for all tasks one last time
    for (const task of [...tasksInProjectA, ...tasksInProjectB]) {
      await restoreTaskState(client, task.id, task.completed);
    }
    
    console.log('\nAll tasks restored to original state');
    
    // Close the database connection
    await client.end();
    console.log('\nTest completed');
    
  } catch (error) {
    console.error('Test failed:', error);
    if (client) await client.end();
  }
}

// Run the test
runTest();