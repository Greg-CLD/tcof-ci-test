/**
 * Project Task Boundary Test
 * 
 * This script directly tests whether the same sourceId exists in multiple projects,
 * and if our task lookup function properly enforces project boundaries when finding tasks.
 * This is the suspected root cause of the Success Factor task toggle persistence bug.
 * 
 * Run with: node check-source-id-boundary.js
 */

import pkg from 'pg';
const { Client } = pkg;

// Canonical Success Factor IDs known to exist in the system
const KNOWN_SOURCE_IDS = [
  '2f565bf9-70c7-5c41-93e7-c6c4cde32312', // Ask Why
  '6fa4b7fb-d702-5bd5-a809-94cc866484aa'  // Another known Success Factor
];

async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to the database');
  return client;
}

async function findAllProjects(client) {
  const query = 'SELECT id, name FROM projects LIMIT 10';
  const result = await client.query(query);
  return result.rows;
}

async function findTasksBySourceId(client, sourceId) {
  const query = `
    SELECT id, project_id, origin, source_id, completed 
    FROM project_tasks 
    WHERE source_id = $1
  `;
  
  const result = await client.query(query, [sourceId]);
  return result.rows;
}

async function findTaskById(client, taskId, projectId) {
  // First, try exact ID match with project boundary
  const exactQuery = `
    SELECT id, project_id, origin, source_id, completed 
    FROM project_tasks 
    WHERE id = $1 AND project_id = $2
  `;
  
  const exactResult = await client.query(exactQuery, [taskId, projectId]);
  
  if (exactResult.rows.length > 0) {
    console.log('✅ Found task by exact ID match with correct project boundary');
    return exactResult.rows[0];
  }
  
  // Next, try source_id match with project boundary (correct approach)
  const sourceIdWithProjectQuery = `
    SELECT id, project_id, origin, source_id, completed 
    FROM project_tasks 
    WHERE source_id = $1 AND project_id = $2
  `;
  
  const sourceIdWithProjectResult = await client.query(sourceIdWithProjectQuery, [taskId, projectId]);
  
  if (sourceIdWithProjectResult.rows.length > 0) {
    console.log('✅ Found task by sourceId with correct project boundary');
    return sourceIdWithProjectResult.rows[0];
  }
  
  // Finally, try source_id match WITHOUT project boundary (bug!)
  const sourceIdQuery = `
    SELECT id, project_id, origin, source_id, completed 
    FROM project_tasks 
    WHERE source_id = $1
  `;
  
  const sourceIdResult = await client.query(sourceIdQuery, [taskId]);
  
  if (sourceIdResult.rows.length > 0) {
    console.log('⚠️ Found task by sourceId WITHOUT project boundary check (BUG!)');
    console.log('This would allow updating tasks in other projects!');
    return sourceIdResult.rows[0];
  }
  
  console.log('❌ Task not found by any method');
  return null;
}

async function simulateTaskToggleRequest(client, taskId, projectId) {
  console.log(`\nSimulating API request: PUT /api/projects/${projectId}/tasks/${taskId}`);
  console.log('Request body: { completed: true }');
  
  // Step 1: Find the task using our current lookup strategy
  const task = await findTaskById(client, taskId, projectId);
  
  if (!task) {
    console.log('Task not found - would return 404');
    return;
  }
  
  // Step 2: Check if the found task belongs to the requested project
  if (task.project_id !== projectId) {
    console.log(`\n❌ BUG CONFIRMED: Task was found but belongs to project ${task.project_id}, not ${projectId}!`);
    console.log('This violates project boundaries and explains the persistence bug.');
    console.log('When toggling a task in Project A, a task in Project B gets updated instead.');
    console.log('On page reload, the task in Project A remains unchanged because it was never updated.');
    return task;
  }
  
  console.log('✅ Project boundary enforced correctly');
  return task;
}

async function runTest() {
  let client;
  
  try {
    client = await connectToDatabase();
    
    // Find all projects in the system
    console.log('Finding projects...');
    const projects = await findAllProjects(client);
    console.log(`Found ${projects.length} projects:`);
    projects.forEach(p => console.log(`- ${p.id}: ${p.name}`));
    
    if (projects.length < 2) {
      console.log('Need at least 2 projects to test project boundary issues');
      return;
    }
    
    // For each known Success Factor sourceId, find all tasks that use it
    for (const sourceId of KNOWN_SOURCE_IDS) {
      console.log(`\nChecking for tasks with sourceId: ${sourceId}`);
      const tasks = await findTasksBySourceId(client, sourceId);
      
      if (tasks.length === 0) {
        console.log('No tasks found with this sourceId');
        continue;
      }
      
      console.log(`Found ${tasks.length} tasks with sourceId ${sourceId}:`);
      tasks.forEach(t => console.log(`- Project ${t.project_id}: Task ${t.id}, completed = ${t.completed}`));
      
      // If multiple projects have the same sourceId, simulate a task toggle request
      // using the wrong project ID to reproduce the bug
      if (tasks.length > 1) {
        console.log('\n⚠️ VULNERABILITY DETECTED: Same sourceId exists in multiple projects!');
        console.log('This can lead to the Success Factor task toggle persistence bug.');
        
        const task1 = tasks[0];
        const task2 = tasks[1];
        
        // Simulate a task update request with the task ID from project 1
        // but using the project ID from project 2 (wrong project)
        console.log('\nTest 1: Using task ID from first project with project ID from second project:');
        await simulateTaskToggleRequest(client, task1.id, task2.project_id);
        
        // Now test the more serious case - using a canonical sourceId with the wrong project
        console.log('\nTest 2: Using canonical Success Factor sourceId with the wrong project:');
        await simulateTaskToggleRequest(client, sourceId, task1.project_id);
      } else {
        console.log('Only one task with this sourceId - no boundary violation possible');
      }
    }
    
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