/**
 * Simple utility to set a known password for our test user
 * This script will set a password that we can reliably use in our tests
 */

// Import dependencies
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';

const scryptAsync = promisify(scrypt);

// Password hashing function (same as used in auth.ts)
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Set password for our test user
async function setPassword() {
  try {
    // User credentials we want to set
    const email = 'greg@confluity.co.uk';
    const password = 'test123'; // Test password
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log(`Generated new password hash for user ${email}`);
    
    // Update user in database
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.error(`User ${email} not found`);
      return;
    }
    
    console.log(`Password updated for user ${email} (ID: ${result.rows[0].id})`);
    console.log(`\nNew TEST credentials:`);
    console.log(`TEST_USERNAME=${email}`);
    console.log(`TEST_PASSWORD=${password}`);
    console.log(`\nUpdate these in your config/test.env file`);
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
setPassword().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});