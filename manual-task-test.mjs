/**
 * Direct test script for the task persistence fixes
 * This script tests the main functions we've modified to ensure proper UUID handling
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { projectsDb } = require('./server/projectsDb');
import { v4 as uuidv4 } from 'uuid';

// Helper to create a compound ID like those in success factors
function createCompoundId() {
  const baseUuid = uuidv4();
  return `${baseUuid}-test-${Date.now()}`;
}

// Test project ID - update this to match an existing project
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Create a test task with a compound ID
async function testCreateTask() {
  console.log('=== Testing task creation with compound ID ===');
  const compoundId = createCompoundId();
  console.log(`Generated compound ID: ${compoundId}`);
  
  try {
    const task = await projectsDb.createTask({
      id: compoundId,
      projectId: PROJECT_ID,
      text: `Test Task ${compoundId.substring(0, 8)}`,
      stage: 'identification',
      origin: 'factor',
      sourceId: compoundId,
      completed: false,
      notes: 'Created by manual test script',
      priority: 'medium',
      owner: 'Test Script',
      status: 'pending',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('Task created successfully:', task);
    return task;
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}

// Test getting tasks with a compound source ID
async function testGetTasksBySourceId(task) {
  console.log('=== Testing getTasksForSource with compound ID ===');
  const sourceId = task.sourceId;
  console.log(`Fetching tasks with source ID: ${sourceId}`);
  
  try {
    const tasks = await projectsDb.getTasksForSource(PROJECT_ID, sourceId);
    console.log(`Found ${tasks.length} tasks with source ID ${sourceId}`);
    console.log('First matching task:', tasks[0]);
    return tasks;
  } catch (error) {
    console.error('Error fetching tasks by source ID:', error);
    throw error;
  }
}

// Test updating a task with a compound ID
async function testUpdateTask(task) {
  console.log('=== Testing updateTask with compound ID ===');
  console.log(`Updating task with ID: ${task.id}`);
  
  try {
    const updatedTask = await projectsDb.updateTask(task.id, {
      text: `Updated Task ${task.id.substring(0, 8)}`,
      completed: true
    });
    
    console.log('Task updated successfully:', updatedTask);
    return updatedTask;
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
}

// Delete the test task
async function cleanup(task) {
  console.log('=== Cleaning up test task ===');
  console.log(`Deleting task with ID: ${task.id}`);
  
  try {
    const result = await projectsDb.deleteTask(task.id);
    console.log('Task deletion result:', result);
  } catch (error) {
    console.error('Task deletion failed:', error);
  }
}

// Run the tests in sequence
async function runTests() {
  try {
    const task = await testCreateTask();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    const sourceTasks = await testGetTasksBySourceId(task);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    const updatedTask = await testUpdateTask(task);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    // Clean up
    if (process.argv.includes('--cleanup')) {
      await cleanup(updatedTask);
    }
    
    console.log('\n=== All tests completed successfully ===');
  } catch (error) {
    console.error('\n=== Test suite failed ===', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);