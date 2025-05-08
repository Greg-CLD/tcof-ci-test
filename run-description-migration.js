/**
 * Simple script to run the migration that adds the description column
 * to the success_factors table
 */

import pg from 'pg';
const { Client } = pg;

// Get database URL from environment
const dbUrl = process.env.DATABASE_URL;

async function runMigration() {
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Running migration: Add description column to success_factors table');
    
    // Check if the column already exists to avoid errors
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'success_factors' AND column_name = 'description';
    `);

    if (checkResult.rows.length > 0) {
      console.log('Description column already exists in success_factors table');
    } else {
      // Execute the migration
      await client.query(`
        ALTER TABLE success_factors 
        ADD COLUMN description TEXT NOT NULL DEFAULT '';
      `);
      console.log('Successfully added description column to success_factors table');
    }
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });