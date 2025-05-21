/**
 * Smoke Test for Success Factor Task Upsert Feature
 * 
 * This test verifies that:
 * 1. A non-existent task with origin "success-factor" gets automatically created
 * 2. The task update gets applied to the newly created task
 * 3. The task can be retrieved after creation
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Helper function for API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': process.env.SESSION_COOKIE || ''
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`http://localhost:5000${endpoint}`, options);
  
  console.log(`${method} ${endpoint} status: ${response.status}`);
  
  try {
    const data = await response.json();
    return { status: response.status, data };
  } catch (e) {
    return { status: response.status, data: null };
  }
}

// Get a valid project ID
async function getValidProjectId() {
  const { data } = await apiRequest('GET', '/api/projects');
  
  if (!data || !data.length) {
    throw new Error('No projects found');
  }
  
  return data[0].id;
}

// Main test function
async function runUpsertTest() {
  console.log('=== SUCCESS FACTOR TASK UPSERT TEST ===\n');
  
  try {
    // Step 1: Get a valid project ID
    const projectId = await getValidProjectId();
    console.log(`Using project ID: ${projectId}`);
    
    // Step 2: Generate a random UUID for our non-existent task
    const taskId = uuidv4();
    console.log(`Generated non-existent task ID: ${taskId}`);
    
    // Step 3: Send an update for the non-existent task with origin "success-factor"
    const updateData = {
      title: 'Upserted Task Test',
      description: 'This task was automatically created via upsert',
      origin: 'success-factor',
      stage: 'identification',
      completed: false,
      order: 1,
    };
    
    console.log(`Updating non-existent task with origin "success-factor":`);
    console.log(JSON.stringify(updateData, null, 2));
    
    const updateResult = await apiRequest(
      'PUT', 
      `/api/projects/${projectId}/tasks/${taskId}`,
      updateData
    );
    
    // Step 4: Verify the task was created by retrieving it
    const getResult = await apiRequest('GET', `/api/projects/${projectId}/tasks/${taskId}`);
    
    // Step 5: Collect all project tasks to see if our task is included
    const allTasksResult = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    
    const testResults = {
      update: {
        status: updateResult.status,
        success: updateResult.status === 200,
        data: updateResult.data
      },
      retrieve: {
        status: getResult.status,
        success: getResult.status === 200,
        data: getResult.data
      },
      allTasks: {
        total: allTasksResult.data?.length || 0,
        containsUpsertedTask: allTasksResult.data?.some(task => task.id === taskId) || false
      },
      overall: false
    };
    
    testResults.overall = testResults.update.success && testResults.retrieve.success && testResults.allTasks.containsUpsertedTask;
    
    console.log('\n=== TEST RESULTS ===');
    console.log(JSON.stringify(testResults, null, 2));
    console.log(`\nOverall test ${testResults.overall ? '✅ PASSED' : '❌ FAILED'}`);
    
    return testResults;
  } catch (error) {
    console.error('Error during test:', error);
    return { overall: false, error: error.message };
  }
}

// Run the test
runUpsertTest().then(results => {
  console.log(JSON.stringify(results));
  process.exit(results.overall ? 0 : 1);
});