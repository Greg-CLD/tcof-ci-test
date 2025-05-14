/**
 * Script to set a password for an existing user
 */
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

// Set up database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Password hashing function
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

async function setUserPassword() {
  const client = await pool.connect();
  
  try {
    console.log('Setting password for greg@confluity.co.uk');
    
    // First find the user
    const userResult = await client.query(`
      SELECT * FROM users WHERE email = $1 OR username = $1
    `, ['greg@confluity.co.uk']);
    
    if (!userResult.rows || userResult.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('User found:', user);
    
    // Set a simple password for testing (confluity123)
    const hashedPassword = hashPassword('confluity123');
    
    // Update the user password
    await client.query(`
      UPDATE users 
      SET password = $1 
      WHERE id = $2
    `, [hashedPassword, user.id]);
    
    console.log(`Password set successfully for user with ID: ${user.id}`);
  } catch (error) {
    console.error('Error setting password:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

setUserPassword();