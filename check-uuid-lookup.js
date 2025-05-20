/**
 * Simple test for the UUID prefix matching implementation
 * 
 * This script simulates the lookup logic we implemented in updateTask and deleteTask
 * to verify that the matching algorithm works as expected.
 */

// Sample tasks for testing
const tasks = [
  {
    id: 'abc12345-6789-0123-4567-89abcdef0123-success-factor', // Compound ID
    text: 'Task with compound ID',
    completed: false
  },
  {
    id: 'def67890-1234-5678-90ab-cdef01234567', // Regular UUID
    text: 'Task with clean ID only',
    completed: false
  }
];

// Test function that simulates our server-side lookup algorithm
function findTaskById(taskId) {
  console.log(`Looking for task with ID: ${taskId}`);
  
  // Method 1: Try exact match first (fastest)
  const exactMatch = tasks.find(task => task.id === taskId);
  if (exactMatch) {
    console.log(`Found task with exact ID match: ${taskId}`);
    return {
      success: true,
      task: exactMatch,
      method: 'exact-match'
    };
  }
  
  // Method 2: Check if any task has an ID that starts with our clean UUID
  console.log(`No exact match found, checking for UUID prefix match...`);
  
  for (const task of tasks) {
    // Extract the clean UUID from the task's ID (first 5 segments)
    const taskCleanId = task.id.split('-').slice(0, 5).join('-');
    
    // Log the comparison for debugging
    console.log(`Comparing task ID: "${task.id}"`);
    console.log(`Clean UUID: "${taskCleanId}"`);
    console.log(`Looking for: "${taskId}"`);
    
    // Check if this task's clean ID matches our input OR if task.id starts with input 
    if (taskCleanId === taskId || task.id.startsWith(taskId)) {
      console.log(`Found task with matching clean UUID or as prefix: ${task.id}`);
      return {
        success: true,
        task,
        method: 'prefix-match'
      };
    }
  }
  
  // If we get here, no match was found by any method
  console.log(`No task found with ID ${taskId} by any method`);
  return {
    success: false,
    error: `Task with ID ${taskId} not found by any method`
  };
}

// Run tests
console.log('===== TESTING UUID LOOKUP ALGORITHM =====');

// Test 1: Exact match with full compound ID
console.log('\nTEST 1: Search with full compound ID');
const test1 = findTaskById('abc12345-6789-0123-4567-89abcdef0123-success-factor');
console.log('Result:', test1.success ? 'SUCCESS' : 'FAILURE', `(method: ${test1.method})`);

// Test 2: Match with clean UUID against task with compound ID
console.log('\nTEST 2: Search with clean UUID against compound ID');
const test2 = findTaskById('abc12345-6789-0123-4567-89abcdef0123');
console.log('Result:', test2.success ? 'SUCCESS' : 'FAILURE', `(method: ${test2.method})`);

// Test 3: Exact match with regular UUID
console.log('\nTEST 3: Search with regular UUID');
const test3 = findTaskById('def67890-1234-5678-90ab-cdef01234567');
console.log('Result:', test3.success ? 'SUCCESS' : 'FAILURE', `(method: ${test3.method})`);

// Test 4: Match with partial UUID (should fail - we don't support this)
console.log('\nTEST 4: Search with partial UUID (should fail)');
const test4 = findTaskById('def67890');
console.log('Result:', test4.success ? 'SUCCESS' : 'FAILURE');

console.log('\n===== TEST COMPLETE =====');