/**
 * Success Factor Task ID Mismatch Test
 * 
 * This script directly tests whether the task ID used in the PUT request exists
 * in the database by performing both an API request and a direct database query.
 */

const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const { Client } = require('pg');

// Function to check if a task exists in the database
async function checkTaskExistsInDb(client, taskId) {
  try {
    const query = 'SELECT id, source_id, text, completed FROM project_tasks WHERE id = $1';
    const result = await client.query(query, [taskId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Function to make API request to update a task
async function updateTaskViaApi(taskId, updateData) {
  const url = `http://localhost:5000/api/projects/${projectId}/tasks/${taskId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.SESSION_COOKIE || ''
      },
      body: JSON.stringify(updateData)
    });
    
    console.log(`API response status: ${response.status}`);
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.log(`Non-JSON response: ${await response.text()}`);
      return { success: false, status: response.status };
    }
    
    if (!response.ok) {
      return { success: false, status: response.status };
    }
    
    return { success: true, data: await response.json() };
  } catch (error) {
    console.error('API request error:', error);
    return { success: false, error: error.message };
  }
}

// Main test function
async function testTaskIdMismatch() {
  console.log('\n=== TASK ID MISMATCH TEST ===\n');
  
  // Connect to the database
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get all Success Factor tasks from the database
    const dbResult = await client.query(
      'SELECT id, source_id, text, completed FROM project_tasks WHERE project_id = $1 AND origin = $2',
      [projectId, 'factor']
    );
    
    console.log(`Found ${dbResult.rows.length} Success Factor tasks in database`);
    console.table(dbResult.rows);
    
    if (dbResult.rows.length === 0) {
      console.log('No Success Factor tasks found in database for testing');
      return;
    }
    
    // Select a task to test
    const testTask = dbResult.rows[0];
    console.log('\nSelected test task:', testTask);
    
    // Verify the task exists in the database
    const taskExists = await checkTaskExistsInDb(client, testTask.id);
    console.log(`Task exists in database: ${!!taskExists}`);
    
    if (!taskExists) {
      console.error(`ERROR: Task with ID ${testTask.id} not found in database!`);
      return;
    }
    
    // Test updating the task via API
    const updateData = {
      completed: !testTask.completed,
      status: !testTask.completed ? 'Done' : 'To Do',
      origin: 'factor',
      sourceId: testTask.source_id || ''
    };
    
    console.log(`\nAttempting to update task via API with ID: ${testTask.id}`);
    console.log('Update data:', updateData);
    
    const updateResult = await updateTaskViaApi(testTask.id, updateData);
    console.log('Update result:', updateResult);
    
    if (!updateResult.success && updateResult.status === 404) {
      console.error(`
      ⚠️ 404 NOT FOUND ERROR DETECTED ⚠️
      
      The task ID (${testTask.id}) exists in the database but
      the API endpoint returned 404 Not Found.
      
      Possible causes:
      1. Task ID format mismatch (casing, dashes, etc.)
      2. API route lookup issues with task ID
      3. Authentication issues
      `);
      
      // Try with a different ID format
      console.log('\nTrying with a different ID format...');
      
      // Convert UUID to lowercase
      const lowercaseId = testTask.id.toLowerCase();
      if (lowercaseId !== testTask.id) {
        console.log(`Testing with lowercase ID: ${lowercaseId}`);
        const lowerResult = await updateTaskViaApi(lowercaseId, updateData);
        console.log('Lowercase ID result:', lowerResult);
      }
      
      // Remove dashes
      const noDashesId = testTask.id.replace(/-/g, '');
      console.log(`Testing with no-dashes ID: ${noDashesId}`);
      const noDashesResult = await updateTaskViaApi(noDashesId, updateData);
      console.log('No-dashes ID result:', noDashesResult);
    }
    
    // Verify the update was successful
    const updatedTask = await checkTaskExistsInDb(client, testTask.id);
    console.log('\nTask after update attempt:', updatedTask);
    
    if (!updatedTask) {
      console.error('Task not found after update!');
      return;
    }
    
    if (updatedTask.completed === testTask.completed) {
      console.log('❌ Task completion state was NOT updated in the database');
    } else {
      console.log('✅ Task completion state was successfully updated in the database');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
    console.log('\n=== TEST COMPLETE ===');
  }
}

// Run the test
testTaskIdMismatch();