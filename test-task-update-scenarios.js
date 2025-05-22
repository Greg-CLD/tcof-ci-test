/**
 * Task Update Scenarios Test Script
 * 
 * This script tests all three task update scenarios:
 * 1. Normal task (non-factor) - should use id for updates
 * 2. Success Factor task with valid sourceId - should use sourceId for updates
 * 3. Success Factor task with missing/invalid sourceId - should fall back to id
 * 
 * Run in browser console or with Node.js
 */

// Read session cookie from file if in Node environment 
const fs = require('fs');
const SESSION_COOKIE = fs.readFileSync('cookies.txt', 'utf8').trim();

async function apiRequest(method, endpoint, body = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': SESSION_COOKIE
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`Making ${method} request to ${endpoint}`, body || '');
  const response = await fetch(`https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev${endpoint}`, options);
  const responseText = await response.text();

  try {
    // Try to parse as JSON
    const data = JSON.parse(responseText);
    console.log(`Response (${response.status})`, data);
    return { status: response.status, data, ok: response.ok };
  } catch (e) {
    // Return as text if not valid JSON
    console.log(`Response (${response.status})`, responseText);
    return { status: response.status, text: responseText, ok: response.ok };
  }
}

// Test all three scenarios
async function runTests() {
  try {
    // Get the project ID
    const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
    
    console.log('===== FETCHING ALL TASKS =====');
    const { data: tasks } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    
    if (!tasks || !tasks.length) {
      console.error('No tasks found to test with!');
      return;
    }
    
    // 1. Find a normal (non-factor) task
    const normalTask = tasks.find(t => t.source !== 'factor' && t.origin !== 'factor');
    
    // 2. Find a Success Factor task with valid sourceId
    const factorTaskWithSourceId = tasks.find(t => 
      (t.source === 'factor' || t.origin === 'factor') && 
      t.sourceId && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t.sourceId)
    );
    
    // 3. Find a Success Factor task without valid sourceId (or create one)
    let factorTaskWithoutValidSourceId = tasks.find(t => 
      (t.source === 'factor' || t.origin === 'factor') && 
      (!t.sourceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t.sourceId))
    );
    
    // Test results
    console.log('===== TEST TASKS FOUND =====');
    console.log('1. Normal task:', normalTask ? normalTask.id : 'None found');
    console.log('2. Factor task with valid sourceId:', factorTaskWithSourceId ? factorTaskWithSourceId.id : 'None found');
    console.log('3. Factor task without valid sourceId:', factorTaskWithoutValidSourceId ? factorTaskWithoutValidSourceId.id : 'None found');
    
    // Test each scenario
    if (normalTask) {
      console.log('\n===== SCENARIO 1: NORMAL TASK =====');
      await testToggleTask(projectId, normalTask);
    }
    
    if (factorTaskWithSourceId) {
      console.log('\n===== SCENARIO 2: FACTOR TASK WITH VALID SOURCE ID =====');
      await testToggleTask(projectId, factorTaskWithSourceId);
    }
    
    if (factorTaskWithoutValidSourceId) {
      console.log('\n===== SCENARIO 3: FACTOR TASK WITHOUT VALID SOURCE ID =====');
      await testToggleTask(projectId, factorTaskWithoutValidSourceId);
    }
    
    // Finally, verify all tasks are still accessible
    const { data: tasksAfter } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    console.log('\n===== FINAL VERIFICATION: ALL TASKS STILL ACCESSIBLE =====');
    console.log(`Total task count: ${tasksAfter.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function testToggleTask(projectId, task) {
  console.log('Task before update:', {
    id: task.id,
    text: task.text,
    completed: task.completed,
    source: task.source,
    origin: task.origin,
    sourceId: task.sourceId
  });
  
  // Toggle completion
  const updateBody = {
    completed: !task.completed,
    status: !task.completed ? 'Done' : 'To Do'
  };
  
  // Include origin and sourceId if they exist
  if (task.origin) {
    updateBody.origin = task.origin;
  }
  
  if (task.sourceId) {
    updateBody.sourceId = task.sourceId;
  }
  
  // Make the update request
  console.log('Making update request...');
  const updateResponse = await apiRequest(
    'PUT', 
    `/api/projects/${projectId}/tasks/${task.id}`, 
    updateBody
  );
  
  // Get the task after update to verify persistence
  console.log('Verifying task after update...');
  const { data: updatedTasks } = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  const updatedTask = updatedTasks.find(t => t.id === task.id);
  
  if (updatedTask) {
    console.log('Task after update:', {
      id: updatedTask.id,
      text: updatedTask.text,
      completed: updatedTask.completed,
      source: updatedTask.source,
      origin: updatedTask.origin,
      sourceId: updatedTask.sourceId
    });
    
    // Verify completion state was updated correctly
    if (updatedTask.completed === !task.completed) {
      console.log('✅ SUCCESS: Task completion state was updated correctly!');
    } else {
      console.log('❌ FAILURE: Task completion state was NOT updated correctly!');
    }
  } else {
    console.log('❌ ERROR: Could not find task after update!');
  }
  
  return updatedTask;
}

// Run the tests
runTests().catch(console.error);