// Script to add the industry field to the projects table
import pg from 'pg';
const { Pool } = pg;

async function main() {
  console.log('Starting migration: Adding industry field to projects table...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Add the industry column if it doesn't exist
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
    `);
    
    console.log('Successfully added industry field');
    
    // Don't remove orgType yet to avoid breaking existing projects
    // We'll handle the transition in the application code first
    
    console.log('Migration completed successfully!');
    
    await pool.end();
  } catch (error) {
    console.error('Error during migration:', error);
    await pool.end();
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });