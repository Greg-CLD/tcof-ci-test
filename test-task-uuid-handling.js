/**
 * Test script to verify task persistence with compound ID handling
 * This script tests:
 * 1. Creating a task with a compound ID
 * 2. Retrieving the task to verify it's saved
 * 3. Updating the task
 * 4. Getting the task by compound ID source
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const API_BASE = 'http://localhost:3000/api';
const PROJECT_ID = process.argv[2]; // Pass project ID as first argument

if (!PROJECT_ID) {
  console.error('Please provide a project ID as the first argument');
  process.exit(1);
}

// Helper to format a compound ID like those in success factors
function createCompoundId() {
  const baseUuid = uuidv4();
  return `${baseUuid}-test-${Date.now()}`;
}

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/login`, {
      username: 'greg@confluity.co.uk',
      password: 'password123'
    });
    console.log('Login successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test creating a task with a compound ID
async function testCreateTask() {
  const compoundId = createCompoundId();
  console.log(`Testing task creation with compound ID: ${compoundId}`);

  try {
    // Create a task using the compound ID
    const createResponse = await axios.post(`${API_BASE}/projects/${PROJECT_ID}/tasks`, {
      id: compoundId,
      text: `Test Task with Compound ID ${compoundId}`,
      stage: 'identification',
      origin: 'factor',
      sourceId: '',
      completed: false,
      priority: 'medium',
      owner: 'Test Script',
    }, { withCredentials: true });

    console.log('Task creation response:', createResponse.data);
    
    // Get all tasks for the project to verify the task was saved
    const getAllResponse = await axios.get(`${API_BASE}/projects/${PROJECT_ID}/tasks`, 
      { withCredentials: true });
    
    // Find our task in the results
    const foundTask = getAllResponse.data.find(task => 
      task.id === compoundId || task.sourceId === compoundId);
    
    if (foundTask) {
      console.log('Task found in project tasks:', foundTask);
    } else {
      console.error('Task not found in project tasks');
      process.exit(1);
    }

    // Return the created task for the next test
    return foundTask;
  } catch (error) {
    console.error('Task creation test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test updating a task with a compound ID
async function testUpdateTask(task) {
  console.log(`Testing task update for task ID: ${task.id}`);

  try {
    // Update the task
    const updateResponse = await axios.patch(`${API_BASE}/projects/${PROJECT_ID}/tasks/${task.id}`, {
      text: `Updated Task ${task.id}`,
      completed: true,
    }, { withCredentials: true });

    console.log('Task update response:', updateResponse.data);
    
    // Verify the task was updated
    const getTaskResponse = await axios.get(`${API_BASE}/projects/${PROJECT_ID}/tasks/${task.id}`, 
      { withCredentials: true });
    
    console.log('Updated task:', getTaskResponse.data);
    
    return getTaskResponse.data;
  } catch (error) {
    console.error('Task update test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test getting tasks by source ID
async function testGetBySourceId(task) {
  const sourceId = task.sourceId || task.id;
  console.log(`Testing getting tasks by source ID: ${sourceId}`);

  try {
    // Get tasks by source ID
    const response = await axios.get(`${API_BASE}/projects/${PROJECT_ID}/tasks/source/${sourceId}`, 
      { withCredentials: true });
    
    console.log(`Found ${response.data.length} tasks with source ID ${sourceId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Get by source ID test failed:', error.response?.data || error.message);
    throw error;
  }
}

// Clean up by deleting the test task
async function cleanUp(task) {
  console.log(`Cleaning up task ID: ${task.id}`);

  try {
    const response = await axios.delete(`${API_BASE}/projects/${PROJECT_ID}/tasks/${task.id}`, 
      { withCredentials: true });
    
    console.log('Task deletion response:', response.data);
  } catch (error) {
    console.error('Task cleanup failed:', error.response?.data || error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    // Setup a cookie jar for session persistence
    axios.defaults.withCredentials = true;
    
    // Login first
    await login();
    
    // Run the tests
    const createdTask = await testCreateTask();
    const updatedTask = await testUpdateTask(createdTask);
    const sourceTasks = await testGetBySourceId(updatedTask);
    
    // Clean up
    if (process.argv.includes('--cleanup')) {
      await cleanUp(updatedTask);
    }
    
    console.log('All tests completed successfully');
  } catch (error) {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the test suite
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});