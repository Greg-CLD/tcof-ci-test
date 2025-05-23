/**
 * Direct Success Factor Task Boundary Test
 * 
 * This script directly tests the task boundary enforcement fix by:
 * 1. Finding a Success Factor task ID that exists across multiple projects
 * 2. Attempting to update it via the API in the correct and incorrect project contexts
 * 3. Verifying that updates only affect the correct project
 */

import fetch from 'node-fetch';
import { db } from './server/db.js';
import { projectTasks, projects } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

// Placeholder for auth cookie (will be populated during test)
let authCookie = '';

// Helper function to make API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`http://localhost:3000${endpoint}`, options);
  
  // For debugging
  console.log(`${method} ${endpoint} - Status: ${response.status}`);
  
  try {
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: response.status, data: null };
  }
}

// Main test function
async function runTest() {
  try {
    console.log('=== Success Factor Task Boundary Test ===\n');
    
    // Step 1: Login to get a session cookie
    console.log('Authenticating...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'Password123!'
      })
    });
    
    // Extract cookie for subsequent requests
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('Failed to get auth cookie. Login failed.');
      return;
    }
    
    // Parse and save the auth cookie
    authCookie = setCookieHeader.split(';')[0];
    console.log('Authentication successful\n');
    
    // Step 2: Find projects with Success Factor tasks
    console.log('Finding projects with Success Factor tasks...');
    const projectsWithFactors = await db.execute(
      `SELECT p.id, p.name, COUNT(pt.id) as task_count
       FROM projects p
       JOIN project_tasks pt ON p.id = pt.project_id
       WHERE pt.origin = 'factor'
       GROUP BY p.id, p.name
       HAVING COUNT(pt.id) > 0
       ORDER BY task_count DESC
       LIMIT 5`
    );
    
    if (projectsWithFactors.length < 2) {
      console.error('Need at least 2 projects with Success Factor tasks to run the test.');
      return;
    }
    
    const projectA = projectsWithFactors[0];
    const projectB = projectsWithFactors[1];
    
    console.log(`Found projects with Success Factor tasks:`);
    console.log(`Project A: ${projectA.name} (${projectA.id}) - ${projectA.task_count} tasks`);
    console.log(`Project B: ${projectB.name} (${projectB.id}) - ${projectB.task_count} tasks\n`);
    
    // Step 3: Find a Success Factor task in each project with the same sourceId
    console.log('Finding Success Factor tasks with the same sourceId across projects...');
    const sharedSourceIdResult = await db.execute(
      `SELECT source_id, COUNT(DISTINCT project_id) as project_count
       FROM project_tasks
       WHERE origin = 'factor' AND source_id IS NOT NULL
       GROUP BY source_id
       HAVING COUNT(DISTINCT project_id) > 1
       ORDER BY project_count DESC
       LIMIT 1`
    );
    
    if (sharedSourceIdResult.length === 0) {
      console.error('No shared sourceId found across projects. Cannot complete test.');
      return;
    }
    
    const sharedSourceId = sharedSourceIdResult[0].source_id;
    console.log(`Found shared sourceId: ${sharedSourceId} in ${sharedSourceIdResult[0].project_count} projects\n`);
    
    // Get tasks with this sourceId in both projects
    const taskInProjectA = await db.query.projectTasks.findFirst({
      where: and(
        eq(projectTasks.projectId, projectA.id),
        eq(projectTasks.sourceId, sharedSourceId)
      )
    });
    
    const taskInProjectB = await db.query.projectTasks.findFirst({
      where: and(
        eq(projectTasks.projectId, projectB.id),
        eq(projectTasks.sourceId, sharedSourceId)
      )
    });
    
    if (!taskInProjectA || !taskInProjectB) {
      console.error('Could not find tasks with shared sourceId in both projects.');
      return;
    }
    
    console.log(`Task in Project A: ${taskInProjectA.id} (${taskInProjectA.text})`);
    console.log(`Task in Project B: ${taskInProjectB.id} (${taskInProjectB.text})\n`);
    
    // Step 4: Record initial state
    console.log('Initial task states:');
    console.log(`Task A completed: ${taskInProjectA.completed}`);
    console.log(`Task B completed: ${taskInProjectB.completed}\n`);
    
    // Step 5: Test 1 - Update Task A using direct ID (should succeed)
    console.log('Test 1: Updating Task A using its ID in Project A (should succeed)');
    const updateTaskAResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectA.id}/tasks/${taskInProjectA.id}`,
      {
        completed: !taskInProjectA.completed,
        status: !taskInProjectA.completed ? 'Done' : 'To Do'
      }
    );
    
    console.log(`Update Task A result: ${updateTaskAResponse.status === 200 ? 'SUCCESS' : 'FAILURE'}`);
    
    // Step 6: Test 2 - Update Task using sourceId in wrong project (should fail with 404)
    console.log('\nTest 2: Updating Task using sourceId in wrong project (should fail)');
    const updateWrongProjectResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectB.id}/tasks/${sharedSourceId}`,
      {
        completed: true,
        status: 'Done'
      }
    );
    
    console.log(`Wrong project update result: ${updateWrongProjectResponse.status === 404 ? 'CORRECTLY FAILED (404)' : 'INCORRECTLY SUCCEEDED - FIX FAILED'}`);
    
    // Step 7: Verify database state after updates
    console.log('\nVerifying database state after updates...');
    const updatedTaskA = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskInProjectA.id)
    });
    
    const updatedTaskB = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskInProjectB.id)
    });
    
    console.log('Final task states:');
    console.log(`Task A completed: ${updatedTaskA?.completed} (should be ${!taskInProjectA.completed})`);
    console.log(`Task B completed: ${updatedTaskB?.completed} (should remain ${taskInProjectB.completed})\n`);
    
    // Determine overall test result
    const testPassed = 
      updateTaskAResponse.status === 200 && 
      updateWrongProjectResponse.status === 404 && 
      updatedTaskA?.completed === !taskInProjectA.completed &&
      updatedTaskB?.completed === taskInProjectB.completed;
    
    console.log('=== Test Results ===');
    if (testPassed) {
      console.log('✅ SUCCESS: The project boundary enforcement fix is working correctly!');
      console.log('Tasks from one project cannot be updated using IDs from another project.');
    } else {
      console.log('❌ FAILURE: The project boundary enforcement fix is NOT working correctly.');
      console.log('Please review the test results and fix any remaining issues.');
    }
    
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest().catch(console.error);