/**
 * Simple script to run the migration that adds the description column
 * to the success_factors table
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { up } = require('./db/migrations/20250508_add_description_to_success_factors.js');

async function runMigration() {
  // Connect to the database
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Create connection
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('Running migration to add description column to success_factors table...');
    
    // Run the migration
    await up(db);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Run the migration
runMigration().catch(console.error);