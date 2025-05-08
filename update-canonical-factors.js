/**
 * Simple script to update canonical success factors with descriptions
 */

import { ensureCanonicalFactors } from './server/ensureCanonicalFactors.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the success factors data file
const factorsPath = path.join(__dirname, 'data', 'successFactors.json');

async function updateFactors() {
  try {
    console.log('Starting canonical factors update...');
    
    // Run the ensure canonical factors function
    const updated = await ensureCanonicalFactors();
    
    if (updated) {
      console.log('Canonical factors updated successfully!');
    } else {
      console.log('No updates needed for canonical factors.');
    }
    
    // Validate that the file exists and has descriptions
    if (fs.existsSync(factorsPath)) {
      const factorsData = fs.readFileSync(factorsPath, 'utf8');
      const factors = JSON.parse(factorsData);
      
      console.log(`Found ${factors.length} success factors in data file.`);
      
      // Check if all factors have descriptions
      const missingDescriptions = factors.filter(factor => !factor.description);
      
      if (missingDescriptions.length > 0) {
        console.error(`WARNING: ${missingDescriptions.length} factors still missing descriptions.`);
      } else {
        console.log('All factors have descriptions. Update successful!');
      }
    } else {
      console.error(`ERROR: Success factors file not found at ${factorsPath}`);
    }
  } catch (error) {
    console.error('Error updating canonical factors:', error);
    process.exit(1);
  }
}

// Run the update
updateFactors().catch(console.error);