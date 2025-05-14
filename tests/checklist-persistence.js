/**
 * Integration test for checklist task persistence
 * 
 * This test verifies:
 * 1. Seeding by GET tasks (canonical copy is created)
 * 2. POST a new task
 * 3. GET again to verify the new task exists
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:5000';
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || 'f52c1bee-b558-4573-b6e8-021a39ba5cb7'; // Default test project ID

async function testChecklistPersistence() {
  console.log('=====================================');
  console.log('CHECKLIST PERSISTENCE TEST');
  console.log('=====================================');

  try {
    // STEP 1: Get tasks (should trigger seeding if first access)
    console.log('\n✅ STEP 1: Testing initial GET for seeding');
    const initialResponse = await fetch(`${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks`);
    
    if (!initialResponse.ok) {
      throw new Error(`Failed to get initial tasks: ${initialResponse.status} ${initialResponse.statusText}`);
    }
    
    const initialTasks = await initialResponse.json();
    console.log(`Initial task count: ${initialTasks.length}`);
    
    if (initialTasks.length === 0) {
      console.log('WARNING: No tasks were seeded - this might indicate a seeding issue');
    } else {
      console.log('Project was successfully seeded with tasks!');
      
      // Log some sample tasks
      console.log('\nSample tasks:');
      initialTasks.slice(0, 3).forEach(task => {
        console.log(`- [${task.stage}] ${task.text} (origin: ${task.origin}, sourceId: ${task.sourceId})`);
      });
    }
    
    // STEP 2: Create a new custom task
    console.log('\n✅ STEP 2: Testing task creation (POST)');
    const newTaskData = {
      text: `Test task created at ${new Date().toISOString()}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: `test-${uuidv4().substring(0, 8)}`,
      completed: false,
      priority: 'medium',
      status: 'To Do'
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTaskData)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdTask = await createResponse.json();
    console.log('Successfully created new task:');
    console.log(`- ID: ${createdTask.id}`);
    console.log(`- Text: ${createdTask.text}`);
    console.log(`- Stage: ${createdTask.stage}`);
    
    // STEP 3: Verify the task was created by getting all tasks again
    console.log('\n✅ STEP 3: Verifying task persistence (GET after POST)');
    const verifyResponse = await fetch(`${BASE_URL}/api/projects/${TEST_PROJECT_ID}/tasks`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify tasks: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyTasks = await verifyResponse.json();
    console.log(`Updated task count: ${verifyTasks.length}`);
    
    if (verifyTasks.length <= initialTasks.length) {
      console.log('❌ ERROR: Task count did not increase after creating a new task');
    } else {
      console.log(`✅ SUCCESS: Task count increased from ${initialTasks.length} to ${verifyTasks.length}`);
    }
    
    // Find our specific task
    const foundTask = verifyTasks.find(task => task.id === createdTask.id);
    
    if (foundTask) {
      console.log('\n✅ SUCCESS: Found the newly created task in the list');
      console.log('- ID matches: ' + (foundTask.id === createdTask.id ? 'Yes' : 'No'));
      console.log('- Text matches: ' + (foundTask.text === createdTask.text ? 'Yes' : 'No'));
      console.log('- Stage matches: ' + (foundTask.stage === createdTask.stage ? 'Yes' : 'No'));
    } else {
      console.log('\n❌ ERROR: Could not find the newly created task in the list');
    }
    
    // FINAL RESULT
    if (verifyTasks.length > initialTasks.length && foundTask) {
      console.log('\n✅ TEST PASSED: Checklist task persistence is working correctly');
    } else {
      console.log('\n❌ TEST FAILED: Checklist task persistence is not working correctly');
    }
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
  }
  
  console.log('\n=====================================');
}

// Run the test
testChecklistPersistence();