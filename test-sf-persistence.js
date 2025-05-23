/**
 * Success Factor Task Persistence Test Script
 * 
 * This browser-compatible script runs a comprehensive API test for:
 * 1. Creating new projects
 * 2. Verifying proper seeding of Success Factor tasks (no duplicates)
 * 3. Toggling task state and verifying persistence
 * 4. Confirming project boundary enforcement
 * 
 * Run in browser console while logged in
 */

// Configuration
const BASE_URL = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const TEST_PROJECT_NAME_A = `SF Test Project A ${Date.now()}`;
const TEST_PROJECT_NAME_B = `SF Test Project B ${Date.now()}`;

// Test state
const TEST_STATE = {
  projectA: null,
  projectB: null,
  taskToToggleA: null,
  taskToToggleB: null,
  passedTests: 0,
  failedTests: 0
};

// Formatting helpers for console output
function green(text) { return `%c${text}`, 'color: green; font-weight: bold;' }
function red(text) { return `%c${text}`, 'color: red; font-weight: bold;' }
function yellow(text) { return `%c${text}`, 'color: orange; font-weight: bold;' }
function info(text) { console.log(`ℹ️ ${text}`); }

// Test reporting
function passTest(message) {
  console.log('✅ PASS:', message);
  TEST_STATE.passedTests++;
}

