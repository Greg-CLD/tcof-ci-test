import excelToJsonToDB from './excel-to-json.js';

/**
 * Migrates success factors from Excel to Replit DB
 */
async function migrateFactorsToDB() {
  try {
    console.log('Starting migration of success factors from Excel to DB...');
    
    // Use the utility to convert Excel to JSON and save to DB
    const factors = await excelToJsonToDB();
    
    if (!factors || factors.length === 0) {
      console.error('No factors found to migrate');
      return;
    }
    
    console.log(`Successfully migrated ${factors.length} factors to database`);
    
    // Return the factors for use by importers
    return factors;
  } catch (error) {
    console.error('Error migrating factors to DB:', error);
    throw error;
  }
}

// Run migration if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  migrateFactorsToDB()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

// Export for use in other modules
export default migrateFactorsToDB;