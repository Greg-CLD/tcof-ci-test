import { runMigration } from './db/migrations/add_organisation_id_to_projects.js';

// Run the migration
runMigration()
  .then(success => {
    if (success) {
      console.log('Projects table migration completed successfully');
      process.exit(0);
    } else {
      console.error('Projects table migration failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error running migration:', error);
    process.exit(1);
  });