
import { sql } from 'drizzle-orm';
import { db } from '../../server/db.js';

// Make this more robust by exporting a standalone function
export async function createSuccessFactorRatingsTable() {
  console.log('Running migration: Create success_factor_ratings table');
  try {
    // Run the migration against the connected database
    await db.execute(sql`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS success_factor_ratings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        factor_id VARCHAR(255) NOT NULL,
        resonance INTEGER NOT NULL CHECK (resonance >= 1 AND resonance <= 5),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, factor_id)
      );

      CREATE INDEX IF NOT EXISTS idx_success_factor_ratings_project ON success_factor_ratings(project_id);
    `);
    console.log('Migration successful: success_factor_ratings table created');
    return true;
  } catch (error) {
    console.error('Error creating success_factor_ratings table:', error);
    return false;
  }
}

export async function up() {
  // Execute with proper error handling
  try {
    await createSuccessFactorRatingsTable();
    return sql`SELECT 'Success factor ratings table created or updated successfully'`;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function down() {
  console.log('Running rollback: Drop success_factor_ratings table');
  try {
    await db.execute(sql`DROP TABLE IF EXISTS success_factor_ratings;`);
    console.log('Rollback successful: success_factor_ratings table dropped');
    return sql`SELECT 'Success factor ratings table dropped successfully'`;
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Allow this module to be executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSuccessFactorRatingsTable()
    .then(success => {
      console.log(success ? 
        'Migration completed successfully.' : 
        'Migration failed, check logs for details.');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Migration failed with error:', err);
      process.exit(1);
    });
}
