import { db } from '../index';
import { sql } from 'drizzle-orm';

/**
 * Migration to add the industry field to the projects table
 * and drop the orgType field
 */
async function main() {
  console.log('Starting migration: Adding industry field to projects table...');
  
  try {
    // Add the industry column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
    `);
    
    console.log('Successfully added industry field');
    
    // Don't remove orgType yet to avoid breaking existing projects
    // We'll handle the transition in the application code first
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });