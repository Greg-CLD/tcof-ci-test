/**
 * Quick test for TASK_LOOKUP debug output
 * 
 * This script:
 * 1. Gets all tasks for a project
 * 2. Updates the first task found
 * 3. Observes the TASK_LOOKUP debug output
 * 
 * Run with: node quick-task-lookup-test.js
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Load session cookie if available
const loadCookie = () => {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch {
    console.error('Cookie file not found. Run extract-cookie.js first!');
    process.exit(1);
  }
};

// Helper for API requests
async function apiRequest(method, endpoint, body = null) {
  const cookie = loadCookie();
  const options = {
    method,
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`http://localhost:3000${endpoint}`, options);
  return response;
}

// Main test function
async function testTaskLookup() {
  console.log('======= Testing TASK_LOOKUP Debug Output =======');
  
  try {
    // Get projects
    console.log('Fetching projects...');
    const projectsResponse = await apiRequest('GET', '/api/projects');
    const projects = await projectsResponse.json();
    
    if (!projects || projects.length === 0) {
      console.error('No projects found!');
      return;
    }
    
    // Use the first project
    const project = projects[0];
    console.log(`Using project: ${project.name} (${project.id})`);
    
    // Get tasks for this project
    console.log('Fetching tasks...');
    const tasksResponse = await apiRequest('GET', `/api/projects/${project.id}/tasks`);
    const tasks = await tasksResponse.json();
    
    if (!tasks || tasks.length === 0) {
      console.error('No tasks found for this project!');
      return;
    }
    
    // Use the first task
    const task = tasks[0];
    console.log(`Found task: ${task.text} (${task.id})`);
    
    // Test update with exact ID
    console.log('\n--- Testing exact ID match ---');
    const exactUpdate = { completed: !task.completed };
    console.log(`Updating task ${task.id} with completed=${exactUpdate.completed}`);
    await apiRequest('PUT', `/api/projects/${project.id}/tasks/${task.id}`, exactUpdate);
    
    // Wait a moment to see the logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test update with clean UUID (if task has a compound ID)
    if (task.id.includes('-')) {
      console.log('\n--- Testing clean UUID match ---');
      const cleanUuid = task.id.split('-').slice(0, 5).join('-');
      console.log(`Updating task with clean UUID ${cleanUuid}`);
      const cleanUpdate = { completed: !exactUpdate.completed };
      await apiRequest('PUT', `/api/projects/${project.id}/tasks/${cleanUuid}`, cleanUpdate);
    }
    
    console.log('\nTest completed! Check the server logs for [TASK_LOOKUP] output.');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testTaskLookup();