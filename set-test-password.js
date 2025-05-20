/**
 * Utility script to set a known test password for user account
 * This script will:
 * 1. Connect to the database
 * 2. Update the password for a specified user
 * 3. Use the same hashing algorithm as the main application
 */

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Hash password using the same algorithm as the auth.ts file
async function hashPassword(password) {
  const scryptAsync = promisify(scrypt);
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Update user password
async function setTestPassword(email, newPassword) {
  try {
    console.log(`Setting test password for user: ${email}`);
    
    // Hash the password
    const hashedPassword = await hashPassword(newPassword);
    console.log(`Generated password hash of length ${hashedPassword.length}`);
    
    // Update the user in the database
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.error(`No user found with email ${email}`);
      return false;
    }
    
    console.log(`Password updated successfully for user: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
    console.log(`New test credentials: { username: '${email}', password: '${newPassword}' }`);
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Main function
async function main() {
  const email = 'greg@confluity.co.uk';
  const newPassword = 'testpass123';
  
  const success = await setTestPassword(email, newPassword);
  
  if (success) {
    console.log('Password reset successful. You can now use these credentials in your test scripts.');
  } else {
    console.error('Password reset failed.');
  }
}

// Run the script
main().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});