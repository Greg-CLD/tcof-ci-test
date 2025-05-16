/**
 * Script to run the UUID migration for success factors and task source IDs
 */
import runMigration from './migrations/uuid-migration.js';

console.log('Starting UUID migration process...');
runMigration()
  .then(() => {
    console.log('✅ UUID migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ UUID migration failed:', error);
    process.exit(1);
  });