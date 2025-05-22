/**
 * Admin Password Reset Tool (CommonJS version)
 * 
 * This script resets a user's password in the database using the exact same
 * hashing algorithm as the production authentication system (SHA-256 with salt).
 * 
 * USAGE:
 *   node reset-admin-password.cjs <email> [password]
 * 
 * If password is not provided, it defaults to "password"
 */

const crypto = require('crypto');
const { Pool } = require('pg');

// Connect to the database using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Hash password using SHA-256 (matching server/auth.ts implementation)
 * This is the primary auth method used by the application
 * 
 * Format is: hash.salt where:
 * - hash is SHA-256 of password+salt
 * - salt is 32-character random hex string
 */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  const hashValue = hash.digest('hex');
  const fullHash = `${hashValue}.${salt}`;
  
  console.log(`Generated hash format details:
  - Algorithm: SHA-256 (matching auth.ts implementation)
  - Salt length: ${salt.length} characters
  - Hash length: ${hashValue.length} characters
  - Full hash length: ${fullHash.length} characters
  - Format: hash.salt`);
  
  return fullHash;
}

/**
 * Reset a user's password
 */
async function resetPassword(email, newPassword = 'password') {
  console.log(`Attempting to reset password for user: ${email}`);
  
  try {
    // Step 1: Check if the user exists
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
    
    // Log existing password format if available
    if (user.password) {
      console.log(`Current password format:
      - Length: ${user.password.length} characters
      - Contains separator (.): ${user.password.includes('.')}
      - First 20 chars: ${user.password.substring(0, 20)}...`);
    }
    
    // Step 2: Generate password hash using SHA-256 (primary method)
    const hashedPassword = hashPassword(newPassword);
    console.log(`✓ Generated password hash using SHA-256 with salt`);
    
    // Step 3: Update the user's password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log(`✓ Password successfully updated in database`);
    console.log(`\n✅ PASSWORD RESET SUCCESSFUL!`);
    console.log(`----------------------------------------`);
    console.log(`User: ${user.username || user.email}`);
    console.log(`New password: ${newPassword}`);
    console.log(`Hashing algorithm: SHA-256 with salt (matching auth.ts)`);
    console.log(`----------------------------------------`);
    console.log(`You can now log in with these credentials.`);
    
    return true;
  } catch (error) {
    console.error(`❌ ERROR resetting password:`, error);
    return false;
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const email = process.argv[2];
const password = process.argv[3] || 'password';

if (!email) {
  console.error('Usage: node reset-admin-password.cjs <email> [password]');
  console.error('Example: node reset-admin-password.cjs greg@confluity.co.uk password123');
  process.exit(1);
}

// Run the password reset
resetPassword(email, password).then(success => {
  process.exit(success ? 0 : 1);
});