/**
 * Direct API Login Test
 * 
 * This script tests login functionality using direct API calls.
 * It sends proper JSON format credentials to the login endpoint.
 */

const https = require('https');

// Test credentials
const TEST_EMAIL = 'greg@confluity.co.uk';
const TEST_PASSWORD = 'password123';

// Get the Replit URL from environment variables
function getReplitUrl() {
  const replitDomain = process.env.REPLIT_DOMAINS || '';
  return 'https://' + replitDomain.split(',')[0];
}

// Make a simple API request
function apiRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const baseUrl = getReplitUrl();
    const url = baseUrl + endpoint;
    
    // Create request options
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    console.log(`Making ${method} request to ${url}`);
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers:`, res.headers);
        
        try {
          const parsedData = JSON.parse(responseData);
          console.log(`Response body:`, parsedData);
          resolve({
            statusCode: res.statusCode,
            body: parsedData
          });
        } catch (e) {
          console.log(`Response body (not JSON):`, responseData);
          resolve({
            statusCode: res.statusCode,
            body: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Request error:`, error);
      reject(error);
    });
    
    // Send request data if provided
    if (data) {
      const jsonData = JSON.stringify(data);
      console.log(`Request data:`, data);
      req.write(jsonData);
    }
    
    req.end();
  });
}

// Test login with our credentials
async function testLogin() {
  console.log('='.repeat(50));
  console.log('TESTING LOGIN FUNCTIONALITY');
  console.log('='.repeat(50));
  console.log(`Username: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD}`);
  
  try {
    // Send login request
    const loginResponse = await apiRequest('POST', '/api/login', {
      username: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    // Evaluate response
    if (loginResponse.statusCode === 200) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log(`User ID: ${loginResponse.body.id}`);
      console.log(`Username: ${loginResponse.body.username}`);
      console.log('\nPassword reset and authentication are working correctly.');
      return true;
    } else {
      console.error('\n❌ LOGIN FAILED');
      console.error(`Status code: ${loginResponse.statusCode}`);
      console.error(`Error message: ${loginResponse.body.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    return false;
  }
}

// Run the test
testLogin().then(success => {
  process.exit(success ? 0 : 1);
});