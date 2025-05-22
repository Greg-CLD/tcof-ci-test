/**
 * Password Reset Tool (CommonJS version)
 * 
 * This script resets a user's password in the database using the exact same
 * hashing algorithm as the production authentication system.
 * 
 * USAGE:
 *   node reset-password.cjs <email> [password]
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
 * Hash password using scrypt (matching server/replitAuth.ts implementation)
 * This is the primary auth method used by the application
 * 
 * The authentication in the application uses scrypt with:
 * - 64-byte key length
 * - 16-byte salt (as hex string)
 * - Format: "hash.salt" where hash is hex and salt is hex
 */
async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Using crypto.scrypt with 64-byte length - must match server implementation exactly
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      
      // Format must be "hash.salt" as the server expects
      const hash = derivedKey.toString('hex');
      const fullHash = `${hash}.${salt}`;
      console.log(`Generated hash for "${password}" (first 10 chars): ${fullHash.substring(0, 10)}...`);
      
      resolve(fullHash);
    });
  });
}

/**
 * Alternative hashing method using SHA-256 (matching server/auth-utils.ts)
 * Used as a fallback in some parts of the application
 */
function hashPasswordSha256(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
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
    
    // Step 2: Generate password hash using scrypt (primary method)
    const hashedPassword = await hashPassword(newPassword);
    console.log(`✓ Generated password hash using scrypt`);
    
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
    console.log(`Hashing algorithm: scrypt (64-byte, matching production)`);
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
  console.error('Usage: node reset-password.cjs <email> [password]');
  console.error('Example: node reset-password.cjs greg@confluity.co.uk password123');
  process.exit(1);
}

// Run the password reset
resetPassword(email, password).then(success => {
  process.exit(success ? 0 : 1);
});