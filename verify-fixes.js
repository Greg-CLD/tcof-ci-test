/**
 * Verify Success Factor Task Fixes
 * 
 * This script makes a direct HTTP request to the API to verify:
 * 1. No duplicate Success Factor tasks are created
 * 2. Task toggle operations are properly persisted
 */

// Make a direct HTTP request using the built-in fetch API
async function apiRequest(method, endpoint, body = null) {
  const url = `http://localhost:3000${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (response.status === 401) {
      console.error(`❌ Authentication error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error making API request to ${url}:`, error);
    return null;
  }
}

// Run this in browser console to verify the fixes
async function verifyFixes() {
  console.log('=== VERIFYING SUCCESS FACTOR TASK FIXES ===');
  
  // Step 1: Get current project ID from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  
  if (!projectId) {
    console.error('❌ No project ID found in URL. Please go to a project page.');
    return;
  }
  
  console.log(`ℹ️ Using project ID: ${projectId}`);
  
  // Step 2: Get tasks for the project
  console.log('ℹ️ Getting tasks with ensure=true to trigger Success Factor seeding...');
  const tasks = await apiRequest('GET', `/api/projects/${projectId}/tasks?ensure=true`);
  
  if (!tasks) {
    console.error('❌ Failed to get tasks');
    return;
  }
  
  console.log(`✅ Retrieved ${tasks.length} tasks`);
  
  // Step 3: Check for duplicate Success Factor tasks
  const successFactorTasks = tasks.filter(task => task.origin === 'factor');
  console.log(`ℹ️ Found ${successFactorTasks.length} Success Factor tasks`);
  
  // Group tasks by sourceId and stage
  const tasksBySourceIdAndStage = {};
  
  for (const task of successFactorTasks) {
    const key = `${task.sourceId}:${task.stage}`;
    if (!tasksBySourceIdAndStage[key]) {
      tasksBySourceIdAndStage[key] = [];
    }
    tasksBySourceIdAndStage[key].push(task);
  }
  
  // Check for duplicates
  const duplicates = Object.entries(tasksBySourceIdAndStage)
    .filter(([key, tasksWithKey]) => tasksWithKey.length > 1);
  
  if (duplicates.length > 0) {
    console.error(`❌ Found ${duplicates.length} Success Factors with duplicate tasks`);
    console.log('Duplicate Tasks:');
    duplicates.forEach(([key, tasksWithKey]) => {
      console.log(`- ${key}: ${tasksWithKey.length} tasks (should be 1)`);
      console.log('  Task IDs:', tasksWithKey.map(t => t.id).join(', '));
    });
  } else {
    console.log('✅ No duplicate Success Factor tasks found - Fix #1 is working!');
  }
  
  // Step 4: Test task toggle persistence
  console.log('\nℹ️ Testing task toggle persistence...');
  
  // Find a Success Factor task to toggle
  const taskToToggle = successFactorTasks[0];
  if (!taskToToggle) {
    console.error('❌ No Success Factor tasks found to toggle');
    return;
  }
  
  console.log(`ℹ️ Toggling task ${taskToToggle.id} (${taskToToggle.text.substring(0, 30)}...) completed=${!taskToToggle.completed}`);
  
  // Toggle the task
  const toggleResponse = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskToToggle.id}`, {
    completed: !taskToToggle.completed
  });
  
  if (!toggleResponse) {
    console.error('❌ Failed to toggle task');
    return;
  }
  
  console.log('✅ Task toggle API call successful');
  
  // Get tasks again and check if the toggle persisted
  console.log('ℹ️ Getting tasks again to verify persistence...');
  const updatedTasks = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
  
  if (!updatedTasks) {
    console.error('❌ Failed to get updated tasks');
    return;
  }
  
  // Find the toggled task in the updated tasks
  const updatedTask = updatedTasks.find(task => task.id === taskToToggle.id);
  
  if (!updatedTask) {
    console.error(`❌ Could not find toggled task ${taskToToggle.id} in updated tasks`);
    return;
  }
  
  if (updatedTask.completed === taskToToggle.completed) {
    console.error(`❌ Task toggle did not persist: expected completed=${!taskToToggle.completed}, got completed=${updatedTask.completed}`);
  } else {
    console.log(`✅ Task toggle persisted correctly: completed=${updatedTask.completed} - Fix #2 is working!`);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  if (duplicates.length === 0 && updatedTask.completed !== taskToToggle.completed) {
    console.log('✅ Both fixes appear to be working correctly:');
    console.log('✅ 1. No duplicate Success Factor tasks found during seeding');
    console.log('✅ 2. Task toggle operations are correctly persisted (proper project boundary enforcement)');
  } else {
    console.log('❌ One or more fixes are not working. Please check the logs above for details.');
  }
}

// This script is meant to be pasted into the browser console
// when on a project page
console.log('Paste this entire script into your browser console and run it');
console.log('Or call verifyFixes() function directly after pasting');