function failTest(message, details = null) {
  console.log('❌ FAIL:', message);
  if (details) {
    console.log('Details:', typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
  }
  TEST_STATE.failedTests++;
}

function step(number, message) {
  console.log(`\n======== STEP ${number}: ${message} ========`);
}

// Make an API request
async function apiRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include' // Includes cookies for authentication
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
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

// Run the comprehensive API test
async function runTest() {
  console.log('\n=== SUCCESS FACTOR TASK PERSISTENCE TEST ===\n');
  
  try {
    // Step 1: Verify authentication by getting user info
    step(1, 'Verify authentication');
    const userResponse = await apiRequest('GET', '/api/auth/user');
    if (!userResponse.ok || !userResponse.data) {
      failTest('Not authenticated. Please login first.');
      return;
    }
    passTest(`Successfully authenticated as ${userResponse.data.username}`);
    
    // Step 2: Create Project A
    step(2, 'Create first test project');
    const projectA = await createProject(TEST_PROJECT_NAME_A);
    if (!projectA) {
      throw new Error('Failed to create Project A');
    }
    TEST_STATE.projectA = projectA;
    
    // Step 3: Create Project B 
    step(3, 'Create second test project');
    const projectB = await createProject(TEST_PROJECT_NAME_B);
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
      passTest('No duplicate Success Factor tasks found in Project A - Fix #1 is working!');
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
      passTest('No duplicate Success Factor tasks found in Project B - Fix #1 is working!');
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
    
    info(`Selected task: ${taskToToggleA.id} (${taskToToggleA.text.substring(0, 30)}...)`);
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
    step(8, 'Verify cross-project boundary enforcement');
    // We need to find a task with the same sourceId and stage in Project B
    const tasksWithSameSourceIdB = tasksB.filter(
      task => task.sourceId === taskToToggleA.sourceId && task.stage === taskToToggleA.stage
    );
    
    if (tasksWithSameSourceIdB.length === 0) {
      failTest(`No task with sourceId=${taskToToggleA.sourceId} and stage=${taskToToggleA.stage} found in Project B. Boundary test inconclusive.`);
      // Choose any Success Factor task from Project B
      const successFactorTasksB = tasksB.filter(task => task.origin === 'factor');
      TEST_STATE.taskToToggleB = successFactorTasksB[0];
    } else {
      const taskB = tasksWithSameSourceIdB[0];
      TEST_STATE.taskToToggleB = taskB;
      
      // Should have different state in project B (project boundary enforced)
      if (taskB.completed === toggledTaskA.completed) {
        failTest('Project boundary enforcement failure: Task in Project B has the same state as the toggled task in Project A', {
          projectA: { taskId: toggledTaskA.id, completed: toggledTaskA.completed },
          projectB: { taskId: taskB.id, completed: taskB.completed }
        });
      } else {
        passTest('Project boundary enforcement working! Task in Project B has different state than Project A - Fix #2 is working!');
      }
    }
    
    // Step 9: Toggle task in Project B to different state
    step(9, 'Toggle a Success Factor task in Project B');
    const taskToToggleB = TEST_STATE.taskToToggleB;
    
    if (!taskToToggleB) {
      failTest('No suitable task found in Project B to toggle');
      throw new Error('Cannot continue with Project B test');
    }
    
    info(`Selected task: ${taskToToggleB.id} (${taskToToggleB.text.substring(0, 30)}...)`);
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
    
    // Step 11: Final verification of both projects
    step(11, 'Final verification that changes in one project don\'t affect the other');
    
    // Final check of both projects to make sure state is unchanged
    const finalTasksA = await getTasks(projectA.id, false);
    const finalTaskA = finalTasksA.find(t => t.id === taskToToggleA.id);
    
    if (!finalTaskA) {
      failTest(`Final check: Could not find task ${taskToToggleA.id} in project ${projectA.id}`);
    } else if (finalTaskA.completed !== newCompletedState) {
      failTest(`Final check: Task A state changed unexpectedly. Expected ${newCompletedState}, got ${finalTaskA.completed}`, finalTaskA);
    } else {
      passTest('Final check: Task A state maintained correctly');
    }
    
    const finalTasksB = await getTasks(projectB.id, false);
    const finalTaskB = finalTasksB.find(t => t.id === taskToToggleB.id);
    
    if (!finalTaskB) {
      failTest(`Final check: Could not find task ${taskToToggleB.id} in project ${projectB.id}`);
    } else if (finalTaskB.completed !== newCompletedStateB) {
      failTest(`Final check: Task B state changed unexpectedly. Expected ${newCompletedStateB}, got ${finalTaskB.completed}`, finalTaskB);
    } else {
      passTest('Final check: Task B state maintained correctly');
    }
    
    // Test summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total tests passed: ${TEST_STATE.passedTests}`);
    console.log(`Total tests failed: ${TEST_STATE.failedTests}`);
    
    if (TEST_STATE.failedTests === 0) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('Both fixes are working correctly:');
      console.log('1. No duplicate Success Factor tasks are created during seeding');
      console.log('2. Task toggle operations persist correctly');
      console.log('3. Project boundaries are properly enforced (tasks in one project don\'t affect others)');
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      console.log('Please check the logs above for details on which tests failed.');
      
      // Determine which fixes worked
      const duplicatePrevention = !duplicatesA.hasDuplicates && !duplicatesB.hasDuplicates;
      const projectBoundaryEnforcement = finalTaskA && finalTaskB && 
                                        finalTaskA.completed === newCompletedState &&
                                        finalTaskB.completed === newCompletedStateB;
      
      if (duplicatePrevention) {
        console.log('✅ Fix #1 (Duplicate Prevention) is working correctly');
      } else {
        console.log('❌ Fix #1 (Duplicate Prevention) is NOT working correctly');
      }
      
      if (projectBoundaryEnforcement) {
        console.log('✅ Fix #2 (Project Boundary Enforcement) is working correctly');
      } else {
        console.log('❌ Fix #2 (Project Boundary Enforcement) is NOT working correctly');
      }
    }
    
  } catch (error) {
    console.error(`\nTest aborted due to critical error: ${error.message}`);
    console.error(error);
  }
}

// Export the function for running in the browser console
window.testSuccessFactorPersistence = runTest;

// Run the test
console.log('To run the test, execute: testSuccessFactorPersistence()');

// Auto-run the test if desired
// runTest();

// Return the test function for easy access
testSuccessFactorPersistence;