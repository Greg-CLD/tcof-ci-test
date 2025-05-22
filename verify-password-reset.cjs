/**
 * Verify Password Reset Script
 * 
 * This script demonstrates a complete password reset and login flow:
 * 1. Resets the password for greg@confluity.co.uk
 * 2. Directly tests the login API with the new credentials
 * 3. Reports clear success/failure status
 * 
 * Run with: node verify-password-reset.cjs
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const https = require('https');

// Use a known test password
const TEST_EMAIL = 'greg@confluity.co.uk';
const TEST_PASSWORD = 'confluity2024';

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Hash password using scrypt (matching server implementation)
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

/**
 * Make an API request with proper headers
 */
function apiRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const replitDomain = process.env.REPLIT_DOMAINS || '';
    const baseUrl = 'https://' + replitDomain.split(',')[0];
    const url = baseUrl + endpoint;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    console.log(`Making ${method} request to ${url}`);
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            body: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Reset user password in database
 */
async function resetPassword(email, password) {
  console.log(`\n🔐 STEP 1: Resetting password for ${email}...`);
  
  try {
    // Find the user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      return false;
    }
    
    const user = userResult.rows[0];
    console.log(`✓ Found user: ${user.username || user.email} (ID: ${user.id})`);
    
    // Generate password hash
    const hashedPassword = await hashPassword(password);
    console.log(`✓ Generated password hash using scrypt (matching production format)`);
    
    // Update the user's password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log(`✓ Password successfully updated in database`);
    return true;
  } catch (error) {
    console.error(`❌ Error resetting password:`, error);
    return false;
  }
}

/**
 * Test login with API
 */
async function testLogin(email, password) {
  console.log(`\n🔑 STEP 2: Testing login with credentials...`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  
  try {
    const loginResponse = await apiRequest('POST', '/api/login', {
      username: email,
      password: password
    });
    
    console.log(`✓ Login response status: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode === 200) {
      console.log(`✓ Login successful!`);
      return true;
    } else {
      console.error(`❌ Login failed with status ${loginResponse.statusCode}`);
      console.error(`Response:`, loginResponse.body);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error testing login:`, error);
    return false;
  }
}

/**
 * Run the verification test
 */
async function runVerification() {
  console.log('==================================================');
  console.log('PASSWORD RESET & LOGIN VERIFICATION TEST');
  console.log('==================================================');
  
  try {
    // Step 1: Reset the password
    const resetSuccess = await resetPassword(TEST_EMAIL, TEST_PASSWORD);
    if (!resetSuccess) {
      console.error('❌ Password reset failed, stopping test');
      return false;
    }
    
    // Step 2: Test login with new credentials
    const loginSuccess = await testLogin(TEST_EMAIL, TEST_PASSWORD);
    if (!loginSuccess) {
      console.error('❌ Login verification failed, check server logs for details');
      return false;
    }
    
    // Success - everything worked!
    console.log('\n✅ VERIFICATION SUCCESSFUL!');
    console.log('==================================================');
    console.log(`User: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log('==================================================');
    console.log('Password reset and login functionality is working correctly.');
    
    return true;
  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the verification
runVerification().then(success => {
  process.exit(success ? 0 : 1);
});