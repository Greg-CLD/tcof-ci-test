/**
 * Direct Test for Success Factor Task Upsert via PUT Request
 * 
 * This script tests the success-factor task upsert feature using a hardcoded session cookie
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Hardcoded cookie from observed logs
const sessionCookie = 'connect.sid=s%3AnOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs.QGzCCaExBR4SQS4nh3cLbqbcJt51hGC50f9u72i3N6w';

async function runDirectTest() {
  console.log('\n=== SUCCESS FACTOR TASK UPSERT TEST ===');
  
  try {
    // Step 1: Get project ID to use for test
    console.log('\nFetching projects...');
    const projectsRes = await axios.get('http://localhost:5000/api/projects', {
      headers: {
        Cookie: sessionCookie
      }
    });
    
    if (!projectsRes.data || !projectsRes.data.length) {
      console.error('No projects found!');
      return;
    }
    
    const projectId = projectsRes.data[0].id;
    console.log(`Using project ID: ${projectId}`);
    
    // Step 2: Generate a UUID for a task that doesn't exist
    const testTaskId = uuidv4();
    console.log(`\nGenerated test task ID: ${testTaskId}`);
    
    // Step 3: Send a PUT request to update the non-existent task
    console.log('\nSending PUT request to update non-existent success-factor task...');
    const taskData = {
      origin: 'success-factor',
      text: 'Test Success Factor via PUT',
      stage: 'identification',
      completed: true,
      projectId
    };
    
    console.log('Task data:', JSON.stringify(taskData, null, 2));
    
    // Make the PUT request
    const putResponse = await axios.put(
      `http://localhost:5000/api/projects/${projectId}/tasks/${testTaskId}`,
      taskData,
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie
        }
      }
    );
    
    console.log(`\nPUT Response: ${putResponse.status}`);
    console.log('Response data:', JSON.stringify(putResponse.data, null, 2));
    
    // Step 4: Verify the task was created by fetching it
    console.log('\nVerifying task was created by fetching it...');
    const getResponse = await axios.get(
      `http://localhost:5000/api/projects/${projectId}/tasks`,
      {
        headers: {
          Cookie: sessionCookie
        }
      }
    );
    
    const createdTask = getResponse.data.find(task => task.id === testTaskId);
    
    if (createdTask) {
      console.log('\n✅ SUCCESS! Task was successfully created via PUT request.');
      console.log('Created task:', JSON.stringify(createdTask, null, 2));
    } else {
      console.log('\n❌ FAILURE! Task was not found after PUT request.');
      console.log('Available tasks:', getResponse.data.map(t => t.id).join(', '));
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

runDirectTest();