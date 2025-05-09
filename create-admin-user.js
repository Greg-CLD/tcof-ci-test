/**
 * Script to create an admin user directly in the database
 */
import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to hash passwords using the same method as in auth.ts
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
}

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('Creating admin user...');
    
    // Define user details
    const username = 'admin';
    const email = 'greg.krawczyk@confluity.co.uk';
    const password = 'admin123'; // Simple password for testing
    const hashedPassword = hashPassword(password);
    
    // Check if user exists
    const existingUser = await client.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    
    if (existingUser.rows.length > 0) {
      // Update existing user with new password
      const userId = existingUser.rows[0].id;
      await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
      console.log(`Updated password for existing user: ${username} (${userId})`);
    } else {
      // Insert new user
      const now = new Date();
      const result = await client.query(
        'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, email, hashedPassword, now]
      );
      
      console.log(`Created new admin user with ID: ${result.rows[0].id}`);
    }
    
    console.log(`Admin user details:
      Username: ${username}
      Email: ${email}
      Password: ${password} (unencrypted for testing purposes only)
    `);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    client.release();
  }
}

// Run the function and exit
createAdminUser()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error in script execution:', err);
    process.exit(1);
  });