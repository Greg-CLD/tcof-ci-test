/**
 * Utility functions for testing task persistence in the Project Checklist feature
 * These can be used in the browser console to test persistence
 */
import { v4 as uuidv4 } from 'uuid';

// Helper to retrieve all projects
export async function listProjects() {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
    }
    const projects = await response.json();
    console.log(`Found ${projects.length} projects:`, projects);
    return projects;
  } catch (error) {
    console.error('Error listing projects:', error);
    return [];
  }
}

// Helper to test task persistence for a specific project
export async function runTaskPersistenceTest(projectId: string) {
  console.log('=== TASK PERSISTENCE TEST ===');
  console.log(`Testing project ID: ${projectId}`);
  
  try {
    // Step 1: Get initial tasks
    console.log('\nSTEP 1: Fetching initial tasks...');
    const initialResponse = await fetch(`/api/projects/${projectId}/tasks`);
    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch initial tasks: ${initialResponse.status} ${initialResponse.statusText}`);
    }
    
    const initialTasks = await initialResponse.json();
    console.log(`Found ${initialTasks.length} initial tasks`);
    
    // Step 2: Create a new task
    console.log('\nSTEP 2: Creating a new task...');
    const newTaskData = {
      text: `Test task created at ${new Date().toISOString()}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: `test-${uuidv4().substring(0, 8)}`,
      completed: false,
      priority: 'medium',
      status: 'To Do'
    };
    
    const createResponse = await fetch(`/api/projects/${projectId}/tasks`, {
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
    console.log('Created task:', createdTask);
    
    // Step 3: Verify the task exists
    console.log('\nSTEP 3: Verifying task was created...');
    const verifyResponse = await fetch(`/api/projects/${projectId}/tasks`);
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify tasks: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyTasks = await verifyResponse.json();
    console.log(`Found ${verifyTasks.length} tasks after creation (was ${initialTasks.length})`);
    
    // Find our specific task
    const foundTask = verifyTasks.find((task: any) => task.id === createdTask.id);
    if (foundTask) {
      console.log('Successfully found created task:', foundTask);
    } else {
      console.log('ERROR: Could not find the task we just created!');
    }
    
    // Step 4: Update the task
    if (foundTask) {
      console.log('\nSTEP 4: Updating the task...');
      const updateData = {
        text: `${foundTask.text} (UPDATED)`,
        completed: true
      };
      
      const updateResponse = await fetch(`/api/projects/${projectId}/tasks/${foundTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to update task: ${updateResponse.status} ${updateResponse.statusText}`);
      }
      
      const updatedTask = await updateResponse.json();
      console.log('Updated task:', updatedTask);
      
      // Verify the update
      console.log('\nSTEP 5: Verifying task update...');
      const updateVerifyResponse = await fetch(`/api/projects/${projectId}/tasks`);
      if (!updateVerifyResponse.ok) {
        throw new Error(`Failed to verify updated task: ${updateVerifyResponse.status} ${updateVerifyResponse.statusText}`);
      }
      
      const updatedTasks = await updateVerifyResponse.json();
      const foundUpdatedTask = updatedTasks.find((task: any) => task.id === updatedTask.id);
      
      if (foundUpdatedTask) {
        console.log('Successfully found updated task:', foundUpdatedTask);
        if (foundUpdatedTask.text === updateData.text && foundUpdatedTask.completed === updateData.completed) {
          console.log('✅ Task was correctly updated with new values!');
        } else {
          console.log('❌ Task update verification failed!');
        }
      } else {
        console.log('❌ Error: Could not find the updated task!');
      }
    }
    
    // Ask user to reload the page to check persistence
    console.log('\nINSTRUCTIONS: Please reload the page and run this test again');
    console.log('If persistence is working, the updated task should still exist');
    console.log('Run this code to test again after reload:');
    console.log(`window.runTaskPersistenceTest("${projectId}")`);
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Export the functions to the window for console access
// @ts-ignore
window.listProjects = listProjects;
// @ts-ignore
window.runTaskPersistenceTest = runTaskPersistenceTest;