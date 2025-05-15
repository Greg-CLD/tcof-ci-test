/**
 * Script to test the enhanced task persistence after fixes
 * This tests the new consistent response formats from the API
 */
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Use the current server URL since we're running in Replit
const API_URL = 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co';
let authCookie = null;
let projectId = null;
let taskId = null;

async function login() {
  console.log('Attempting to log in...');
  const loginRes = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'greg@confluity.co.uk',
      password: 'password123'
    }),
    redirect: 'manual'
  });

  if (loginRes.status === 200 || loginRes.status === 302) {
    authCookie = loginRes.headers.get('set-cookie');
    console.log('Login successful, cookie obtained');
  } else {
    console.error('Login failed with status:', loginRes.status);
    const body = await loginRes.text();
    console.error('Response body:', body);
    process.exit(1);
  }
}

async function testCreateTask() {
  console.log('Testing task creation with enhanced response format...');
  
  const testTask = {
    text: `Test task created at ${new Date().toISOString()}`,
    stage: 'identification',
    origin: 'custom',
    sourceId: null,
    priority: 'high',
    notes: 'This is a test task to verify the enhanced task persistence'
  };
  
  try {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify(testTask)
    });
    
    const data = await res.json();
    console.log('Create task status:', res.status);
    console.log('Create task response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('Task created successfully');
      taskId = data.task.id;
      return data.task;
    } else {
      console.error('Task creation failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
}

async function testUpdateTask(task) {
  console.log('Testing task update with enhanced response format...');
  
  const updateData = {
    text: `${task.text} - UPDATED at ${new Date().toISOString()}`,
    notes: 'This task has been updated to verify persistence'
  };
  
  try {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify(updateData)
    });
    
    const data = await res.json();
    console.log('Update task status:', res.status);
    console.log('Update task response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('Task updated successfully');
      return data.task;
    } else {
      console.error('Task update failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
}

async function testDeleteTask() {
  console.log('Testing task deletion with enhanced response format...');
  
  try {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      }
    });
    
    const data = await res.json();
    console.log('Delete task status:', res.status);
    console.log('Delete task response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('Task deleted successfully');
      return true;
    } else {
      console.error('Task deletion failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

async function getProjects() {
  try {
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (res.status === 200) {
      const projects = await res.json();
      if (projects && projects.length > 0) {
        projectId = projects[0].id;
        console.log(`Selected project ID: ${projectId}`);
        return projectId;
      }
    }
    
    console.error('Failed to get projects or no projects found');
    return null;
  } catch (error) {
    console.error('Error getting projects:', error);
    return null;
  }
}

async function runTest() {
  try {
    await login();
    
    if (!authCookie) {
      console.error('No auth cookie obtained, cannot continue');
      return;
    }
    
    await getProjects();
    
    if (!projectId) {
      console.error('No project ID found, cannot continue');
      return;
    }
    
    // Run the full task CRUD cycle test
    const createdTask = await testCreateTask();
    
    if (createdTask) {
      const updatedTask = await testUpdateTask(createdTask);
      
      if (updatedTask) {
        await testDeleteTask();
      }
    }
    
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest();