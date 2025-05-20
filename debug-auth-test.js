/**
 * Simple script to debug the authentication process
 * This directly tests the auth endpoint to understand what's happening
 */
import fetch from 'node-fetch';

// Test credentials
const TEST_USER = "greg@confluity.co.uk";
const TEST_PASS = "password";

// Connection info
const BASE_URL = 'http://0.0.0.0:5000';

async function testAuth() {
  console.log(`Testing auth for user: ${TEST_USER}`);

  try {
    // First try a standard login
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASS
      })
    });

    // Extract and store the cookie
    const setCookie = loginResponse.headers.get('set-cookie');
    console.log(`Login status: ${loginResponse.status}`);
    console.log(`Set-Cookie header: ${setCookie || 'none'}`);
    
    // Parse the response body as JSON if possible
    let responseData;
    try {
      responseData = await loginResponse.json();
      console.log('Response body:', responseData);
    } catch (e) {
      console.log('No JSON response body');
    }

    if (loginResponse.status === 200) {
      console.log('✅ Login successful!');
    } else {
      console.log('❌ Login failed!');
    }

    // If we have a cookie, try to use it to get user info
    if (setCookie) {
      console.log('\nTrying to access user info with the received cookie...');
      const userResponse = await fetch(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': setCookie
        }
      });
      
      console.log(`User endpoint status: ${userResponse.status}`);
      
      if (userResponse.status === 200) {
        try {
          const userData = await userResponse.json();
          console.log('User data:', userData);
        } catch (e) {
          console.log('No JSON response for user data');
        }
      }
    }

    // Get auth endpoint info
    console.log('\nChecking available auth endpoints...');
    const authResponse = await fetch(`${BASE_URL}/api/auth-info`);
    if (authResponse.status === 200) {
      try {
        const authInfo = await authResponse.json();
        console.log('Auth info:', authInfo);
      } catch (e) {
        console.log('No JSON response for auth info');
      }
    } else {
      console.log(`Auth info endpoint status: ${authResponse.status}`);
    }
  } catch (error) {
    console.error('Error testing auth:', error);
  }
}

testAuth();