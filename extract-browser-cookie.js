/**
 * Session Cookie Extractor
 * 
 * This script logs into the application using direct API calls
 * and saves the resulting cookie to cookies.txt for tests to use.
 */

import fetch from 'node-fetch';
import fs from 'fs';

// User credentials
const username = 'greg@confluity.co.uk'; 
const password = 'password123'; // Replace with correct password if needed

async function login() {
  try {
    console.log('Attempting to login...');
    
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      redirect: 'manual'
    });
    
    // Extract cookies from the response
    const setCookieHeader = response.headers.get('set-cookie');
    
    if (setCookieHeader) {
      console.log('Login successful! Cookie received.');
      
      // Save cookie to file
      fs.writeFileSync('./cookies.txt', setCookieHeader);
      console.log('Cookie saved to cookies.txt');
      return true;
    } else {
      console.log('Login failed. No cookie received.');
      return false;
    }
  } catch (error) {
    console.error('Error during login:', error);
    return false;
  }
}

login()
  .then(success => {
    console.log(success ? 'Cookie extraction complete.' : 'Cookie extraction failed.');
  });