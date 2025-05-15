/**
 * Simple integration test to verify project task persistence
 */
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';
const testProjectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'; // Using existing project ID from the database

// Test task data
const testTask = {
  text: `Test task created at ${new Date().toISOString()}`,
  stage: 'identification',
  origin: 'custom',
  sourceId: 'test-integration'
};

async function testProjectTaskPersistence() {
  try {
    console.log('✅ Starting task persistence test...');
    
    // 1. Create a new task
    console.log('Creating test task...');
    const createResponse = await fetch(`${baseUrl}/api/projects/${testProjectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTask)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create task: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdTask = await createResponse.json();
    console.log('✅ Created task:', createdTask);
    
    // 2. Fetch all tasks to verify the task was created
    console.log('Fetching tasks to verify creation...');
    const getResponse = await fetch(`${baseUrl}/api/projects/${testProjectId}/tasks`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get tasks: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const tasks = await getResponse.json();
    console.log(`✅ Retrieved ${tasks.length} tasks for project ${testProjectId}`);
    
    // 3. Check if our test task is in the list
    const foundTask = tasks.find(task => task.id === createdTask.id);
    
    if (foundTask) {
      console.log('✅ Task persistence verified! Created task was found in the database.');
      console.log('Found task:', foundTask);
    } else {
      console.log('❌ Task persistence failed! Created task was not found in the task list.');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testProjectTaskPersistence();