/**
 * Direct test for missing taskId with isAuthenticated middleware bypassed
 */
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:5000';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

async function testMissingTaskId() {
  console.log('🧪 Testing PUT with missing taskId parameter (direct auth bypass)...');
  
  // URL with trailing slash but no taskId
  const url = `${BASE_URL}/api/projects/${PROJECT_ID}/tasks/`;
  console.log(`Making PUT request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Override': 'true' // This bypasses authentication for testing
      },
      body: JSON.stringify({
        completed: true
      })
    });
    
    console.log('\nResponse details:');
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    // Get response body
    const body = await response.text();
    console.log('\nResponse body:');
    
    try {
      // Try to parse as JSON to confirm it's valid
      const jsonBody = JSON.parse(body);
      console.log(JSON.stringify(jsonBody, null, 2));
      
      // Test results
      console.log('\n📋 Test results:');
      console.log(`✅ Returns JSON: ${response.headers.get('content-type')?.includes('application/json') ? 'Yes' : 'No'}`);
      console.log(`✅ Status code is 400: ${response.status === 400 ? 'Yes' : 'No'}`);
      console.log(`✅ Contains error message: ${jsonBody.error === 'INVALID_PARAMETERS' ? 'Yes' : 'No'}`);
      
      if (response.headers.get('content-type')?.includes('application/json') && 
          response.status === 400 && 
          jsonBody.error === 'INVALID_PARAMETERS') {
        console.log('\n🎉 SUCCESS! The endpoint correctly returns JSON with 400 status for missing taskId');
      } else {
        console.log('\n❌ TEST FAILED: The response does not meet the requirements');
      }
    } catch (e) {
      console.log(`Not valid JSON: ${body.substring(0, 200)}...`);
      console.log('\n❌ TEST FAILED: Response is not valid JSON');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

// Run the test
testMissingTaskId();
