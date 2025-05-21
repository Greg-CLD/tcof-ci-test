/**
 * Verification script to check if our server route fixes are working correctly.
 * This script will:
 * 1. Extract the session cookie from cookies.txt
 * 2. Make requests to the API with different endpoint patterns
 * 3. Verify that proper JSON responses are returned in all cases
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Helper to get the cookie from file
function getCookie() {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (err) {
    console.error('Could not load cookie file:', err.message);
    return '';
  }
}

// Helper to check if response is JSON
async function checkJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');
  const text = await response.text();
  
  let body = null;
  try {
    if (isJson) {
      body = JSON.parse(text);
    }
  } catch (e) {
    // Response text is not valid JSON despite content type
  }
  
  return {
    status: response.status,
    isJson,
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    body,
    contentType
  };
}

async function verifyEndpoints() {
  console.log('⚙️ Checking API endpoint JSON response handling...');
  const cookie = getCookie();
  
  if (!cookie) {
    console.error('❌ No cookie found. Please run extract-cookie.js first.');
    return;
  }
  
  // Fixed test project ID
  const projectId = 'test-project-id';
  
  // Test scenarios to verify
  const scenarios = [
    {
      name: 'Missing taskId (trailing slash)',
      endpoint: `/api/projects/${projectId}/tasks/`,
      expectStatus: 400,
      expectJson: true
    },
    {
      name: 'Invalid taskId format',
      endpoint: `/api/projects/${projectId}/tasks/not-a-uuid`,
      expectStatus: 404, // or 400, depending on implementation
      expectJson: true
    },
    {
      name: 'Non-existent but valid UUID format',
      endpoint: `/api/projects/${projectId}/tasks/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`,
      expectStatus: 404,
      expectJson: true
    }
  ];
  
  // Test each scenario
  let passCount = 0;
  
  for (const scenario of scenarios) {
    console.log(`\n🔍 Testing: ${scenario.name}`);
    console.log(`📌 Endpoint: ${scenario.endpoint}`);
    
    try {
      const response = await fetch(`http://localhost:5000${scenario.endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify({ completed: true })
      });
      
      const result = await checkJsonResponse(response);
      
      console.log(`📊 Status: ${result.status} (Expected: ${scenario.expectStatus})`);
      console.log(`📄 Content-Type: ${result.contentType}`);
      console.log(`🔍 JSON Response: ${result.isJson ? 'YES' : 'NO'} (Expected: ${scenario.expectJson ? 'YES' : 'NO'})`);
      
      if (result.body) {
        console.log(`📋 Response Body:`, result.body);
      } else {
        console.log(`📋 Response Text: ${result.text}`);
      }
      
      // Validate expectations
      const statusMatch = result.status === scenario.expectStatus;
      const jsonMatch = result.isJson === scenario.expectJson;
      
      if (statusMatch && jsonMatch) {
        console.log(`✅ PASSED: Response matches expectations`);
        passCount++;
      } else {
        if (!statusMatch) {
          console.log(`❌ FAILED: Status code ${result.status} does not match expected ${scenario.expectStatus}`);
        }
        if (!jsonMatch) {
          console.log(`❌ FAILED: JSON response ${result.isJson ? 'received' : 'not received'} but expected ${scenario.expectJson ? 'YES' : 'NO'}`);
        }
      }
    } catch (error) {
      console.error(`❌ ERROR: ${error.message}`);
    }
  }
  
  // Final summary
  console.log(`\n📊 TEST SUMMARY: ${passCount}/${scenarios.length} scenarios passed`);
  
  if (passCount === scenarios.length) {
    console.log(`\n🎉 SUCCESS: All JSON response handling tests passed!`);
    console.log(`The PUT endpoint is correctly handling all test cases and returning proper JSON responses.`);
  } else {
    console.log(`\n⚠️ PARTIAL SUCCESS: ${passCount}/${scenarios.length} tests passed`);
    console.log(`Some scenarios are still not returning the expected JSON responses.`);
  }
}

// Run verification
verifyEndpoints();