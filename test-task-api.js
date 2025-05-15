/**
 * Script to test the Project Tasks API directly
 * Use: node test-task-api.js <project-id>
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid'); 

// Test settings
const PROJECT_ID = process.argv[2] || '123e4567-e89b-12d3-a456-426614174000'; // Replace with a valid project ID
const TEST_TEXT = `API Test Task ${Date.now()}`;
const API_HOST = 'http://localhost:5000'; // Adjust as needed

async function testTaskAPI() {
  try {
    console.log(`Testing Tasks API for project ${PROJECT_ID}`);
    
    // 1. Test GET tasks
    console.log('\nTesting GET /api/projects/:projectId/tasks');
    const getResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`);
    
    console.log(`Status: ${getResponse.status} ${getResponse.statusText}`);
    
    if (getResponse.ok) {
      const tasks = await getResponse.json();
      console.log(`Retrieved ${tasks.length} tasks`);
      if (tasks.length > 0) {
        console.log('First task sample:');
        console.log(JSON.stringify(tasks[0], null, 2));
      }
    } else {
      console.log(await getResponse.text());
    }
    
    // 2. Test POST task
    console.log('\nTesting POST /api/projects/:projectId/tasks');
    const newTask = {
      text: TEST_TEXT,
      stage: 'identification',
      origin: 'custom',
      sourceId: `test-${uuidv4().slice(0, 8)}`,
      completed: false,
      notes: 'API test notes',
      priority: 'medium',
      dueDate: '2023-12-31',
      owner: 'APITest',
      status: 'pending'
    };
    
    console.log('Sending new task:');
    console.log(JSON.stringify(newTask, null, 2));
    
    const postResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTask)
    });
    
    console.log(`Status: ${postResponse.status} ${postResponse.statusText}`);
    
    if (postResponse.ok) {
      const createdTask = await postResponse.json();
      console.log('Created task:');
      console.log(JSON.stringify(createdTask, null, 2));
      
      // 3. Verify task was created by retrieving it
      console.log('\nVerifying task creation with GET /api/projects/:projectId/tasks');
      const verifyResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks`);
      
      if (verifyResponse.ok) {
        const updatedTasks = await verifyResponse.json();
        console.log(`Retrieved ${updatedTasks.length} tasks after creation`);
        
        // Find our newly created task
        const foundTask = updatedTasks.find(task => task.text === TEST_TEXT);
        if (foundTask) {
          console.log('Successfully found newly created task:');
          console.log(JSON.stringify(foundTask, null, 2));
        } else {
          console.log('ERROR: Could not find newly created task!');
        }
      } else {
        console.log('Failed to verify task creation:');
        console.log(await verifyResponse.text());
      }
      
      // 4. Test UPDATE task if we have a task ID
      if (createdTask && createdTask.id) {
        console.log('\nTesting PATCH /api/projects/:projectId/tasks/:taskId');
        const taskUpdate = {
          text: `${TEST_TEXT} (Updated)`,
          completed: true,
          notes: 'Updated via API test'
        };
        
        const patchResponse = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/tasks/${createdTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taskUpdate)
        });
        
        console.log(`Status: ${patchResponse.status} ${patchResponse.statusText}`);
        
        if (patchResponse.ok) {
          const updatedTask = await patchResponse.json();
          console.log('Updated task:');
          console.log(JSON.stringify(updatedTask, null, 2));
        } else {
          console.log(await patchResponse.text());
        }
      }
    } else {
      console.log('Failed to create task:');
      console.log(await postResponse.text());
    }
    
  } catch (error) {
    console.error('Error testing task API:', error);
  }
}

testTaskAPI();