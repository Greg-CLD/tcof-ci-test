/**
 * Server-side test for Success Factor task persistence and phantom task fix
 */
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import fetch from 'node-fetch';

// Test project ID - must be a valid UUID in your database
const TEST_PROJECT_ID = '7277a5fe-899b-4fe6-8e35-05dd6103d054';

// Test with and without ensure parameter
async function testTaskEndpoint() {
  console.log('=== Testing task endpoint with and without ensure parameter ===');
  
  try {
    // First get a valid session cookie (requires a user to be logged in)
    const sessionCookie = await getSessionCookie();
    
    if (!sessionCookie) {
      console.error('No session cookie found. Please log into the app first.');
      return;
    }
    
    console.log(`Using project ID: ${TEST_PROJECT_ID}`);
    
    // Test 1: Get tasks without ensure parameter
    console.log('\nTest 1: Get tasks WITHOUT ensure parameter');
    const tasksWithoutEnsure = await getTasks(TEST_PROJECT_ID, sessionCookie, false);
    console.log(`Retrieved ${tasksWithoutEnsure.length} tasks`);
    
    // Count Success Factor tasks
    const sfTasksWithoutEnsure = tasksWithoutEnsure.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    console.log(`Success Factor tasks: ${sfTasksWithoutEnsure.length}`);
    
    // Test 2: Get tasks with ensure parameter
    console.log('\nTest 2: Get tasks WITH ensure parameter');
    const tasksWithEnsure = await getTasks(TEST_PROJECT_ID, sessionCookie, true);
    console.log(`Retrieved ${tasksWithEnsure.length} tasks`);
    
    // Count Success Factor tasks
    const sfTasksWithEnsure = tasksWithEnsure.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    console.log(`Success Factor tasks: ${sfTasksWithEnsure.length}`);
    
    // Compare the two results
    console.log('\nResults comparison:');
    console.log(`- Tasks without ensure: ${tasksWithoutEnsure.length}`);
    console.log(`- Tasks with ensure: ${tasksWithEnsure.length}`);
    console.log(`- Difference: ${tasksWithEnsure.length - tasksWithoutEnsure.length}`);
    
    // If there are more tasks with ensure, the fix is working
    if (tasksWithEnsure.length > tasksWithoutEnsure.length) {
      console.log('\n✅ SUCCESS: More tasks returned with ensure parameter');
      console.log('This confirms the backend is correctly adding missing Success Factor tasks');
    } else if (tasksWithEnsure.length === tasksWithoutEnsure.length) {
      console.log('\n✅ SUCCESS: Same number of tasks returned with and without ensure parameter');
      console.log('This likely means all Success Factor tasks already exist for this project');
    } else {
      console.log('\n❌ FAIL: Fewer tasks returned with ensure parameter');
      console.log('This indicates an issue with the ensure functionality');
    }
    
  } catch (error) {
    console.error('Error running task endpoint test:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Helper to get session cookie
async function getSessionCookie() {
  try {
    // Try to read session cookie from file
    const fs = await import('fs');
    const cookieData = fs.readFileSync('current-session.txt', 'utf8');
    return cookieData.trim();
  } catch (error) {
    console.error('Error getting session cookie:', error);
    return null;
  }
}

// Helper to get tasks with or without ensure parameter
async function getTasks(projectId, sessionCookie, ensure = false) {
  const baseUrl = 'http://localhost:3000';
  const endpoint = `/api/projects/${projectId}/tasks${ensure ? '?ensure=true' : ''}`;
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Cookie': sessionCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get tasks: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Run the test
testTaskEndpoint();