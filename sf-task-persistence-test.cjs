/**
 * Success Factor Task Persistence E2E Test
 * 
 * This script runs a comprehensive end-to-end test of the Success Factor task
 * persistence fixes, verifying:
 * 1. New projects are correctly created
 * 2. Success Factor tasks are properly seeded without duplicates
 * 3. Task toggle state persists correctly
 * 4. Project boundaries are enforced (changes in one project don't affect another)
 * 
 * Run with: node sf-task-persistence-test.cjs
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
let SESSION_COOKIE = '';

// Test state
const TEST_STATE = {
  projectA: null,
  projectB: null,
  taskToToggleA: null,
  taskToToggleB: null,
  passedTests: 0,
  failedTests: 0
};

// Formatting helpers
function green(text) { return `\x1b[32m${text}\x1b[0m`; }
function red(text) { return `\x1b[31m${text}\x1b[0m`; }
function yellow(text) { return `\x1b[33m${text}\x1b[0m`; }
function cyan(text) { return `\x1b[36m${text}\x1b[0m`; }
function bold(text) { return `\x1b[1m${text}\x1b[0m`; }

// Test reporting
function passTest(message) {
  console.log(`${green('✅ PASS:')} ${message}`);
  TEST_STATE.passedTests++;
}

function failTest(message, details = null) {
  console.log(`${red('❌ FAIL:')} ${message}`);
  if (details) {
    console.log(`${red('Details:')} ${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}`);
  }
  TEST_STATE.failedTests++;
}

function info(message) {
  console.log(`${cyan('ℹ️')} ${message}`);
}

function step(number, message) {
  console.log(`\n${bold(yellow(`STEP ${number}: ${message}`))}`)
}

// Make an authenticated API request
async function apiRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': SESSION_COOKIE
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    // Update session cookie if it's in the response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      SESSION_COOKIE = setCookie;
    }
    
    // Parse response
    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error(`Error making API request to ${url}:`, error);
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

// Login to get session cookie
async function login() {
  info('Logging in...');
  
  const response = await apiRequest('POST', '/api/auth/login', {
    username: 'greg@confluity.co.uk',
    password: 'password'
  });
  
  if (!response.ok) {
    failTest(`Failed to login. Status: ${response.status}`, response);
    return false;
  }
  
  passTest('Successfully logged in');
  return true;
}

// Check for duplicate tasks in a list of tasks
function checkForDuplicates(tasks) {
  const successFactorTasks = tasks.filter(task => task.origin === 'factor');
  const tasksBySourceIdAndStage = {};
  
  // Group tasks by sourceId and stage
  for (const task of successFactorTasks) {
    const key = `${task.sourceId}:${task.stage}`;
    if (!tasksBySourceIdAndStage[key]) {
      tasksBySourceIdAndStage[key] = [];
    }
    tasksBySourceIdAndStage[key].push(task);
  }
  
  // Find duplicates
  const duplicates = Object.entries(tasksBySourceIdAndStage)
    .filter(([key, tasksWithKey]) => tasksWithKey.length > 1)
    .map(([key, tasks]) => ({
      key,
      count: tasks.length,
      tasks: tasks.map(t => ({ id: t.id, sourceId: t.sourceId, stage: t.stage }))
    }));
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates
  };
}

// Create a new test project
async function createProject(name) {
  info(`Creating new project: "${name}"...`);
  
  const response = await apiRequest('POST', '/api/projects', {
    name,
    description: 'Test project for Success Factor task persistence'
  });
  
  if (!response.ok || !response.data || !response.data.id) {
    failTest(`Failed to create project "${name}". Status: ${response.status}`, response);
    return null;
  }
  
  passTest(`Created project "${name}" with ID: ${response.data.id}`);
  return response.data;
}

// Get tasks for a project
async function getTasks(projectId, ensure = true) {
  info(`Getting tasks for project ${projectId}${ensure ? ' (with ensure=true)' : ''}...`);
  
  const response = await apiRequest('GET', `/api/projects/${projectId}/tasks${ensure ? '?ensure=true' : ''}`);
  
  if (!response.ok) {
    failTest(`Failed to get tasks for project ${projectId}. Status: ${response.status}`, response);
    return null;
  }
  
  passTest(`Retrieved ${response.data.length} tasks for project ${projectId}`);
  return response.data;
}

// Toggle a task's completion state
async function toggleTask(projectId, taskId, completed) {
  info(`Toggling task ${taskId} to completed=${completed} in project ${projectId}...`);
  
  const response = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, {
    completed,
    status: completed ? 'Done' : 'To Do'
  });
  
  if (!response.ok) {
    failTest(`Failed to toggle task ${taskId}. Status: ${response.status}`, response);
    return null;
  }
  
  passTest(`Successfully toggled task ${taskId} to completed=${completed}`);
  return response.data;
}

// Verify task persistence
async function verifyPersistence(projectId, taskId, expectedCompletedState) {
  info(`Verifying persistence of task ${taskId} (should be completed=${expectedCompletedState})...`);
  
  const tasks = await getTasks(projectId, false);
  if (!tasks) {
    return false;
  }
  
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    failTest(`Could not find task ${taskId} in project ${projectId}`, { taskId, tasks: tasks.map(t => t.id) });
    return false;
  }
  
  if (task.completed !== expectedCompletedState) {
    failTest(`Task ${taskId} persistence check failed. Expected completed=${expectedCompletedState}, got completed=${task.completed}`, task);
    return false;
  }
  
  passTest(`Task ${taskId} correctly persisted with completed=${expectedCompletedState}`);
  return true;
}

// Verify that a task with the same sourceId in another project has a different state
async function verifyProjectBoundaryEnforcement(projectAId, taskAId, projectBId, sourceId, expectedDifference) {
  info(`Verifying project boundary enforcement between projects ${projectAId} and ${projectBId}...`);
  
  // Get tasks from both projects
  const tasksA = await getTasks(projectAId, false);
  const tasksB = await getTasks(projectBId, false);
  
  if (!tasksA || !tasksB) {
    return false;
  }
  
  // Find the task in Project A
  const taskA = tasksA.find(t => t.id === taskAId);
  
  if (!taskA) {
    failTest(`Could not find task ${taskAId} in project ${projectAId}`, { taskId: taskAId, tasks: tasksA.map(t => t.id) });
    return false;
  }
  
  // Find tasks with the same sourceId in Project B
  const tasksWithSameSourceId = tasksB.filter(t => t.sourceId === sourceId);
  
  if (tasksWithSameSourceId.length === 0) {
    info(`No tasks with sourceId=${sourceId} found in project ${projectBId}. Project boundary test inconclusive.`);
    return true;
  }
  
  // Check if the completion state differs as expected
  let boundaryEnforced = false;
  
  for (const taskB of tasksWithSameSourceId) {
    if (taskB.stage === taskA.stage && taskB.completed !== taskA.completed) {
      boundaryEnforced = true;
      passTest(`Project boundary enforced: Task completion states differ between projects. Project A: ${taskA.completed}, Project B: ${taskB.completed}`);
      break;
    }
  }
  
  if (!boundaryEnforced && expectedDifference) {
    failTest(`Project boundary enforcement failed: Tasks with the same sourceId have the same completion state across projects`, 
      { 
        taskA: { id: taskA.id, sourceId: taskA.sourceId, stage: taskA.stage, completed: taskA.completed },
        tasksB: tasksWithSameSourceId.map(t => ({ id: t.id, sourceId: t.sourceId, stage: t.stage, completed: t.completed }))
      }
    );
    return false;
  }
  
  return boundaryEnforced;
}

// Run the comprehensive E2E test
async function runTest() {
  console.log(bold(yellow('\n=== SUCCESS FACTOR TASK PERSISTENCE E2E TEST ===')));
  
  try {
    // Step 1: Login
    step(1, 'Authenticate to the API');
    if (!await login()) {
      throw new Error('Authentication failed');
    }
    
    // Step 2: Create Project A
    step(2, 'Create first test project');
    const projectA = await createProject(`SF Test Project A ${Date.now()}`);
    if (!projectA) {
      throw new Error('Failed to create Project A');
    }
    TEST_STATE.projectA = projectA;
    
    // Step 3: Create Project B
    step(3, 'Create second test project');
    const projectB = await createProject(`SF Test Project B ${Date.now()}`);
    if (!projectB) {
      throw new Error('Failed to create Project B');
    }
    TEST_STATE.projectB = projectB;
    
    // Step 4: Seed and check tasks in Project A
    step(4, 'Seed and check for duplicate tasks in Project A');
    const tasksA = await getTasks(projectA.id, true);
    if (!tasksA) {
      throw new Error('Failed to get tasks for Project A');
    }
    
    // Check for duplicates
    const duplicatesA = checkForDuplicates(tasksA);
    if (duplicatesA.hasDuplicates) {
      failTest(`Found ${duplicatesA.duplicates.length} duplicate Success Factor tasks in Project A`, duplicatesA.duplicates);
    } else {
      passTest('No duplicate Success Factor tasks found in Project A');
    }
    
    // Step 5: Seed and check tasks in Project B
    step(5, 'Seed and check for duplicate tasks in Project B');
    const tasksB = await getTasks(projectB.id, true);
    if (!tasksB) {
      throw new Error('Failed to get tasks for Project B');
    }
    
    // Check for duplicates
    const duplicatesB = checkForDuplicates(tasksB);
    if (duplicatesB.hasDuplicates) {
      failTest(`Found ${duplicatesB.duplicates.length} duplicate Success Factor tasks in Project B`, duplicatesB.duplicates);
    } else {
      passTest('No duplicate Success Factor tasks found in Project B');
    }
    
    // Step 6: Toggle a Success Factor task in Project A
    step(6, 'Toggle a Success Factor task in Project A');
    // Find a Success Factor task to toggle
    const successFactorTasksA = tasksA.filter(task => task.origin === 'factor');
    if (successFactorTasksA.length === 0) {
      failTest('No Success Factor tasks found in Project A');
      throw new Error('Test cannot continue without Success Factor tasks');
    }
    
    // Choose a task to toggle
    const taskToToggleA = successFactorTasksA[0];
    TEST_STATE.taskToToggleA = taskToToggleA;
    
    info(`Selected task to toggle in Project A: ${taskToToggleA.id} (${taskToToggleA.text.substring(0, 30)}...)`);
    info(`Current state: completed=${taskToToggleA.completed}, sourceId=${taskToToggleA.sourceId}, stage=${taskToToggleA.stage}`);
    
    // Toggle the task to the opposite of its current state
    const newCompletedState = !taskToToggleA.completed;
    const toggledTaskA = await toggleTask(projectA.id, taskToToggleA.id, newCompletedState);
    
    if (!toggledTaskA) {
      throw new Error('Failed to toggle task in Project A');
    }
    
    // Check that the toggle response retained critical metadata
    if (toggledTaskA.origin !== taskToToggleA.origin || toggledTaskA.sourceId !== taskToToggleA.sourceId) {
      failTest('Task metadata changed after toggle', { 
        before: { origin: taskToToggleA.origin, sourceId: taskToToggleA.sourceId },
        after: { origin: toggledTaskA.origin, sourceId: toggledTaskA.sourceId }
      });
    } else {
      passTest('Task metadata preserved after toggle');
    }
    
    // Step 7: Verify persistence in Project A
    step(7, 'Verify task state persistence in Project A');
    const persistenceA = await verifyPersistence(projectA.id, taskToToggleA.id, newCompletedState);
    
    if (!persistenceA) {
      throw new Error('Task persistence check failed for Project A');
    }
    
    // Step 8: Find the same Success Factor in Project B
    step(8, 'Verify project boundary enforcement');
    // We need to find a task with the same sourceId and stage in Project B
    const tasksWithSameSourceIdB = tasksB.filter(
      task => task.sourceId === taskToToggleA.sourceId && task.stage === taskToToggleA.stage
    );
    
    if (tasksWithSameSourceIdB.length === 0) {
      info(`No task with sourceId=${taskToToggleA.sourceId} and stage=${taskToToggleA.stage} found in Project B. Using a different task for boundary test.`);
      
      // Choose any Success Factor task from Project B
      const successFactorTasksB = tasksB.filter(task => task.origin === 'factor');
      if (successFactorTasksB.length === 0) {
        failTest('No Success Factor tasks found in Project B for boundary test');
        throw new Error('Cannot continue boundary enforcement test');
      }
      
      TEST_STATE.taskToToggleB = successFactorTasksB[0];
    } else {
      TEST_STATE.taskToToggleB = tasksWithSameSourceIdB[0];
      
      // Verify that the initial state in Project B is different from the toggled state in Project A
      const boundaryEnforced = await verifyProjectBoundaryEnforcement(
        projectA.id, taskToToggleA.id, projectB.id, taskToToggleA.sourceId, true
      );
      
      if (!boundaryEnforced) {
        info('Note: Boundary enforcement test is less conclusive when initial states are the same. Proceeding with B task toggle.');
      }
    }
    
    // Step 9: Toggle a Success Factor task in Project B to a different state than A
    step(9, 'Toggle a Success Factor task in Project B');
    const taskToToggleB = TEST_STATE.taskToToggleB;
    
    info(`Selected task to toggle in Project B: ${taskToToggleB.id} (${taskToToggleB.text.substring(0, 30)}...)`);
    info(`Current state: completed=${taskToToggleB.completed}, sourceId=${taskToToggleB.sourceId}, stage=${taskToToggleB.stage}`);
    
    // Toggle to opposite of current state
    const newCompletedStateB = !taskToToggleB.completed;
    const toggledTaskB = await toggleTask(projectB.id, taskToToggleB.id, newCompletedStateB);
    
    if (!toggledTaskB) {
      throw new Error('Failed to toggle task in Project B');
    }
    
    // Step 10: Verify persistence in Project B
    step(10, 'Verify task state persistence in Project B');
    const persistenceB = await verifyPersistence(projectB.id, taskToToggleB.id, newCompletedStateB);
    
    if (!persistenceB) {
      throw new Error('Task persistence check failed for Project B');
    }
    
    // Step 11: Final verification of project boundaries by checking both projects
    step(11, 'Final verification that changes in one project don\'t affect the other');
    
    // Verify task A state hasn't changed after changing B
    const finalTasksA = await getTasks(projectA.id, false);
    const finalTaskA = finalTasksA.find(t => t.id === taskToToggleA.id);
    
    if (!finalTaskA) {
      failTest(`Final check: Could not find task ${taskToToggleA.id} in project ${projectA.id}`);
    } else if (finalTaskA.completed !== newCompletedState) {
      failTest(`Final check: Task A state changed unexpectedly. Expected ${newCompletedState}, got ${finalTaskA.completed}`, finalTaskA);
    } else {
      passTest('Final check: Task A state maintained correctly');
    }
    
    // Verify task B state hasn't changed because of A
    const finalTasksB = await getTasks(projectB.id, false);
    const finalTaskB = finalTasksB.find(t => t.id === taskToToggleB.id);
    
    if (!finalTaskB) {
      failTest(`Final check: Could not find task ${taskToToggleB.id} in project ${projectB.id}`);
    } else if (finalTaskB.completed !== newCompletedStateB) {
      failTest(`Final check: Task B state changed unexpectedly. Expected ${newCompletedStateB}, got ${finalTaskB.completed}`, finalTaskB);
    } else {
      passTest('Final check: Task B state maintained correctly');
    }
    
    // Step 12: Final duplicate check
    step(12, 'Final check for duplicate tasks');
    
    // Check once more for duplicates
    const finalDuplicatesA = checkForDuplicates(finalTasksA);
    const finalDuplicatesB = checkForDuplicates(finalTasksB);
    
    if (finalDuplicatesA.hasDuplicates) {
      failTest(`Final check: Found ${finalDuplicatesA.duplicates.length} duplicate Success Factor tasks in Project A`, finalDuplicatesA.duplicates);
    } else {
      passTest('Final check: No duplicate Success Factor tasks in Project A');
    }
    
    if (finalDuplicatesB.hasDuplicates) {
      failTest(`Final check: Found ${finalDuplicatesB.duplicates.length} duplicate Success Factor tasks in Project B`, finalDuplicatesB.duplicates);
    } else {
      passTest('Final check: No duplicate Success Factor tasks in Project B');
    }
    
    // Test summary
    console.log(bold(yellow('\n=== TEST SUMMARY ===')));
    console.log(`Total tests passed: ${green(TEST_STATE.passedTests)}`);
    console.log(`Total tests failed: ${TEST_STATE.failedTests > 0 ? red(TEST_STATE.failedTests) : green(TEST_STATE.failedTests)}`);
    
    if (TEST_STATE.failedTests === 0) {
      console.log(green(bold('\n✅ ALL TESTS PASSED!')));
      console.log(green('Both fixes are working correctly:'));
      console.log(green('1. No duplicate Success Factor tasks are created during seeding'));
      console.log(green('2. Task toggle operations persist correctly'));
      console.log(green('3. Project boundaries are properly enforced (tasks in one project don\'t affect others)'));
    } else {
      console.log(red(bold('\n❌ SOME TESTS FAILED')));
      console.log(red('Please check the logs above for details on which tests failed.'));
    }
    
  } catch (error) {
    console.error(red(`\nTest aborted due to critical error: ${error.message}`));
    console.error(error);
  }
}

// Run the test
runTest();