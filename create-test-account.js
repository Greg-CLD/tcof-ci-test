/**
 * Script to create a test user account for API testing
 */
const { Pool } = require('pg');
const crypto = require('crypto');

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Hash password function
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

async function createTestUser() {
  // Test user credentials
  const testUser = {
    username: 'tester',
    email: 'tester@example.com',
    password: 'test123'
  };

  try {
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [testUser.username, testUser.email]
    );

    if (checkResult.rows.length > 0) {
      console.log('User already exists, updating password...');
      
      // Update password for existing user
      const hashedPassword = hashPassword(testUser.password);
      await pool.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hashedPassword, testUser.username]
      );
      
      console.log(`Password updated for existing user: ${testUser.username}`);
      
      return {
        username: testUser.username,
        password: testUser.password
      };
    }

    // Create new user if doesn't exist
    const hashedPassword = hashPassword(testUser.password);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
      [testUser.username, testUser.email, hashedPassword, new Date()]
    );

    console.log(`Created new test user with ID: ${result.rows[0].id}`);

    return {
      username: testUser.username,
      password: testUser.password
    };
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  } finally {
    pool.end();
  }
}

// Execute the function
createTestUser()
  .then(user => {
    console.log('Test user ready for use:');
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${user.password}`);
  })
  .catch(err => {
    console.error('Failed to create test user:', err);
    process.exit(1);
  });