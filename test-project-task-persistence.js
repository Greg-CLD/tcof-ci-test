/**
 * Integration test for project task persistence
 * This script tests the POST and GET operations for tasks in the project checklist
 */
import fetch from 'node-fetch';

async function testProjectTaskPersistence() {
  console.log('Starting project task persistence test...');
  
  // Project ID to test against - update with an actual project ID from your database
  const projectId = '1'; // Use a valid project ID
  
  // Test task data
  const testTask = {
    text: 'Test task created ' + new Date().toISOString(),
    stage: 'identification',
    origin: 'custom',
    sourceId: 'test-source'
  };
  
  try {
    // Step 1: Create a new task
    console.log('Creating test task...');
    const createResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTask)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdTask = await createResponse.json();
    console.log('Created task:', createdTask);
    
    // Step 2: Get all tasks for the project
    console.log('Fetching all tasks for project...');
    const getResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get tasks: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const tasks = await getResponse.json();
    console.log(`Retrieved ${tasks.length} tasks for project ${projectId}`);
    
    // Step 3: Verify the test task is in the list
    const foundTask = tasks.find(task => task.id === createdTask.id);
    
    if (foundTask) {
      console.log('✅ Task persistence verified! Task was found after creation.');
      console.log('Found task:', foundTask);
    } else {
      console.log('❌ Task persistence failed! Created task was not found in the task list.');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testProjectTaskPersistence();