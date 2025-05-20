/**
 * Direct verification of the UUID matching logic
 * 
 * This test script simulates both the server and client side logic
 * to verify our UUID handling improvements without requiring authentication.
 */

// This is a reproduction of the server-side findTaskById function with our improved UUID matching
function findTaskById(tasks, taskId) {
  console.log(`[TASK_LOOKUP] Looking for task with ID: ${taskId}`);
  
  // First try exact match (fastest)
  const exactMatch = tasks.find(task => task.id === taskId);
  if (exactMatch) {
    console.log(`[TASK_LOOKUP] Found task with exact ID match: ${taskId}`);
    return {
      success: true,
      task: exactMatch,
      method: 'exact-match'
    };
  }
  
  // If no exact match, try matching with clean UUID as prefix
  console.log(`[TASK_LOOKUP] No exact match, trying UUID prefix matching...`);
  
  for (const task of tasks) {
    // Extract the clean UUID from the task's ID (first 5 segments)
    const taskCleanId = task.id.split('-').slice(0, 5).join('-');
    
    // Log the comparison for debugging
    console.log(`[TASK_LOOKUP] Comparing task ID: "${task.id}"`);
    console.log(`[TASK_LOOKUP] Clean UUID: "${taskCleanId}"`);
    console.log(`[TASK_LOOKUP] Looking for: "${taskId}"`);
    
    // KEY IMPROVEMENT: Check if taskId matches clean UUID OR if task.id starts with taskId
    if (taskCleanId === taskId || task.id.startsWith(taskId)) {
      console.log(`[TASK_LOOKUP] Found task with matching clean UUID or as prefix: ${task.id}`);
      return {
        success: true,
        task,
        method: 'prefix-match'
      };
    }
  }
  
  // If we get here, no match was found
  console.log(`[TASK_LOOKUP] Task not found. ID: ${taskId}`);
  console.log(`[TASK_LOOKUP] Available task IDs:`, tasks.map(t => t.id));
  return {
    success: false,
    error: `Task with ID ${taskId} not found.`
  };
}

// Mock project tasks for testing
const mockTasks = [
  {
    id: 'abc12345-6789-0123-4567-89abcdef0123-success-factor',
    text: 'Task with compound ID from success factor',
    completed: false,
    origin: 'factor'
  },
  {
    id: 'def67890-1234-5678-90ab-cdef01234567',
    text: 'Task with regular UUID',
    completed: false,
    origin: 'custom'
  },
  {
    id: 'ghi12345-6789-0123-4567-89abcdef0123-custom-456',
    text: 'Custom task with compound ID',
    completed: false,
    origin: 'custom'
  }
];

// Function to update a task's completion state (simulates the update logic)
function updateTask(tasks, taskId, updates) {
  const result = findTaskById(tasks, taskId);
  
  if (!result.success) {
    return result;
  }
  
  // Update the task
  const taskIndex = tasks.findIndex(t => t.id === result.task.id);
  tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
  
  console.log(`[TASK_UPDATE] Successfully updated task via ${result.method}:`, {
    taskId,
    updatedTask: tasks[taskIndex]
  });
  
  return {
    success: true,
    task: tasks[taskIndex],
    method: result.method
  };
}

// Run verification tests
console.log('===== VERIFYING UUID MATCHING IMPLEMENTATION =====');

// Test 1: Update with exact compound ID
console.log('\nTEST 1: Update task using exact compound ID');
const test1 = updateTask(
  mockTasks,
  'abc12345-6789-0123-4567-89abcdef0123-success-factor',
  { completed: true }
);
console.log(`Result: ${test1.success ? 'SUCCESS' : 'FAILURE'}`);
console.log(`Updated task completed: ${test1.success ? test1.task.completed : 'N/A'}`);
console.log(`Method used: ${test1.method}`);

// Test 2: Update using clean UUID for a task with compound ID
console.log('\nTEST 2: Update task using clean UUID against compound ID');
const test2 = updateTask(
  mockTasks,
  'abc12345-6789-0123-4567-89abcdef0123',
  { completed: false }
);
console.log(`Result: ${test2.success ? 'SUCCESS' : 'FAILURE'}`);
console.log(`Updated task completed: ${test2.success ? test2.task.completed : 'N/A'}`);
console.log(`Method used: ${test2.method}`);

// Test 3: Update using exact regular UUID
console.log('\nTEST 3: Update task using exact regular UUID');
const test3 = updateTask(
  mockTasks,
  'def67890-1234-5678-90ab-cdef01234567',
  { completed: true }
);
console.log(`Result: ${test3.success ? 'SUCCESS' : 'FAILURE'}`);
console.log(`Updated task completed: ${test3.success ? test3.task.completed : 'N/A'}`);
console.log(`Method used: ${test3.method}`);

// Test 4: Update with partial UUID (first segments only)
console.log('\nTEST 4: Update with partial UUID (should work via prefix matching)');
const test4 = updateTask(
  mockTasks,
  'ghi12345',
  { completed: true }
);
console.log(`Result: ${test4.success ? 'SUCCESS' : 'FAILURE'}`);
console.log(`Updated task completed: ${test4.success ? test4.task.completed : 'N/A'}`);
console.log(`Method used: ${test4.method}`);

// Test 5: Update with non-existent task ID
console.log('\nTEST 5: Update with non-existent task ID (should fail)');
const test5 = updateTask(
  mockTasks,
  'nonexistent-task-id',
  { completed: true }
);
console.log(`Result: ${test5.success ? 'SUCCESS' : 'FAILURE'}`);
console.log(`Error: ${test5.error || 'N/A'}`);

console.log('\n===== VERIFICATION COMPLETE =====');

// Print final task states to confirm persistence
console.log('\nFinal task states:');
mockTasks.forEach((task, index) => {
  console.log(`Task ${index + 1}: ${task.id.substring(0, 15)}... - completed: ${task.completed}`);
});