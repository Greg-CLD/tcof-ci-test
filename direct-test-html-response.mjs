/**
 * Direct Test for HTML Response in PUT Endpoint
 * 
 * This script deliberately tests the scenario where the endpoint might return HTML
 * instead of JSON by creating a test case that triggers the error path.
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Configuration 
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const NON_EXISTENT_TASK_ID = '00000000-0000-0000-0000-000000000000-success-factor';

// Helper to extract session cookie from browser
function getCookieFromFile() {
  try {
    return fs.readFileSync('current-session.txt', 'utf8').trim();
  } catch (e) {
    console.error('Failed to read session cookie:', e);
    return '';
  }
}

async function testHtmlResponse() {
  console.log('🧪 Testing HTML response for non-existent task...');
  
  // Prepare the request
  const cookie = getCookieFromFile();
  const url = `http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${NON_EXISTENT_TASK_ID}`;
  
  console.log(`📝 Request details:
- URL: ${url}
- Method: PUT
- Body: {"completed":true}
- Cookie: ${cookie ? cookie.substring(0, 20) + '...' : 'NONE'}`);
  
  try {
    // First make the failing PUT request
    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ completed: true })
    });
    
    console.log(`\n📤 PUT Response:
- Status: ${putResponse.status}
- Content-Type: ${putResponse.headers.get('content-type')}
`);
    
    // Get the raw text to check if it's HTML or JSON
    const rawResponseText = await putResponse.text();
    console.log('📄 Raw response body:');
    console.log(rawResponseText);
    
    // Try to parse as JSON to confirm if it's valid
    try {
      JSON.parse(rawResponseText);
      console.log('\n✅ Response is valid JSON');
    } catch (e) {
      console.log('\n❌ Response is NOT valid JSON');
      
      // Check if it's HTML
      if (rawResponseText.includes('<!DOCTYPE html>') || 
          rawResponseText.includes('<html>') ||
          rawResponseText.includes('<body>')) {
        console.log('❌ Response appears to be HTML instead of JSON');
      }
    }
    
    // Now fetch the tasks to see if our update persisted
    console.log('\n🔍 Checking GET /api/projects/:projectId/tasks to verify task state...');
    const getUrl = `http://localhost:5000/api/projects/${PROJECT_ID}/tasks`;
    
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    });
    
    const tasks = await getResponse.json();
    console.log(`\n📥 GET Response:
- Status: ${getResponse.status}
- Content-Type: ${getResponse.headers.get('content-type')}
- Task count: ${tasks.length}
`);
    
    // Check for our task
    const updatedTask = tasks.find(t => t.id === NON_EXISTENT_TASK_ID);
    if (updatedTask) {
      console.log('✅ Task was found with updated state:', updatedTask);
    } else {
      console.log('❌ Task was NOT found in the project tasks');
      console.log('📝 First few tasks in the response:');
      console.log(JSON.stringify(tasks.slice(0, 2), null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testHtmlResponse();
