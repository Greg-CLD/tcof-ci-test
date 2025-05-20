/**
 * Quick script to set a known password for testing
 */
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Hash password using scrypt (same as in server/auth.ts)
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${buf.toString('hex')}.${salt}`;
}

async function resetPassword() {
  try {
    // Find greg@confluity.co.uk user
    const findResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      ['greg@confluity.co.uk']
    );
    
    if (findResult.rows.length === 0) {
      console.log('User not found: greg@confluity.co.uk');
      return;
    }
    
    const user = findResult.rows[0];
    console.log(`Found user: ${user.username} (ID: ${user.id})`);
    
    // Set a simple password for testing: 'password'
    const password = 'password';
    const hashedPassword = await hashPassword(password);
    
    // Update the password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log(`✅ Password reset successful!`);
    console.log(`Test credentials: ${user.username} / ${password}`);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();