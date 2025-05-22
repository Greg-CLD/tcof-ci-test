/**
 * Extract Current Session
 * 
 * This script extracts the current session cookie from an authenticated session
 * and saves it to a file for use in direct API testing.
 */

import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://0.0.0.0:5000';
const COOKIE_FILE = './current-session.txt';

async function extractSessionCookie() {
  console.log('Attempting to extract current session cookie...');
  
  try {
    // Make a request to the user endpoint to check authentication
    const response = await fetch(`${BASE_URL}/api/auth/user`);
    
    if (response.headers.has('set-cookie')) {
      const cookie = response.headers.get('set-cookie');
      console.log('Cookie extracted successfully');
      fs.writeFileSync(COOKIE_FILE, cookie);
      console.log(`Saved cookie to ${COOKIE_FILE}`);
      return true;
    } else {
      console.log('No cookie found in response headers');
      
      // Try to login directly
      console.log('Attempting to login with test credentials...');
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'greg@confluity.co.uk',
          password: 'Password123!'
        })
      });
      
      if (loginResponse.headers.has('set-cookie')) {
        const cookie = loginResponse.headers.get('set-cookie');
        console.log('Login successful, cookie extracted');
        fs.writeFileSync(COOKIE_FILE, cookie);
        console.log(`Saved cookie to ${COOKIE_FILE}`);
        return true;
      } else {
        console.log('Login failed, no cookie received');
        return false;
      }
    }
  } catch (error) {
    console.error('Error extracting session cookie:', error);
    return false;
  }
}

extractSessionCookie()
  .then(result => {
    if (result) {
      console.log('Session cookie extraction completed successfully');
    } else {
      console.log('Failed to extract session cookie');
    }
  })
  .catch(err => {
    console.error('Extraction process failed:', err);
  });