/**
 * Direct test of the UUID matching logic in projectsDb.ts
 * 
 * This test bypasses authentication and directly tests the modified functions
 * to verify that the UUID matching fix is working correctly.
 */

import { updateTask, deleteTask } from './server/projectsDb.js';

// Mock tasks for testing
const mockTasks = [
  {
    id: 'abc12345-6789-0123-4567-89abcdef0123-compound-suffix',
    text: 'Task with compound ID',
    completed: false,
    origin: 'factor'
  },
  {
    id: 'def67890-1234-5678-90ab-cdef01234567',
    text: 'Task with clean ID only',
    completed: false,
    origin: 'custom'
  }
];

// Mock function for loading project data
jest.mock('./server/projectsDb.js', () => {
  const original = jest.requireActual('./server/projectsDb.js');
  
  return {
    ...original,
    loadProjectPlan: jest.fn().mockResolvedValue({
      success: true,
      plan: {
        projectId: 'test-project-id',
        tasks: mockTasks
      }
    }),
    saveProjectPlan: jest.fn().mockResolvedValue({ success: true })
  };
});

// Test 1: Update a task using clean UUID when DB has compound ID
async function testUpdateWithCleanUuid() {
  console.log('Test 1: Update a task using clean UUID when DB has compound ID');
  const cleanId = 'abc12345-6789-0123-4567-89abcdef0123';
  
  const result = await updateTask('test-project-id', cleanId, { completed: true });
  
  if (result.success && result.task.id === mockTasks[0].id) {
    console.log('✅ SUCCESS: Task was found and updated using clean UUID');
  } else {
    console.log('❌ FAILURE: Task was not found or updated using clean UUID');
    console.log('Result:', result);
  }
}

// Test 2: Delete a task using clean UUID when DB has compound ID
async function testDeleteWithCleanUuid() {
  console.log('\nTest 2: Delete a task using clean UUID when DB has compound ID');
  const cleanId = 'abc12345-6789-0123-4567-89abcdef0123';
  
  const result = await deleteTask('test-project-id', cleanId);
  
  if (result.success) {
    console.log('✅ SUCCESS: Task was found and deleted using clean UUID');
  } else {
    console.log('❌ FAILURE: Task was not found or deleted using clean UUID');
    console.log('Result:', result);
  }
}

// Run all tests
async function runTests() {
  try {
    await testUpdateWithCleanUuid();
    await testDeleteWithCleanUuid();
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

runTests();