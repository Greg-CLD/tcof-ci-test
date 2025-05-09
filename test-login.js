// Test script to verify login functionality and debug authentication issues
import fetch from 'node-fetch';

// Credentials for testing
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

async function testLogin() {
  try {
    console.log('Testing login functionality...');
    
    // Step 1: Attempt to login
    console.log(`Attempting to login with username: ${TEST_USER.username}`);
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
      credentials: 'include',
    });
    
    console.log('Login Status:', loginResponse.status);
    
    // Inspect cookies in the response headers
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies from server:', cookies || 'No cookies set');
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', errorText);
      return;
    }
    
    const userData = await loginResponse.json();
    console.log('Login successful! User data:', userData);
    
    // Step 2: Check authentication status
    console.log('\nChecking authentication status...');
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Cookie': cookies, // Pass the cookies from login
      },
    });
    
    console.log('Auth Status:', authResponse.status);
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Authentication check failed:', errorText);
      return;
    }
    
    const authData = await authResponse.json();
    console.log('Authentication successful! User data:', authData);
    
  } catch (error) {
    console.error('Error during login test:', error);
  }
}

testLogin();