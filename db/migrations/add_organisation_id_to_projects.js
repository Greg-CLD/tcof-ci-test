const { sql } = require('drizzle-orm');
const { db } = require('../../db');

async function runMigration() {
  console.log('Starting migration: Adding organisation_id column to projects table');
  
  try {
    // Add organisation_id column referencing organisations table
    await db.execute(sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE;
    `);
    
    // Create index for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organisation_id);
    `);
    
    console.log('Migration completed successfully: Added organisation_id column to projects table');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// For direct execution with Node.js
if (require.main === module) {
  runMigration()
    .then(success => {
      if (success) {
        console.log('Migration completed');
        process.exit(0);
      } else {
        console.log('Migration failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error during migration:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };