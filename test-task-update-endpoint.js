/**
 * Simple smoke test for the fixed task update endpoint
 */

import fetch from 'node-fetch';

const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const NON_EXISTENT_TASK_ID = 'non-existent-task-id';
const BASE_URL = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

async function testTaskUpdateEndpoint() {
  console.log('Testing task update endpoint with non-existent task ID...');
  
  try {
    const response = await fetch(
      `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/${NON_EXISTENT_TASK_ID}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Override': 'true' // Special header to bypass authentication for testing
        },
        body: JSON.stringify({ completed: true })
      }
    );
    
    console.log(`Response status: ${response.status}`);
    
    // Get content type to verify it's JSON
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      // Parse the JSON response
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (response.status === 404) {
        console.log('✅ SUCCESS: Endpoint correctly returned 404 status code for non-existent task');
      } else {
        console.log(`❌ FAILURE: Expected 404 status code but got ${response.status}`);
      }
      
      console.log('✅ SUCCESS: Endpoint returned proper JSON response');
    } else {
      // If not JSON, get the raw text
      const text = await response.text();
      console.log('❌ FAILURE: Response was not JSON');
      console.log('Raw response:', text);
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testTaskUpdateEndpoint().catch(console.error);