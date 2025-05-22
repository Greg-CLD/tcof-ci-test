/**
 * Session Cookie Extractor
 * 
 * This script extracts and saves the current session cookie from the browser
 * to a file for use by our test scripts.
 */
import fs from 'fs';
import fetch from 'node-fetch';

async function extractSessionCookie() {
  try {
    console.log('Trying to extract current session cookie...');
    
    // Try to use an existing cookie file if available
    let cookie = '';
    try {
      cookie = fs.readFileSync('./cookies.txt', 'utf8').trim();
      console.log('Using existing cookie from cookies.txt');
    } catch (err) {
      console.log('No existing cookie file found');
    }
    
    // Make a request to the API with the cookie
    const response = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Cookie': cookie
      }
    });
    
    // Check if we got a valid response
    if (response.ok) {
      // Extract the cookie from the response headers
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Save the new cookie
        fs.writeFileSync('./current-session.txt', setCookie);
        console.log('✅ Saved new session cookie to current-session.txt');
      } else {
        // Keep using the existing cookie if it works
        fs.writeFileSync('./current-session.txt', cookie);
        console.log('✅ Existing cookie is valid, saved to current-session.txt');
      }
    } else {
      console.error('❌ Failed to validate session, status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error extracting session cookie:', error);
  }
}

extractSessionCookie();
