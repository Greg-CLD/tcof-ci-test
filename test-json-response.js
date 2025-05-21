/**
 * Test JSON Responses for Task Updates
 * 
 * This script tests whether our task update endpoint properly returns JSON
 * responses in all error cases instead of falling through to the SPA fallback.
 */

import fetch from 'node-fetch';

async function testJsonResponse() {
  console.log('=== Testing JSON Responses for Task Updates ===');
  
  // Use the same domain as the app
  const baseUrl = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
  const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  
  // Test Case 1: Non-existent task ID (should return 404 JSON)
  console.log('\n1. TEST CASE 1: Non-existent task ID (should return 404 JSON)');
  const nonExistentId = 'non-existent-task-id';
  
  try {
    const response = await fetch(
      `${baseUrl}/api/projects/${projectId}/tasks/${nonExistentId}`,
      {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Override': 'true'
        },
        body: JSON.stringify({ completed: true })
      }
    );
    
    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', response.headers.get('content-type'));
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    console.log(`Is JSON response: ${isJson ? 'Yes' : 'No'}`);
    
    try {
      const data = await response.json();
      console.log('Response body:', JSON.stringify(data, null, 2));
      console.log(`✅ SUCCESS: Endpoint returned proper JSON response with status ${response.status}`);
    } catch (e) {
      console.log('❌ FAILURE: Response was not valid JSON');
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
  
  // Test Case 2: Missing project ID parameter (should return JSON error)
  console.log('\n2. TEST CASE 2: Missing project ID parameter (should return JSON error)');
  
  try {
    const response = await fetch(
      `${baseUrl}/api/projects/null/tasks/some-task-id`,
      {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Override': 'true'
        },
        body: JSON.stringify({ completed: false })
      }
    );
    
    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', response.headers.get('content-type'));
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    console.log(`Is JSON response: ${isJson ? 'Yes' : 'No'}`);
    
    try {
      const data = await response.json();
      console.log('Response body:', JSON.stringify(data, null, 2));
      console.log(`✅ SUCCESS: Endpoint returned proper JSON response with status ${response.status}`);
    } catch (e) {
      console.log('❌ FAILURE: Response was not valid JSON');
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
  
  // Test Case 3: Invalid UUID format (should return 404 JSON)
  console.log('\n3. TEST CASE 3: Invalid UUID format (should return JSON error)');
  
  try {
    const response = await fetch(
      `${baseUrl}/api/projects/${projectId}/tasks/invalid-uuid-format`,
      {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-Override': 'true'
        },
        body: JSON.stringify({ completed: true })
      }
    );
    
    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', response.headers.get('content-type'));
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    console.log(`Is JSON response: ${isJson ? 'Yes' : 'No'}`);
    
    try {
      const data = await response.json();
      console.log('Response body:', JSON.stringify(data, null, 2));
      console.log(`✅ SUCCESS: Endpoint returned proper JSON response with status ${response.status}`);
    } catch (e) {
      console.log('❌ FAILURE: Response was not valid JSON');
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

testJsonResponse().catch(console.error);