import('./scripts/migrateFactorsToDB.js')
  .then(() => {
    console.log('Migration script executed successfully.');
  })
  .catch(error => {
    console.error('Error executing migration script:', error);
    process.exit(1);
  });