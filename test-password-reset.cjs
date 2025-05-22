/**
 * Test script to verify password reset and login functionality
 * 
 * This script:
 * 1. Resets greg@confluity.co.uk's password
 * 2. Attempts to login with the new credentials
 * 3. Reports success or failure
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const https = require('https');
const querystring = require('querystring');

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Hash password using scrypt (matching server implementation)
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

// Get the URL for the current Replit
function getReplitUrl() {
  // Extract from environment variables
  const replitDomain = process.env.REPLIT_DOMAINS || '';
  return 'https://' + replitDomain.split(',')[0];
}

// Make a simple HTTP POST request
function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonResponse
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

async function resetAndTestLogin() {
  const email = 'greg@confluity.co.uk';
  const password = 'test123'; // Test password
  
  console.log('='.repeat(50));
  console.log('TESTING PASSWORD RESET AND LOGIN');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Reset the password in the database
    console.log(`\n📋 Step 1: Resetting password for ${email}...`);
    
    // Find the user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`❌ ERROR: User not found: ${email}`);
      return false;
    }
    
    const user = userResult.rows[0];
    console.log(`✓ Found user: ${user.username || user.email} (ID: ${user.id})`);
    
    // Hash password using scrypt
    const hashedPassword = await hashPassword(password);
    console.log(`✓ Generated password hash using scrypt (matching production format)`);
    
    // Update the user's password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log(`✓ Password successfully updated in database`);
    
    // Step 2: Test logging in with the new credentials
    console.log(`\n📋 Step 2: Testing login with new credentials...`);
    
    const apiUrl = getReplitUrl() + '/api/login';
    console.log(`✓ API URL: ${apiUrl}`);
    
    const loginResponse = await postRequest(apiUrl, {
      username: email,
      password: password
    });
    
    console.log(`✓ Login response status: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode === 200) {
      console.log(`\n✅ SUCCESS: Password reset and login test passed!`);
      console.log(`=`.repeat(50));
      console.log(`User: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Login response:`, loginResponse.body);
      return true;
    } else {
      console.error(`\n❌ ERROR: Login failed with status ${loginResponse.statusCode}`);
      console.error(`Response:`, loginResponse.body);
      
      // Additional debugging - check password format in DB
      const passwordCheck = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [user.id]
      );
      
      if (passwordCheck.rows.length > 0) {
        const storedPassword = passwordCheck.rows[0].password;
        console.log(`\n🔍 DEBUG - Password format check:`);
        console.log(`  - Stored password length: ${storedPassword.length}`);
        console.log(`  - Contains dot separator: ${storedPassword.includes('.')}`);
        console.log(`  - Password starts with: ${storedPassword.substring(0, 20)}...`);
      }
      
      return false;
    }
  } catch (error) {
    console.error(`\n❌ ERROR during test:`, error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the test
resetAndTestLogin().then(success => {
  process.exit(success ? 0 : 1);
});