/**
 * Debug script to inspect database users and create a test user
 */
import pkg from 'pg';
const { Pool } = pkg;
import crypto from 'crypto';

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to hash passwords - simplified version
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function debugUsers() {
  const client = await pool.connect();
  
  try {
    console.log('========== DATABASE USER STRUCTURE INSPECTION ==========');

    // Check users table columns
    console.log('\n1. Checking users table structure:');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.table(tableInfo.rows);
    
    // Check all existing users (without exposing passwords)
    console.log('\n2. Listing existing users:');
    const users = await client.query(`
      SELECT id, username, email, created_at, 
             CASE WHEN password IS NULL THEN 'null' 
                  WHEN password = '' THEN 'empty' 
                  ELSE 'set (length: ' || LENGTH(password) || ')' END AS password_status
      FROM users
      ORDER BY id;
    `);
    
    console.table(users.rows);
    
    // Count users with password
    const passwordStats = await client.query(`
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN password IS NULL THEN 1 ELSE 0 END) AS null_passwords,
        SUM(CASE WHEN password = '' THEN 1 ELSE 0 END) AS empty_passwords,
        SUM(CASE WHEN password IS NOT NULL AND password != '' THEN 1 ELSE 0 END) AS set_passwords
      FROM users;
    `);
    
    console.log('\n3. Password statistics:');
    console.table(passwordStats.rows);
    
    // Create test user with simple password
    console.log('\n4. Creating test user:');
    
    const testUsername = 'testuser';
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    const simpleHashedPassword = hashPassword(testPassword);
    
    // Check if user exists
    const existingUser = await client.query('SELECT * FROM users WHERE username = $1', [testUsername]);
    
    if (existingUser.rows.length > 0) {
      console.log(`User ${testUsername} already exists with ID ${existingUser.rows[0].id}`);
      
      // Update password
      await client.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [simpleHashedPassword, testUsername]
      );
      console.log(`Updated password for user ${testUsername}`);
    } else {
      // Create user
      const result = await client.query(
        'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
        [testUsername, testEmail, simpleHashedPassword, new Date()]
      );
      
      console.log(`Created new test user with ID: ${result.rows[0].id}`);
    }
    
    console.log(`
      Test user credentials:
      Username: ${testUsername}
      Password: ${testPassword}
      Password hash (SHA-256 simple): ${simpleHashedPassword}
    `);
    
    console.log('\n========== END OF DATABASE INSPECTION ==========');
    
  } catch (error) {
    console.error('Error during database inspection:', error);
  } finally {
    client.release();
  }
}

// Run the function and exit
debugUsers()
  .then(() => {
    console.log('Debug complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error in debug script:', err);
    process.exit(1);
  });