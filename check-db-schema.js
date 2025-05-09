/**
 * Script to check database schema directly
 */

import postgres from 'postgres';

// Create a simple database client
const sql = postgres(process.env.DATABASE_URL, {
  idle_timeout: 30,
  max: 10,
});

async function checkSchema() {
  try {
    // Get schema information for the users table
    console.log('Checking users table schema...');
    const schemaInfo = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
    `;
    
    // Print the schema details
    console.log('Users table schema:');
    console.table(schemaInfo);
    
    // Also check a sample user record
    const users = await sql`
      SELECT * FROM users LIMIT 1
    `;
    
    if (users.length > 0) {
      console.log('Sample user record:');
      // Print without password field for security
      const { password, ...safeUser } = users[0];
      console.log(safeUser);
    } else {
      console.log('No users found in the database.');
    }
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await sql.end();
  }
}

checkSchema().catch(console.error);