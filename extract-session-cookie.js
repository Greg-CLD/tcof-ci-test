/**
 * Simple script to extract and save the session cookie from an active browser session
 * This will help our test scripts authenticate
 */

import fs from 'fs';
import fetch from 'node-fetch';

async function extractSessionCookie() {
  try {
    // Make a request to check the current session
    console.log('Checking current session...');
    
    const response = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Extract response headers as a plain object
    const headers = Array.from(response.headers.entries()).reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
    
    console.log('Response status:', response.status);
    console.log('Headers:', headers);
    
    if (response.status === 401) {
      console.log('Not logged in. Please log in through the browser first.');
      return false;
    }
    
    // Check if we received a 'set-cookie' header
    if (headers['set-cookie']) {
      const cookies = headers['set-cookie'];
      console.log('Found cookies: ', cookies);
      
      // Save cookies to a file for use in other scripts
      fs.writeFileSync('./cookies.txt', cookies, 'utf8');
      console.log('Saved cookies to cookies.txt');
      
      return true;
    } else {
      console.log('No cookies found in response. Try accessing the app in a browser first.');
      
      // Check if we have existing cookies
      if (fs.existsSync('./cookies.txt')) {
        console.log('Using existing cookies.txt file.');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error extracting cookies:', error);
    return false;
  }
}

// Run the extraction
extractSessionCookie()
  .then(success => {
    console.log(success ? 'Cookie extraction complete.' : 'Cookie extraction failed.');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });