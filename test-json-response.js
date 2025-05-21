/**
 * Test script to verify that the PUT /api/projects/:projectId/tasks/:taskId endpoint
 * always returns proper JSON responses even in error cases
 */

import fetch from 'node-fetch';

async function testJsonResponse() {
  console.log('=== Testing JSON Responses for Task Updates ===');
  
  // Use the same domain as the app
  const baseUrl = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
  
  // Get a valid project ID
  console.log('\n1. Getting a valid project ID...');
  const projectsResponse = await fetch(`${baseUrl}/api/projects`);
  const projects = await projectsResponse.json();
  
  if (!projects.length) {
    console.error('No projects found for testing');
    return;
  }
  
  const projectId = projects[0].id;
  console.log(`Using project ID: ${projectId}`);
  
  // Test Case 1: Non-existent task ID (should return 404 JSON)
  console.log('\n2. TEST CASE 1: Non-existent task ID (should return 404 JSON)');
  const nonExistentId = 'non-existent-task-id';
  
  try {
    const response = await fetch(
      `${baseUrl}/api/projects/${projectId}/tasks/${nonExistentId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      console.log('Raw response:', text);
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
  
  // Test Case 2: Malformed task ID (should return JSON error)
  console.log('\n3. TEST CASE 2: Malformed task ID (should return JSON error)');
  const malformedId = 'malformed-id-$$$$';
  
  try {
    const response = await fetch(
      `${baseUrl}/api/projects/${projectId}/tasks/${malformedId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      console.log('Raw response:', text);
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
  
  console.log('\n=== Testing Complete ===');
}

testJsonResponse().catch(error => {
  console.error('Test script failed:', error);
});