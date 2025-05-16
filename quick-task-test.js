/**
 * Simple task persistence test directly with fetch
 */

import fetch from 'node-fetch';

// Test a basic task creation and retrieval
async function testTaskPersistence() {
  console.log('Running quick task persistence test...');
  
  try {
    // 1. Create a test task
    const taskResponse = await fetch('https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev/api/projects/bc55c1a2-0cdf-4108-aa9e-44b44baea3b8/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `Test task ${new Date().toISOString()}`,
        stage: 'identification',
        origin: 'custom',
        sourceId: null,
        priority: 'high',
        notes: 'Created by persistence test'
      })
    });
    
    if (!taskResponse.ok) {
      throw new Error(`Failed to create task: ${taskResponse.status} ${taskResponse.statusText}`);
    }
    
    const createdTask = await taskResponse.json();
    console.log('Successfully created task:', createdTask);
    
    // 2. Get all tasks to verify immediate persistence
    const tasksResponse = await fetch(`https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev/api/projects/bc55c1a2-0cdf-4108-aa9e-44b44baea3b8/tasks`);
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to get tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Retrieved ${tasks.length} tasks`);
    
    // 3. Verify our task is in the results
    const foundTask = tasks.find(task => task.id === createdTask.id);
    
    if (foundTask) {
      console.log('✅ SUCCESS: Task was persisted correctly');
    } else {
      console.log('❌ FAILURE: Task was not found in results');
    }
    
    // Return the tasks as JSON for verification
    return tasks;
  } catch (error) {
    console.error('Error during task test:', error);
    return null;
  }
}

// Run the test
const result = await testTaskPersistence();
console.log(JSON.stringify(result, null, 2));