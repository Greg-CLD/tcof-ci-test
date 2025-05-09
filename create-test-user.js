/**
 * Script to create a test user with password authentication
 */

import postgres from 'postgres';
import { createHash, randomBytes } from 'crypto';

// Create a simple database client
const sql = postgres(process.env.DATABASE_URL, {
  idle_timeout: 30,
  max: 10,
});

// Simple password hashing (in production, use a proper library like bcrypt)
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + '.' + salt;
}

async function createTestUser() {
  try {
    const username = 'testuser';
    const password = 'Password123!';
    const email = 'test@example.com';
    
    console.log('Checking if test user exists...');
    const existingUsers = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;
    
    if (existingUsers.length > 0) {
      console.log('Test user already exists with ID:', existingUsers[0].id);
      return;
    }
    
    console.log('Creating test user...');
    const hashedPassword = hashPassword(password);
    
    const result = await sql`
      INSERT INTO users (username, password, email, created_at)
      VALUES (${username}, ${hashedPassword}, ${email}, NOW())
      RETURNING id, username, email
    `;
    
    console.log('Test user created:', result[0]);
    console.log('Username:', username);
    console.log('Password:', password);
  } catch (err) {
    console.error('Error creating test user:', err);
  } finally {
    await sql.end();
  }
}

createTestUser().catch(console.error);