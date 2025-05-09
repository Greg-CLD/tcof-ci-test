/**
 * Direct approach to convert user IDs in the database
 * This script uses a completely separate database connection
 */

const postgres = require('postgres');

// Connection details from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function modifyDatabase() {
  console.log('Starting direct database schema modification...');
  
  // Create a separate connection with longer timeout
  const sql = postgres(DATABASE_URL, {
    idle_timeout: 60,
    connect_timeout: 30,
    statement_timeout: 60000, // 60 seconds
    transform: {
      // Return arrays for queries
      column: {
        from: () => true,
        to: x => x
      }
    }
  });
  
  try {
    console.log('Testing database connection...');
    const result = await sql`SELECT version()`;
    console.log(`Connected to: ${result[0].version}`);
    
    console.log('Adding admin user with text ID directly...');
    
    // Adding the admin user using string interpolation for simplicity
    // This avoids potential parameter typing issues
    await sql.unsafe(
      `INSERT INTO users (id, username, password, email, created_at) VALUES
      ('admin_text', 'admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4.1a39d2f5bbcb25bde1e62a69b', 'admin@example.com', NOW())
      ON CONFLICT (id) DO NOTHING;`
    );
    
    // Verify the admin user was created
    const adminUser = await sql`SELECT * FROM users WHERE username = 'admin'`;
    console.log('Current admin user:', adminUser[0]);
    
    console.log('Current users table schema:');
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
    
    tableInfo.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    console.log('Operations completed successfully!');
  } catch (error) {
    console.error('Error executing SQL operations:', error);
  } finally {
    // Close the connection
    await sql.end();
    console.log('Database connection closed');
  }
}

// Run the function
modifyDatabase()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });