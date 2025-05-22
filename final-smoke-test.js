/**
 * Final Smoke Test for Success Factor Task Persistence Fix
 *
 * This script performs a complete test of the PUT endpoint fix by:
 * 1. Running a PUT request to toggle a Success Factor task by sourceId
 * 2. Immediately running a GET request to verify the change was persisted
 */
import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const FACTOR_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

// Helper for HTTP requests
async function makeRequest(url, method, data = null) {
  const { default: fetch } = await import('node-fetch');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-auth-override': 'true'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return await response.json();
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');
  
  try {
    // Step 1: Get current task state from the database
    const initialTaskQuery = await client.query(`
      SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2
    `, [PROJECT_ID, FACTOR_ID]);
    
    if (initialTaskQuery.rows.length === 0) {
      console.error('Task not found in database!');
      return;
    }
    
    const initialTask = initialTaskQuery.rows[0];
    console.log('Initial task state from database:');
    console.log(`- ID: ${initialTask.id}`);
    console.log(`- Source ID: ${initialTask.source_id}`);
    console.log(`- Completed: ${initialTask.completed}`);
    
    // Target the opposite state
    const newCompletedState = !initialTask.completed;
    console.log(`\nUpdating task to completed = ${newCompletedState}...`);
    
    // Step 2: Make PUT request to toggle the task state
    const baseUrl = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
    const putUrl = `${baseUrl}/api/projects/${PROJECT_ID}/tasks/${FACTOR_ID}`;
    
    const updateResponse = await makeRequest(putUrl, 'PUT', { completed: newCompletedState });
    console.log('\nAPI PUT Response:');
    console.log(JSON.stringify(updateResponse, null, 2));
    
    // Step 3: Make GET request to verify the state was persisted
    console.log('\nVerifying through API GET request...');
    const getUrl = `${baseUrl}/api/projects/${PROJECT_ID}/tasks`;
    const getResponse = await makeRequest(getUrl, 'GET');
    
    // Find our task in the response
    const updatedTask = getResponse.find(task => task.sourceId === FACTOR_ID);
    
    if (!updatedTask) {
      console.error('Task not found in API response!');
      return;
    }
    
    console.log('\nAPI GET Response for task:');
    console.log(JSON.stringify(updatedTask, null, 2));
    
    // Step 4: Check the database directly
    console.log('\nVerifying directly in database...');
    const finalTaskQuery = await client.query(`
      SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2
    `, [PROJECT_ID, FACTOR_ID]);
    
    const finalTask = finalTaskQuery.rows[0];
    console.log('Final task state in database:');
    console.log(`- ID: ${finalTask.id}`);
    console.log(`- Source ID: ${finalTask.source_id}`);
    console.log(`- Completed: ${finalTask.completed}`);
    
    // Check if all verifications match
    console.log('\n----- TEST RESULTS -----');
    console.log(`Target state: completed = ${newCompletedState}`);
    console.log(`PUT response shows: completed = ${updateResponse.task.completed}`);
    console.log(`GET response shows: completed = ${updatedTask.completed}`);
    console.log(`Database shows: completed = ${finalTask.completed}`);
    
    const isPutSuccess = updateResponse.task.completed === newCompletedState;
    const isGetSuccess = updatedTask.completed === newCompletedState;
    const isDbSuccess = finalTask.completed === newCompletedState;
    
    if (isPutSuccess && isGetSuccess && isDbSuccess) {
      console.log('\n✅ SUCCESS! The fix is working correctly!');
    } else {
      console.log('\n❌ FAILURE! The fix is not working correctly.');
      
      if (!isPutSuccess) console.log('- PUT response shows wrong state');
      if (!isGetSuccess) console.log('- GET response shows wrong state');
      if (!isDbSuccess) console.log('- Database shows wrong state');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

main().catch(err => console.error('Test failed:', err));