/**
 * Smoke Test Script for Success Factor Task Persistence
 * 
 * This script tests that a Success Factor task can be updated
 * by its sourceId and that the update is properly persisted.
 */
import pkg from 'pg';
const { Client } = pkg;
import axios from 'axios';

const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const SF_TASK_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
const API_BASE_URL = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

async function runTest() {
  console.log(`Running smoke test for Success Factor task persistence...`);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Step 1: Check the current state of the task in the database
    console.log(`\nSTEP 1: Checking current state of task ${SF_TASK_ID}...`);
    const initialResult = await client.query(`
      SELECT * FROM project_tasks
      WHERE project_id = $1 AND source_id = $2
    `, [PROJECT_ID, SF_TASK_ID]);
    
    if (initialResult.rows.length === 0) {
      console.error('ERROR: Task not found in database. Test cannot continue.');
      return;
    }
    
    const initialTask = initialResult.rows[0];
    console.log(`Task found with ID ${initialTask.id}`);
    console.log(`Current completion state: ${initialTask.completed}`);
    
    // Toggle to the opposite state
    const newCompletedState = !initialTask.completed;
    
    // Step 2: Make a PUT request to update the task via its sourceId
    console.log(`\nSTEP 2: Updating task via API using sourceId ${SF_TASK_ID}...`);
    console.log(`Setting completed = ${newCompletedState}`);
    
    try {
      const response = await axios({
        method: 'put',
        url: `${API_BASE_URL}/api/projects/${PROJECT_ID}/tasks/${SF_TASK_ID}`,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-override': 'true'
        },
        data: {
          completed: newCompletedState
        }
      });
      
      console.log('API Response:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Step 3: Verify the update was persisted in the database
      console.log(`\nSTEP 3: Verifying database record was updated...`);
      const verifyResult = await client.query(`
        SELECT * FROM project_tasks
        WHERE project_id = $1 AND source_id = $2
      `, [PROJECT_ID, SF_TASK_ID]);
      
      if (verifyResult.rows.length === 0) {
        console.error('ERROR: Task not found after update');
        return;
      }
      
      const updatedTask = verifyResult.rows[0];
      console.log(`Task database record:`);
      console.log(JSON.stringify(updatedTask, null, 2));
      
      // Step 4: Make a GET request to verify the API returns the updated state
      console.log(`\nSTEP 4: Verifying task state via API GET request...`);
      const getResponse = await axios({
        method: 'get',
        url: `${API_BASE_URL}/api/projects/${PROJECT_ID}/tasks`,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-override': 'true'
        }
      });
      
      const taskFromAPI = getResponse.data.find(t => t.sourceId === SF_TASK_ID);
      if (!taskFromAPI) {
        console.error('ERROR: Task not found in API response');
        return;
      }
      
      console.log('Task from API:');
      console.log(JSON.stringify(taskFromAPI, null, 2));
      
      // Step 5: Final verification
      console.log('\nSMOKE TEST RESULTS:');
      console.log(`✓ PUT request successful: ${response.status === 200}`);
      console.log(`✓ Database record updated: ${updatedTask.completed === newCompletedState}`);
      console.log(`✓ API response shows updated state: ${taskFromAPI.completed === newCompletedState}`);
      console.log(`✓ sourceId preserved: ${updatedTask.source_id === SF_TASK_ID}`);
      
      if (updatedTask.completed === newCompletedState && taskFromAPI.completed === newCompletedState) {
        console.log('\n✅ SMOKE TEST PASSED: Success Factor task persistence is working correctly!');
      } else {
        console.log('\n❌ SMOKE TEST FAILED: Updates are not being properly persisted');
      }
      
    } catch (apiError) {
      console.error('API Error:', apiError.message);
      if (apiError.response) {
        console.error('Response:', apiError.response.data);
      }
    }
    
  } catch (error) {
    console.error('Error during smoke test:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

runTest().catch(err => console.error('Test failed:', err));