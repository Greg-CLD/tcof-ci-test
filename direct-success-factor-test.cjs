/**
 * Direct Test for Success Factor Task UUID Lookup
 * 
 * This script verifies our enhanced task lookup can properly handle both:
 * 1. Full UUID+suffix ID format for Success Factor tasks
 * 2. Clean UUID (first 5 segments) format for Success Factor tasks
 */

require('dotenv').config();
// Use native fetch instead of node-fetch
const fs = require('fs');

// Test configuration
const API_BASE = 'http://localhost:3000/api';
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Get active session cookie for authentication
function getCookieFromFile() {
  try {
    if (fs.existsSync('./cookies.txt')) {
      return fs.readFileSync('./cookies.txt', 'utf8').trim();
    }
    if (fs.existsSync('./current-session.txt')) {
      return fs.readFileSync('./current-session.txt', 'utf8').trim();
    }
    console.error('No cookie file found. Please run extract-session-cookie.js first.');
    return null;
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return null;
  }
}

// Helper to separate the clean UUID from a compound ID
function getCleanUuid(compoundId) {
  // Extract first 5 segments (standard UUID format)
  return compoundId.split('-').slice(0, 5).join('-');
}

// Run the test
async function runTest() {
  console.log('\n=== Success Factor Task UUID Lookup Test ===\n');
  
  const sessionCookie = getCookieFromFile();
  if (!sessionCookie) {
    console.error('Cannot proceed without session cookie');
    process.exit(1);
  }
  
  try {
    // Step 1: Get a Success Factor task from the project
    console.log('Fetching tasks for project...\n');
    
    const tasksResponse = await fetch(
      `${API_BASE}/projects/${PROJECT_ID}/tasks`,
      {
        headers: {
          'Cookie': sessionCookie,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status} ${tasksResponse.statusText}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.length} tasks in project\n`);
    
    // Find a Success Factor task to test with
    const factorTask = tasks.find(task => 
      (task.origin === 'factor' || task.origin === 'success-factor') && 
      task.id.includes('-') && 
      task.id.split('-').length > 5
    );
    
    if (!factorTask) {
      console.log('No suitable factor task found. Creating a test case...');
      // Implementation for creating a test task would go here
      throw new Error('No suitable factor task found to test with');
    }
    
    console.log('Found Success Factor task for testing:');
    console.log(`ID: ${factorTask.id}`);
    console.log(`Text: ${factorTask.text}`);
    console.log(`Origin: ${factorTask.origin}`);
    console.log(`Completed: ${factorTask.completed}\n`);
    
    // Extract the clean UUID part (first 5 segments)
    const cleanUuid = getCleanUuid(factorTask.id);
    console.log(`Clean UUID: ${cleanUuid}`);
    
    // Step 2: Test updating the task using full compound ID
    console.log('\nTest 1: Updating task using full compound ID...');
    const fullIdUpdate = {
      completed: !factorTask.completed  // Toggle completion state
    };
    
    const fullIdUpdateResponse = await fetch(
      `${API_BASE}/projects/${PROJECT_ID}/tasks/${factorTask.id}`,
      {
        method: 'PUT',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fullIdUpdate)
      }
    );
    
    // Check for correct Content-Type header
    const fullIdContentType = fullIdUpdateResponse.headers.get('content-type');
    console.log(`Response Content-Type: ${fullIdContentType}`);
    
    if (!fullIdUpdateResponse.ok) {
      throw new Error(`Full ID update failed: ${fullIdUpdateResponse.status} ${fullIdUpdateResponse.statusText}`);
    }
    
    const fullIdResult = await fullIdUpdateResponse.json();
    console.log('Full ID update successful:');
    console.log(`ID: ${fullIdResult.id}`);
    console.log(`New completed state: ${fullIdResult.completed}\n`);
    
    // Step 3: Test updating the task using only the clean UUID part
    console.log('Test 2: Updating task using only clean UUID part...');
    const cleanUuidUpdate = {
      completed: !fullIdResult.completed  // Toggle back to original state
    };
    
    const cleanUuidUpdateResponse = await fetch(
      `${API_BASE}/projects/${PROJECT_ID}/tasks/${cleanUuid}`,
      {
        method: 'PUT',
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(cleanUuidUpdate)
      }
    );
    
    // Check for correct Content-Type header
    const cleanUuidContentType = cleanUuidUpdateResponse.headers.get('content-type');
    console.log(`Response Content-Type: ${cleanUuidContentType}`);
    
    if (!cleanUuidUpdateResponse.ok) {
      throw new Error(`Clean UUID update failed: ${cleanUuidUpdateResponse.status} ${cleanUuidUpdateResponse.statusText}`);
    }
    
    const cleanUuidResult = await cleanUuidUpdateResponse.json();
    console.log('Clean UUID update successful:');
    console.log(`ID: ${cleanUuidResult.id}`);
    console.log(`New completed state: ${cleanUuidResult.completed}\n`);
    
    // Verify proper content type headers were returned
    console.log('Content Type Headers Test:');
    console.log(`Full ID update response: ${fullIdContentType ? 'PASS' : 'FAIL'}`);
    console.log(`Clean UUID update response: ${cleanUuidContentType ? 'PASS' : 'FAIL'}`);
    
    const hasCorrectFullIdHeader = fullIdContentType && fullIdContentType.includes('application/json');
    const hasCorrectCleanUuidHeader = cleanUuidContentType && cleanUuidContentType.includes('application/json');
    
    console.log(`\nFull ID header is JSON: ${hasCorrectFullIdHeader ? 'YES' : 'NO'}`);
    console.log(`Clean UUID header is JSON: ${hasCorrectCleanUuidHeader ? 'YES' : 'NO'}`);
    
    // Step 4: Verify the task lookup method used
    console.log('\nVerifying the correct task was modified in both cases:');
    console.log(`Full ID task: ${fullIdResult.id}`);
    console.log(`Clean UUID task: ${cleanUuidResult.id}`);
    console.log(`IDs match: ${fullIdResult.id === cleanUuidResult.id ? 'YES' : 'NO'}`);
    
    console.log('\n=== Test Completed ===\n');
    console.log(`Overall result: ${
      hasCorrectFullIdHeader && 
      hasCorrectCleanUuidHeader && 
      fullIdResult.id === cleanUuidResult.id ? 
      'SUCCESS' : 'FAILURE'
    }`);
    
  } catch (error) {
    console.error('\nTest failed:', error);
  }
}

// Run the test
runTest();