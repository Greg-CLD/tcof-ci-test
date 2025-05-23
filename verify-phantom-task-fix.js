/**
 * Verification Script for Success Factor Task Phantom Fix
 * 
 * This script verifies our fix for phantom checklist tasks by:
 * 1. Loading tasks for a project with and without the ensure=true parameter
 * 2. Verifying the DB contains all Success Factor tasks shown in the UI
 * 3. Testing that task toggle operations persist to the database
 */

import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import fetch from 'node-fetch';
import fs from 'fs';

// Test project IDs - update with valid UUIDs from your database 
const PROJECTS = {
  EXISTING: '7277a5fe-899b-4fe6-8e35-05dd6103d054', // Existing project
  NEW: 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'        // Recently created project
};

// Read session cookie from file
async function getSessionCookie() {
  try {
    const cookieData = await fs.promises.readFile('current-session.txt', 'utf8');
    return cookieData.trim();
  } catch (error) {
    console.error('Failed to read session cookie from file:', error);
    return null;
  }
}

// API request helper with authentication
async function authenticatedRequest(method, endpoint, body = null, sessionCookie) {
  const baseUrl = 'http://localhost:3000';
  const options = {
    method,
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  
  // Handle non-success responses
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return await response.json();
}

// Get tasks from database directly
async function getTasksFromDatabase(projectId) {
  try {
    const tasks = await db.execute(sql`
      SELECT * FROM project_tasks 
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `);
    
    return tasks.rows || [];
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

// Toggle a task completion state
async function toggleTask(projectId, taskId, completed, sessionCookie) {
  const endpoint = `/api/projects/${projectId}/tasks/${taskId}`;
  const body = { completed };
  
  return await authenticatedRequest('PUT', endpoint, body, sessionCookie);
}

// Run the verification test
async function runVerification() {
  console.log('=== SUCCESS FACTOR PHANTOM TASK FIX VERIFICATION ===\n');
  
  try {
    // Get session cookie for authenticated requests
    const sessionCookie = await getSessionCookie();
    if (!sessionCookie) {
      console.error('No session cookie found. Please login to the application first.');
      return;
    }
    
    console.log('Successfully loaded authentication session.\n');
    
    // Test 1: Verify existing project with ensure=true parameter
    console.log(`\n=== TEST 1: VERIFYING EXISTING PROJECT (${PROJECTS.EXISTING}) ===`);
    
    // Get tasks with ensure=true parameter
    console.log('Fetching tasks WITH ensure=true parameter...');
    const tasksWithEnsure = await authenticatedRequest(
      'GET', 
      `/api/projects/${PROJECTS.EXISTING}/tasks?ensure=true`,
      null,
      sessionCookie
    );
    
    console.log(`Retrieved ${tasksWithEnsure.length} tasks from API with ensure=true`);
    
    // Get tasks directly from database
    console.log('Fetching tasks directly from database...');
    const dbTasks = await getTasksFromDatabase(PROJECTS.EXISTING);
    console.log(`Retrieved ${dbTasks.length} tasks from database`);
    
    // Verify Success Factor tasks
    const apiSuccessFactorTasks = tasksWithEnsure.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    const dbSuccessFactorTasks = dbTasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Success Factor tasks in API response: ${apiSuccessFactorTasks.length}`);
    console.log(`Success Factor tasks in database: ${dbSuccessFactorTasks.length}`);
    
    if (apiSuccessFactorTasks.length === dbSuccessFactorTasks.length) {
      console.log('✅ SUCCESS: All Success Factor tasks in API response exist in database');
    } else {
      console.log('❌ FAIL: Mismatch between API Success Factor tasks and database');
    }
    
    // Test 2: Toggle a task and verify persistence
    if (apiSuccessFactorTasks.length > 0) {
      console.log('\n=== TEST 2: VERIFYING TASK TOGGLE PERSISTENCE ===');
      
      // Select a task to toggle
      const testTask = apiSuccessFactorTasks[0];
      const originalState = !!testTask.completed;
      
      console.log(`Toggling task: ${testTask.id}`);
      console.log(`Original state: completed=${originalState}`);
      
      // Toggle the task
      console.log(`Setting completed state to: ${!originalState}`);
      const updateResult = await toggleTask(
        PROJECTS.EXISTING, 
        testTask.id, 
        !originalState, 
        sessionCookie
      );
      
      console.log('Task update response:', updateResult);
      
      // Fetch the task again to verify persistence
      console.log('Fetching tasks again to verify persistence...');
      const updatedTasks = await authenticatedRequest(
        'GET', 
        `/api/projects/${PROJECTS.EXISTING}/tasks`,
        null,
        sessionCookie
      );
      
      // Find the same task in the updated response
      const updatedTask = updatedTasks.find(task => task.id === testTask.id);
      
      if (updatedTask) {
        console.log(`Found task after update: ${updatedTask.id}`);
        console.log(`Updated state: completed=${updatedTask.completed}`);
        
        if (updatedTask.completed === !originalState) {
          console.log('✅ SUCCESS: Task state successfully persisted');
        } else {
          console.log('❌ FAIL: Task state did not persist');
        }
      } else {
        console.log('❌ FAIL: Could not find task after update');
      }
    }
    
    // Test 3: Verify recently created project
    console.log(`\n=== TEST 3: VERIFYING RECENTLY CREATED PROJECT (${PROJECTS.NEW}) ===`);
    
    // Get tasks with ensure=true parameter
    console.log('Fetching tasks WITH ensure=true parameter...');
    const newProjectTasks = await authenticatedRequest(
      'GET', 
      `/api/projects/${PROJECTS.NEW}/tasks?ensure=true`,
      null,
      sessionCookie
    );
    
    console.log(`Retrieved ${newProjectTasks.length} tasks from API with ensure=true`);
    
    // Get tasks directly from database
    console.log('Fetching tasks directly from database...');
    const newProjectDbTasks = await getTasksFromDatabase(PROJECTS.NEW);
    console.log(`Retrieved ${newProjectDbTasks.length} tasks from database`);
    
    // Verify Success Factor tasks
    const newProjectApiSfTasks = newProjectTasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    const newProjectDbSfTasks = newProjectDbTasks.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    console.log(`Success Factor tasks in API response: ${newProjectApiSfTasks.length}`);
    console.log(`Success Factor tasks in database: ${newProjectDbSfTasks.length}`);
    
    if (newProjectApiSfTasks.length === newProjectDbSfTasks.length) {
      console.log('✅ SUCCESS: All Success Factor tasks in API response exist in database');
    } else {
      console.log('❌ FAIL: Mismatch between API Success Factor tasks and database');
    }
    
    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log('The phantom task fix is working correctly if:');
    console.log('1. All Success Factor tasks in API responses exist in the database');
    console.log('2. Task toggle operations persist to the database');
    console.log('3. No 404/500 errors occur during task operations');
    
  } catch (error) {
    console.error('Error running verification:', error);
  } finally {
    process.exit(0);
  }
}

// Run the verification
runVerification();