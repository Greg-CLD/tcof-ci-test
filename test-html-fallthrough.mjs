/**
 * Targeted Test for HTML Fallthrough on Task Update Endpoint
 * 
 * This script specifically tests edge cases where the PUT endpoint might
 * still be returning HTML instead of JSON for certain error paths.
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const SESSION_COOKIE = 'tcof.sid=nOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const INVALID_TASK_ID_TESTS = [
  { name: 'missing-task-id', id: '' },
  { name: 'invalid-uuid-format', id: 'not-a-valid-uuid-at-all' },
  { name: 'non-existent-task-id', id: '00000000-0000-0000-0000-000000000000' },
  { name: 'malformed-compound-id', id: 'invalid-format@#$%' }
];

console.log('🧪 TASK PUT ENDPOINT TEST - TARGETING HTML FALLTHROUGH');
console.log('Testing with active session cookie:', SESSION_COOKIE.substring(0, 20) + '...');

async function testPutRequest(testCase) {
  console.log(`\n📝 TEST CASE: ${testCase.name}`);
  
  // Construct the URL - handle empty task ID case
  const url = testCase.id 
    ? `http://localhost:5000/api/projects/${PROJECT_ID}/tasks/${testCase.id}`
    : `http://localhost:5000/api/projects/${PROJECT_ID}/tasks/`;
  
  console.log(`URL: ${url}`);
  console.log('Method: PUT');
  console.log('Body:', JSON.stringify({ completed: true }));
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE
      },
      body: JSON.stringify({ completed: true }),
      // Include full redirect history for debugging
      redirect: 'manual'
    });
    
    console.log('\n⚠️ Response details:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    // Log all response headers
    console.log('\n📋 Response headers:');
    response.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });
    
    // Get the raw response body
    const rawBody = await response.text();
    
    // Determine if it's HTML or JSON
    const isHtml = rawBody.includes('<!DOCTYPE html>') || 
                   rawBody.includes('<html') || 
                   rawBody.includes('<body');
    
    const contentType = response.headers.get('content-type') || 'none';
    
    if (isHtml) {
      console.log('\n❌ RECEIVED HTML RESPONSE (likely fallthrough to SPA)');
      console.log('First 300 characters of HTML:');
      console.log(rawBody.substring(0, 300) + '...');
      
      // Save the full response for debugging
      fs.writeFileSync(`html-fallthrough-${testCase.name}.html`, rawBody);
      console.log(`Full HTML saved to html-fallthrough-${testCase.name}.html`);
    } else {
      try {
        const jsonData = JSON.parse(rawBody);
        console.log('\n✅ RECEIVED JSON RESPONSE:');
        console.log(JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('\n⚠️ RECEIVED NON-HTML, NON-JSON RESPONSE:');
        console.log(rawBody);
      }
    }
    
    // Summary for this test case
    console.log('\n📊 Test Results:');
    console.log('- Content-Type:', contentType);
    console.log('- Is HTML:', isHtml);
    console.log('- Status Code:', response.status);
    console.log('- Should status be 200?:', response.status === 200 ? 'NO - Error responses should not return 200' : 'Yes - for success only');
    
    return {
      status: response.status,
      contentType,
      isHtml,
      body: rawBody.substring(0, 500) // Only store beginning for summary
    };
  } catch (error) {
    console.error(`❌ Error during test "${testCase.name}":`, error);
    return { error: error.message };
  }
}

// Also fetch tasks to check state after tests
async function getTasksAfterTest() {
  console.log('\n🔍 Fetching tasks after tests:');
  
  try {
    const tasksUrl = `http://localhost:5000/api/projects/${PROJECT_ID}/tasks`;
    console.log('GET:', tasksUrl);
    
    const response = await fetch(tasksUrl, {
      headers: {
        'Cookie': SESSION_COOKIE
      }
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const data = await response.json();
    console.log('Task count:', data.length);
    console.log('First task:', JSON.stringify(data[0], null, 2));
    
    return data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { error: error.message };
  }
}

// Run all tests sequentially
async function runAllTests() {
  console.log('\n====== STARTING ALL TEST CASES ======\n');
  
  const results = [];
  for (const testCase of INVALID_TASK_ID_TESTS) {
    const result = await testPutRequest(testCase);
    results.push({ ...testCase, result });
  }
  
  // Get tasks after all tests
  const tasks = await getTasksAfterTest();
  
  // Print summary
  console.log('\n====== TEST SUMMARY ======');
  for (const { name, result } of results) {
    const statusInfo = result.status === 200 && result.isHtml 
      ? '❌ HTML with 200 (Bad)'
      : result.isHtml 
        ? '⚠️ HTML response (Bad)' 
        : result.error 
          ? '⚠️ Error: ' + result.error
          : '✅ JSON response (Good)';
    
    console.log(`${name}: ${statusInfo} - HTTP ${result.status} - ${result.contentType}`);
  }
  
  console.log('\n====== TEST COMPLETE ======');
}

// Run everything
runAllTests();
