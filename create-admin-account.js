/**
 * Simple script to create an admin account directly using the postgres npm package
 * This bypasses the Drizzle ORM and its possible type mismatch issues
 */

import postgres from 'postgres';

// Create a simple database client
const sql = postgres(process.env.DATABASE_URL, {
  idle_timeout: 30,
  max: 10,
});

async function createAdmin() {
  try {
    console.log('Checking if admin user exists...');
    const existingUsers = await sql`
      SELECT * FROM users WHERE username = 'admin'
    `;
    
    if (existingUsers.length > 0) {
      console.log('Admin user already exists with ID:', existingUsers[0].id);
      return;
    }
    
    console.log('Creating admin user...');
    // Hash for password 'admin123'
    const hashedPassword = '54b27e33df5d61e167e9e3d363481e3bf95cec7130a5f566b83bfe06814865ed.2b5151667bc0dceba1a6b2e83c46ca97';
    
    const result = await sql`
      INSERT INTO users (id, username, password, email, created_at)
      VALUES (999999, 'admin', ${hashedPassword}, 'admin@example.com', NOW())
      RETURNING id, username, email
    `;
    
    console.log('Admin user created:', result[0]);
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await sql.end();
  }
}

createAdmin().catch(console.error);