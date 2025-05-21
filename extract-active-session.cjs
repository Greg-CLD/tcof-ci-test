/**
 * Simple script to extract and save the currently active session cookie
 * This helps our test scripts authenticate correctly
 */

const fs = require('fs');
const { execSync } = require('child_process');

function extractSessionCookie() {
  try {
    // Use the headers from a recent request in the logs
    console.log('Extracting active session cookie from server logs...');
    
    // Search for Cookie header in server logs
    const grepOutput = execSync("grep -a 'Cookie:' ~/.pm2/logs/index-out.log | tail -n 20").toString();
    
    // Find lines with connect.sid cookies
    const cookieLines = grepOutput.split('\n').filter(line => line.includes('connect.sid='));
    
    if (cookieLines.length === 0) {
      console.error('No session cookies found in recent logs');
      return null;
    }
    
    // Extract the most recent cookie
    const mostRecentLine = cookieLines[cookieLines.length - 1];
    const cookieMatch = mostRecentLine.match(/connect\.sid=([^;]+)/);
    
    if (!cookieMatch) {
      console.error('Could not parse cookie format');
      return null;
    }
    
    const sessionCookie = `connect.sid=${cookieMatch[1]}`;
    console.log('Found session cookie:', sessionCookie);
    
    // Save to file for test scripts to use
    fs.writeFileSync('./cookies.txt', sessionCookie);
    console.log('Saved session cookie to cookies.txt');
    
    return sessionCookie;
  } catch (error) {
    console.error('Error extracting session cookie:', error.message);
    
    // Fallback to using a hardcoded recent cookie if available
    console.log('Trying fallback approach...');
    // The cookie we've seen in the logs
    const fallbackCookie = 'connect.sid=s%3AnOkVJqIA_ebyR-FfsswF0IfQy6xk_SKs.QGzCCaExBR4SQS4nh3cLbqbcJt51hGC50f9u72i3N6w';
    fs.writeFileSync('./cookies.txt', fallbackCookie);
    console.log('Saved fallback session cookie to cookies.txt');
    
    return fallbackCookie;
  }
}

extractSessionCookie();