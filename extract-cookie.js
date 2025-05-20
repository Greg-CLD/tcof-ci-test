/**
 * Simple utility to extract and save cookies for direct API testing
 * This helps bypass the login issue for our test scripts
 */
import fetch from 'node-fetch';
import fs from 'fs';

async function extractSessionCookie() {
  console.log('Attempting to extract a valid session cookie...');
  
  try {
    // First try to get any cookie by hitting the server
    const response = await fetch('http://0.0.0.0:5000/');
    
    if (response.headers.has('set-cookie')) {
      const cookie = response.headers.get('set-cookie');
      console.log('Received cookie from server:', cookie);
      
      // Save cookie to file
      fs.writeFileSync('./cookies.txt', cookie);
      console.log('Cookie saved to cookies.txt');
      return cookie;
    } else {
      console.log('No cookie received from server');
    }
  } catch (error) {
    console.error('Error extracting cookie:', error);
  }
}

extractSessionCookie();