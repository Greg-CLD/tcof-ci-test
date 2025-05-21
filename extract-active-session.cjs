/**
 * Extract Active Session Cookie from Workflow Logs
 */

const fs = require('fs');

// Read the workflow logs
const data = fs.readFileSync('./current-session.txt', 'utf8');
console.log('Current session data:', data);

// Create a login script that will work for direct tests
fs.writeFileSync('test-login.js', `
import fetch from 'node-fetch';

// Test authentication for API tests
async function login() {
  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'confluity'
      })
    });
    
    // Get the cookie from the response
    const cookies = response.headers.raw()['set-cookie'];
    if (cookies) {
      console.log('Received cookies:', cookies);
      // Extract the session cookie
      const sessionCookie = cookies.find(cookie => cookie.startsWith('tcof.sid='));
      if (sessionCookie) {
        console.log('Session cookie found:', sessionCookie);
        return sessionCookie;
      }
    }
    
    const responseText = await response.text();
    console.log('Response:', response.status, responseText);
    return null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Used for testing
login().then(cookie => {
  console.log('Login complete, cookie:', cookie);
});
`);

console.log('Created test login script');

// Create a test script for the HTML failure case
fs.writeFileSync('test-failure-case.js', `
import fetch from 'node-fetch';

// Test the failure case that returns HTML instead of JSON
async function testFailureCase() {
  try {
    // Hard-code a session cookie for the test
    const cookie = 'tcof.sid=nOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs';
    
    // Use an invalid task ID format that might trigger a 500
    const invalidTaskId = 'not-a-valid-uuid-format';
    const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
    
    console.log('=== TESTING FAILURE CASE ===');
    console.log('URL:', \`http://localhost:5000/api/projects/\${projectId}/tasks/\${invalidTaskId}\`);
    console.log('Method: PUT');
    console.log('Body:', JSON.stringify({ completed: true }));
    
    const response = await fetch(\`http://localhost:5000/api/projects/\${projectId}/tasks/\${invalidTaskId}\`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ completed: true })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    
    // Get the raw response to check if it's HTML
    const rawText = await response.text();
    console.log('Raw response (first 500 chars):');
    console.log(rawText.substring(0, 500));
    
    // Try to parse it as JSON to confirm if it's valid
    try {
      JSON.parse(rawText);
      console.log('Response is valid JSON');
    } catch (e) {
      console.log('Response is NOT valid JSON:', e.message);
      
      // Check if it's HTML
      if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html>')) {
        console.log('Response appears to be HTML not JSON');
      }
    }
    
    // Now check task state via GET
    console.log('\\nChecking tasks after failed update:');
    const tasksResponse = await fetch(\`http://localhost:5000/api/projects/\${projectId}/tasks\`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    const tasks = await tasksResponse.json();
    console.log('Tasks count:', tasks.length);
    console.log('First task:', tasks[0]);
    
    return { status: response.status, rawResponse: rawText };
  } catch (error) {
    console.error('Test error:', error);
    return { error: error.message };
  }
}

// Run the test
testFailureCase().then(result => {
  console.log('Test complete');
});
`);

console.log('Created test failure case script');

# Let's run the test failure case script
node test-failure-case.js
