/**
 * API Test for Success Factor Task Upsert
 * 
 * This script tests the full API flow for the success-factor task upsert feature.
 * It sends a request to update a non-existent task with origin 'success-factor'
 * and verifies that it gets created automatically.
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

async function runTest() {
  console.log('🧪 Testing Success-Factor Task Upsert via API');
  
  // Create random test UUID
  const testTaskId = uuidv4();
  console.log(`Generated test task ID: ${testTaskId}`);
  
  // Find a project to test with
  try {
    // Get project list
    const projectsRes = await axios.get('http://localhost:5000/api/projects', {
      headers: {
        Cookie: 'connect.sid=s%3AnOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs.QGzCCaExBR4SQS4nh3cLbqbcJt51hGC50f9u72i3N6w'
      }
    });
    
    if (!projectsRes.data || !projectsRes.data.length) {
      console.error('❌ No projects found for testing');
      return;
    }
    
    const projectId = projectsRes.data[0].id;
    console.log(`Using project ID: ${projectId}`);
    
    // Try to update a non-existent task with success-factor origin
    console.log('Sending update for non-existent task with success-factor origin...');
    
    const updateData = {
      text: 'API Test Success Factor',
      projectId: projectId,
      origin: 'success-factor',
      stage: 'identification',
      completed: false
    };
    
    try {
      const updateRes = await axios.patch(
        `http://localhost:5000/api/projects/${projectId}/tasks/${testTaskId}`,
        updateData,
        {
          headers: {
            'Content-Type': 'application/json',
            Cookie: 'connect.sid=s%3AnOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs.QGzCCaExBR4SQS4nh3cLbqbcJt51hGC50f9u72i3N6w'
          }
        }
      );
      
      console.log(`✅ Update Response Status: ${updateRes.status}`);
      console.log('Update response data:', updateRes.data);
      
      // Now try to get the task to verify it was created
      console.log('\nVerifying task was created...');
      const getRes = await axios.get(
        `http://localhost:5000/api/projects/${projectId}/tasks/${testTaskId}`,
        {
          headers: {
            Cookie: 'connect.sid=s%3AnOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs.QGzCCaExBR4SQS4nh3cLbqbcJt51hGC50f9u72i3N6w'
          }
        }
      );
      
      console.log(`✅ Get Task Response Status: ${getRes.status}`);
      console.log('Retrieved task data:', getRes.data);
      
      console.log('\n🎉 SUCCESS FACTOR TASK UPSERT API TEST PASSED!');
    } catch (error) {
      console.error('❌ Error updating or retrieving task:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  } catch (error) {
    console.error('❌ Error getting projects:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

runTest();