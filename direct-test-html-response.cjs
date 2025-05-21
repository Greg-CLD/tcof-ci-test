/**
 * Direct Test for HTML Response in PUT Endpoint
 * 
 * This script deliberately tests the scenario where the endpoint might return HTML
 * instead of JSON by creating a test case that triggers the error path.
 */

const fetch = require('node-fetch');
const fs = require('fs');

function getCookieFromFile() {
  try {
    return fs.readFileSync('./cookies.txt', 'utf8').trim();
  } catch (error) {
    console.error('Error reading cookie file:', error);
    return '';
  }
}

async function testHtmlResponse() {
  const cookie = getCookieFromFile();
  if (!cookie) {
    console.error('No cookie available. Please run extract-cookie.js first.');
    return;
  }
  
  console.log('Testing PUT request to /api/projects/test-id/tasks/ (no taskId)...');
  
  try {
    // Make request to the endpoint that previously returned HTML
    const response = await fetch('http://localhost:5000/api/projects/test-id/tasks/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ completed: true })
    });
    
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    console.log(`Status code: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Response body (truncated): ${text.substring(0, 100)}...`);
    
    // Determine if the response is JSON or HTML
    const isJson = contentType.toLowerCase().includes('application/json');
    const isHtml = text.includes('<!DOCTYPE html>') || text.includes('<html>');
    
    console.log('\nResponse analysis:');
    console.log(`- JSON response: ${isJson ? 'YES' : 'NO'}`);
    console.log(`- HTML response: ${isHtml ? 'YES' : 'NO'}`);
    
    if (isJson && !isHtml) {
      console.log('\n✅ SUCCESS: Endpoint is returning JSON as expected!');
    } else {
      console.log('\n❌ FAILURE: Endpoint is still returning HTML instead of JSON!');
    }
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

testHtmlResponse();