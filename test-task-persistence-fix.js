/**
 * Test script to verify our task persistence fixes are working
 */
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

async function testTaskPersistence() {
  try {
    // Step 1: Login to get session cookie
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'password123'
      }),
      redirect: 'manual'
    });
    
    // Extract cookies for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login response status:', loginResponse.status);
    console.log('Cookies:', cookies);
    
    // Step 2: Get all projects to find a good test project
    const projectsResponse = await fetch('http://localhost:5000/api/projects', {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
    }
    
    const projects = await projectsResponse.json();
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      throw new Error('No projects found, cannot proceed with test');
    }
    
    // Use the first project for testing
    const testProject = projects[0];
    console.log('Using test project:', testProject.id, testProject.name);
    
    // Step 3: Get existing tasks for the test project
    const tasksBeforeResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/tasks`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!tasksBeforeResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksBeforeResponse.status}`);
    }
    
    const tasksBefore = await tasksBeforeResponse.json();
    console.log(`Project has ${tasksBefore.length} existing tasks`);
    
    // Step 4: Create a new task with a random identifier
    const testId = uuidv4();
    const newTask = {
      projectId: testProject.id,
      text: `Test task persistence - ${testId}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: `test-${testId}`,
      completed: false,
      notes: 'This is a test task created by the task persistence fix test script',
      priority: 'high',
      dueDate: '',
      owner: 'Test User',
      status: 'pending'
    };
    
    console.log('Creating new task...');
    
    const createTaskResponse = await fetch(`http://localhost:3000/api/projects/${testProject.id}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(newTask)
    });
    
    if (!createTaskResponse.ok) {
      throw new Error(`Failed to create task: ${createTaskResponse.status}`);
    }
    
    const createdTask = await createTaskResponse.json();
    console.log('Successfully created task:', createdTask.id);
    
    // Step 5: Get tasks again to verify the new task exists
    const tasksAfterResponse = await fetch(`http://localhost:3000/api/projects/${testProject.id}/tasks`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    if (!tasksAfterResponse.ok) {
      throw new Error(`Failed to fetch tasks after creation: ${tasksAfterResponse.status}`);
    }
    
    const tasksAfter = await tasksAfterResponse.json();
    console.log(`Project now has ${tasksAfter.length} tasks (expected ${tasksBefore.length + 1})`);
    
    // Step 6: Verify the new task is in the list
    const foundTask = tasksAfter.find(task => 
      task.text === newTask.text && task.sourceId === newTask.sourceId
    );
    
    if (foundTask) {
      console.log('✅ SUCCESS: Task was created and retrieved successfully with ID:', foundTask.id);
      
      // Step 7: Try updating the task
      const updateData = {
        ...foundTask,
        notes: `Updated notes for test task - ${new Date().toISOString()}`
      };
      
      const updateResponse = await fetch(`http://localhost:3000/api/projects/${testProject.id}/tasks/${foundTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        console.log('✅ SUCCESS: Task was updated successfully');
      } else {
        console.error('❌ ERROR: Failed to update task:', updateResponse.status);
      }
    } else {
      console.error('❌ ERROR: Created task was not found in the list of tasks');
      console.log('Expected to find task with:', { 
        text: newTask.text, 
        sourceId: newTask.sourceId 
      });
      console.log('Available tasks:', tasksAfter.map(t => ({ id: t.id, text: t.text, sourceId: t.sourceId })));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTaskPersistence();
