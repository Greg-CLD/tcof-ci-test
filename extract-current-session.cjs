/**
 * Extracts the current session cookie from the browser for use in API tests
 */

const fs = require('fs');
const https = require('https');

// Find the cookie in the recent logs
function extractSessionCookie() {
  try {
    // Read recent logs
    const logs = fs.readFileSync('current-session.txt', 'utf8');
    const match = logs.match(/tcof\.sid=([^;]+)/);
    if (match) {
      return `tcof.sid=${match[1]}`;
    }
    return null;
  } catch (e) {
    console.error('Could not extract cookie from logs:', e);
    return null;
  }
}

// Test endpoint to verify the cookie works
async function testEndpoint(cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev',
      port: 443,
      path: '/api/auth/user',
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    console.log('Testing cookie with /api/auth/user endpoint...');
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Cookie works! User ID:', responseData.id);
            console.log('✅ Username:', responseData.username);
            resolve(true);
          } else {
            console.log('❌ Cookie does not work. Response:', responseData);
            resolve(false);
          }
        } catch (e) {
          console.error('Error parsing response:', e);
          console.log('Raw response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e);
      reject(e);
    });
    
    req.end();
  });
}

// Save user session from active webview
function saveSession() {
  try {
    const cookie = `tcof.sid=s%3AGzFWGtM2karVuxzsRH2nGEjg_yuVt-C1.%2FXHiyUHSC0FiiFyOJiAc4fUO55WsxaMuzanEgZpGHDw; Path=/; Expires=Sat, 21 Jun 2025 10:32:24 GMT; HttpOnly`;
    fs.writeFileSync('current-session.txt', cookie);
    console.log('✅ Saved session cookie to current-session.txt');
    return cookie;
  } catch (e) {
    console.error('Error saving cookie:', e);
    return null;
  }
}

// Main function
async function main() {
  console.log('==== Session Cookie Extractor ====');
  
  // Extract or save cookie
  let cookie = extractSessionCookie();
  if (!cookie) {
    console.log('No existing cookie found, saving a new one...');
    cookie = saveSession();
  }
  
  if (!cookie) {
    console.error('Failed to get session cookie');
    return;
  }
  
  console.log('Using cookie:', cookie);
  
  // Test the cookie
  const works = await testEndpoint(cookie);
  
  if (works) {
    console.log('\n✅ SUCCESS! Session cookie extracted and working');
    console.log('You can now use this session cookie in your test scripts');
  } else {
    console.log('\n❌ FAILURE! Session cookie not working');
    console.log('Please try refreshing the browser and running this script again');
  }
}

// Run the extractor
main().catch(console.error);