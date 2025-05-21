/**
 * Direct Test to Trigger HTML Response from PUT Task Endpoint
 * 
 * This script specifically tests a malformed task ID case that should
 * trigger a server error that might fallthrough to the SPA without proper JSON.
 */

import fetch from 'node-fetch';

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const MALFORMED_TASK_ID = 'not-a-uuid-format'; // Intentionally malformed ID
const SESSION_COOKIE = 'tcof.sid=nOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs';

async function triggerHtmlResponse() {
  console.log('🔍 TESTING MALFORMED TASK ID CASE');
  console.log('URL:', `http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${MALFORMED_TASK_ID}`);
  console.log('Method: PUT');
  console.log('Headers:', {
    'Content-Type': 'application/json',
    'Cookie': SESSION_COOKIE.substring(0, 25) + '...'
  });
  console.log('Body:', JSON.stringify({ completed: true }));
  
  try {
    // Make the PUT request that should fail with a specific error
    const putResponse = await fetch(`http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${MALFORMED_TASK_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ completed: true })
    });
    
    console.log('\n⚠️ PUT Response Details:');
    console.log('Status:', putResponse.status);
    console.log('Status Text:', putResponse.statusText);
    console.log('Content-Type:', putResponse.headers.get('content-type'));
    
    // Get the raw response text
    const rawResponse = await putResponse.text();
    
    console.log('\n📄 Raw Response Body:');
    console.log(rawResponse);
    
    // Try to parse as JSON
    let isJson = false;
    try {
      JSON.parse(rawResponse);
      isJson = true;
      console.log('\n✅ Response is valid JSON');
    } catch (e) {
      console.log('\n❌ Response is NOT valid JSON:', e.message);
      
      // Check if it's HTML
      if (rawResponse.includes('<!DOCTYPE html>') || 
          rawResponse.includes('<html') || 
          rawResponse.includes('<body')) {
        console.log('❌ Response appears to be HTML instead of JSON');
        
        // Print a small excerpt to confirm
        const htmlExcerpt = rawResponse.substring(0, 200) + '...';
        console.log('HTML excerpt:', htmlExcerpt);
      }
    }
    
    // Check tasks immediately after
    console.log('\n🔍 Checking tasks after failed update:');
    const tasksResponse = await fetch(`http://localhost:5000/api/projects/${PROJECT_ID}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      }
    });
    
    const tasksData = await tasksResponse.json();
    console.log('Tasks status:', tasksResponse.status);
    console.log('Tasks count:', tasksData.length);
    console.log('First task:', JSON.stringify(tasksData[0], null, 2));
    
    return {
      putStatus: putResponse.status,
      contentType: putResponse.headers.get('content-type'),
      isJson,
      rawResponse,
      taskCount: tasksData.length
    };
  } catch (error) {
    console.error('❌ Test error:', error);
    return { error: error.message };
  }
}

// Run the test
triggerHtmlResponse().then(result => {
  console.log('\n====== TEST COMPLETE ======');
});
