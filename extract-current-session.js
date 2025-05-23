/**
 * Extract Current Session Cookie
 * 
 * This script captures the current active session cookie from 
 * a browser session and saves it to a file for use in testing.
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

const LOGIN_URL = 'http://localhost:5000/api/auth/login';

async function extractSession() {
  try {
    console.log('Authenticating to get session cookie...');
    
    // First, attempt to login
    const loginResponse = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'tcof123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
      return null;
    }
    
    // Extract the set-cookie header
    const cookies = loginResponse.headers.raw()['set-cookie'];
    
    if (!cookies || cookies.length === 0) {
      console.error('No cookies returned from login');
      return null;
    }
    
    // Find the session cookie
    const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid'));
    
    if (!sessionCookie) {
      console.error('Session cookie not found in response');
      return null;
    }
    
    // Extract just the name=value part of the cookie
    const sessionValue = sessionCookie.split(';')[0];
    
    console.log(`Extracted session cookie: ${sessionValue}`);
    
    // Save to file
    await fs.writeFile('current-session.txt', sessionValue);
    
    console.log('Session cookie saved to current-session.txt');
    
    return sessionValue;
  } catch (error) {
    console.error('Error extracting session:', error);
    return null;
  }
}

// Run the extraction
extractSession();