/**
 * Extract and save current session cookie for API testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function extractSessionCookie() {
  try {
    // Use curl to make a request that will return the Set-Cookie header
    const curlCommand = `curl -v -s -c cookies.txt -b cookies.txt http://localhost:3000 2>&1`;
    const output = execSync(curlCommand).toString();
    
    // Look for the connect.sid cookie in the output
    const cookieMatches = output.match(/connect\.sid=([^;]+)/);
    
    if (cookieMatches && cookieMatches[0]) {
      const cookie = cookieMatches[0];
      console.log(`Found session cookie: ${cookie}`);
      
      // Save the cookie to a file
      fs.writeFileSync('current-session.txt', cookie);
      console.log('Session cookie saved to current-session.txt');
      return cookie;
    } else {
      console.log('No session cookie found in the response');
      return null;
    }
  } catch (error) {
    console.error('Error extracting session cookie:', error);
    return null;
  }
}

// Run the extraction
extractSessionCookie();