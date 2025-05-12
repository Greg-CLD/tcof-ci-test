/**
 * Script to create the success_factor_ratings table
 * This script handles the migration directly with proper logging
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createSuccessFactorRatingsTable } from '../db/migrations/20250510_create_success_factor_ratings.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSuccessFactorRatingsMigration() {
  console.log('Starting success_factor_ratings table migration...');
  
  try {
    const success = await createSuccessFactorRatingsTable();
    
    if (success) {
      console.log('✅ Migration completed successfully: success_factor_ratings table is ready');
    } else {
      console.error('❌ Migration failed, check logs for details');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run the migration
runSuccessFactorRatingsMigration();