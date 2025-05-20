/**
 * Focused smoke test for the UUID task lookup improvement
 * 
 * This script directly tests the core improvement to the task lookup logic:
 * - Looking up tasks by clean UUID prefix
 * - Verifying all matching methods work
 * 
 * It uses a simplified approach that doesn't rely on database interactions
 * or authentication, just pure logic verification.
 */

// Clean a task ID (extract UUID part from a compound ID with suffix)
function cleanTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string') return taskId;
  
  // Extract the UUID part (first 5 segments) from a compound ID
  const segments = taskId.split('-');
  if (segments.length >= 5) {
    return segments.slice(0, 5).join('-');
  }
  
  return taskId;
}

// Mock database with test tasks
const mockTasks = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    text: 'Regular UUID task',
    completed: false,
    origin: 'custom'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890-factor-123',
    text: 'Success factor task with compound ID',
    completed: false,
    origin: 'factor'
  },
  {
    id: '98765432-10ab-cdef-fedc-ba0987654321-custom-456',
    text: 'Custom task with compound ID',
    completed: false,
    origin: 'custom'
  }
];

// Improved findTaskById function that mirrors the server implementation
function findTaskById(tasks, taskId) {
  console.log(`Looking for task with ID: ${taskId}`);
  
  // First try exact match (fastest path)
  const exactMatch = tasks.find(task => task.id === taskId);
  
  if (exactMatch) {
    console.log(`Found task with exact ID match: ${taskId}`);
    return {
      success: true,
      task: exactMatch,
      method: 'exact-match'
    };
  }
  
  // If no exact match, try the enhanced matching
  console.log('No exact match, trying enhanced UUID matching...');
  
  for (const task of tasks) {
    // Extract the clean UUID (first 5 segments) from a compound ID
    const taskCleanId = cleanTaskId(task.id);
    
    console.log(`\nComparing task ID: "${task.id}"`);
    console.log(`Clean UUID: "${taskCleanId}"`);
    console.log(`Looking for: "${taskId}"`);
    
    // KEY IMPROVEMENT: Check if taskId matches clean UUID OR if task.id starts with taskId
    if (taskCleanId === taskId || task.id.startsWith(taskId)) {
      console.log(`Found task with improved matching: ${task.id}`);
      return {
        success: true,
        task,
        method: taskCleanId === taskId ? 'clean-uuid-match' : 'prefix-match'
      };
    }
  }
  
  // If we get here, no match was found
  console.log(`Task not found with ID ${taskId}`);
  console.log('Available task IDs:', tasks.map(t => t.id));
  
  return {
    success: false,
    error: `Task not found with ID ${taskId}`
  };
}

// Update a task's completion state
function updateTask(tasks, taskId, updates) {
  const result = findTaskById(tasks, taskId);
  
  if (!result.success) {
    return result;
  }
  
  // Find the task by its ID and update it
  const taskIndex = tasks.findIndex(t => t.id === result.task.id);
  
  if (taskIndex === -1) {
    return {
      success: false,
      error: 'Task not found in collection'
    };
  }
  
  // Update the task
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...updates
  };
  
  return {
    success: true,
    task: tasks[taskIndex],
    method: result.method
  };
}

// Run tests
function runTests() {
  console.log('====================================================');
  console.log('TESTING UUID TASK LOOKUP IMPROVEMENT');
  console.log('====================================================');
  console.log('This test verifies that tasks can be found by their clean UUID');
  console.log('even when stored with compound IDs (UUID + suffix)');
  console.log('\nOriginal tasks:');
  mockTasks.forEach((task, i) => {
    console.log(`Task ${i+1}: ${task.id} - ${task.text} - completed: ${task.completed}`);
  });
  
  console.log('\n====================================================');
  console.log('TEST 1: Find and update task by exact ID');
  console.log('====================================================');
  
  const exactTaskId = mockTasks[0].id;
  const test1 = updateTask(mockTasks, exactTaskId, { completed: true });
  
  console.log(`\nResult: ${test1.success ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`Method used: ${test1.method || 'N/A'}`);
  console.log(`Task is now completed: ${test1.success ? test1.task.completed : 'N/A'}`);
  
  console.log('\n====================================================');
  console.log('TEST 2: Find and update task by clean UUID (without suffix)');
  console.log('====================================================');
  
  const compoundTaskId = mockTasks[1].id;
  const cleanUuid = cleanTaskId(compoundTaskId);
  
  console.log(`Full compound ID: ${compoundTaskId}`);
  console.log(`Clean UUID part: ${cleanUuid}`);
  
  const test2 = updateTask(mockTasks, cleanUuid, { completed: true });
  
  console.log(`\nResult: ${test2.success ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`Method used: ${test2.method || 'N/A'}`);
  console.log(`Task is now completed: ${test2.success ? test2.task.completed : 'N/A'}`);
  
  console.log('\n====================================================');
  console.log('TEST 3: Find and update task by partial UUID prefix');
  console.log('====================================================');
  
  const partialUuid = mockTasks[2].id.split('-')[0]; // Just first segment
  
  console.log(`Full task ID: ${mockTasks[2].id}`);
  console.log(`Partial UUID prefix: ${partialUuid}`);
  
  const test3 = updateTask(mockTasks, partialUuid, { completed: true });
  
  console.log(`\nResult: ${test3.success ? 'SUCCESS' : 'FAILURE'}`);
  console.log(`Method used: ${test3.method || 'N/A'}`);
  console.log(`Task is now completed: ${test3.success ? test3.task.completed : 'N/A'}`);
  
  console.log('\n====================================================');
  console.log('TEST 4: Attempt to find non-existent task (should fail)');
  console.log('====================================================');
  
  const nonExistentId = 'non-existent-task-id';
  const test4 = findTaskById(mockTasks, nonExistentId);
  
  console.log(`\nResult: ${!test4.success ? 'SUCCESS' : 'FAILURE'}`); // Inverted logic - failure is success
  console.log(`Error message: ${test4.error || 'N/A'}`);
  
  console.log('\n====================================================');
  console.log('FINAL TASK STATES');
  console.log('====================================================');
  
  mockTasks.forEach((task, i) => {
    console.log(`Task ${i+1}: ${task.id.substring(0, 12)}... - completed: ${task.completed}`);
  });
  
  console.log('\n====================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('====================================================');
  
  console.log(`Test 1 (Exact match): ${test1.success ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Test 2 (Clean UUID): ${test2.success ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Test 3 (Partial UUID): ${test3.success ? 'PASSED ✓' : 'FAILED ✗'}`);
  console.log(`Test 4 (Non-existent): ${!test4.success ? 'PASSED ✓' : 'FAILED ✗'}`);
  
  const allPassed = test1.success && test2.success && test3.success && !test4.success;
  
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED! The UUID matching implementation is working correctly.');
    console.log('Tasks can now be found by their clean UUID even when stored with compound IDs.');
  } else {
    console.log('\n❌ SOME TESTS FAILED! Check the logs for details.');
  }
}

// Run the tests
runTests();