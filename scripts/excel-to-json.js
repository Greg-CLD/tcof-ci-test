import convertExcelToJson from './convertFactors.js';
import { saveFactors } from '../client/src/utils/factorsDB.js';

/**
 * Utility to convert Excel data to JSON and save to DB in one step
 */
async function excelToJsonToDB() {
  try {
    // Find the latest uploaded Excel file in attached_assets
    const excelPath = 'attached_assets/tcof_factors.xlsx';
    
    console.log(`Starting Excel to JSON conversion from ${excelPath}`);
    
    // Convert Excel to JSON
    const factors = await convertExcelToJson(excelPath, 'data/tcof_factors.json');
    
    if (!factors || factors.length === 0) {
      console.error('No factors found in Excel file');
      return;
    }
    
    console.log(`Converted ${factors.length} factors, saving to database...`);
    
    // Save to database
    await saveFactors(factors);
    
    console.log('Successfully saved factors to database');
    return factors;
  } catch (error) {
    console.error('Error in Excel to JSON DB process:', error);
    throw error;
  }
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  excelToJsonToDB()
    .then(() => {
      console.log('Excel to JSON to DB process completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Process failed:', error);
      process.exit(1);
    });
}

export default excelToJsonToDB;