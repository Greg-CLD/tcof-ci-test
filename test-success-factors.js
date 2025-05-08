/**
 * Test script to verify that success factors descriptions are properly loaded
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the success factors data file
const factorsPath = path.join(__dirname, 'data', 'successFactors.json');

// Function to test success factors
async function testSuccessFactors() {
  try {
    console.log('Testing success factors descriptions...');
    
    // Check if the file exists
    if (!fs.existsSync(factorsPath)) {
      console.error(`ERROR: Success factors file not found at ${factorsPath}`);
      process.exit(1);
    }
    
    // Read the file
    const factorsData = fs.readFileSync(factorsPath, 'utf8');
    const factors = JSON.parse(factorsData);
    
    console.log(`Found ${factors.length} success factors.`);
    
    // Check if all factors have descriptions
    const missingDescriptions = factors.filter(factor => !factor.description);
    
    if (missingDescriptions.length > 0) {
      console.error('ERROR: The following factors are missing descriptions:');
      missingDescriptions.forEach(factor => {
        console.error(`- ${factor.id}: ${factor.title}`);
      });
      process.exit(1);
    }
    
    // Print out all factors with their descriptions (first 100 chars)
    console.log('\nSuccess factors with descriptions:');
    factors.forEach(factor => {
      const description = factor.description || 'No description';
      const truncatedDescription = description.length > 100 
        ? description.substring(0, 97) + '...' 
        : description;
      
      console.log(`${factor.id} - ${factor.title}:`);
      console.log(`  ${truncatedDescription}`);
    });
    
    console.log('\nAll success factors have descriptions! Test passed.');
  } catch (error) {
    console.error('Error testing success factors:', error);
    process.exit(1);
  }
}

// Run the test
testSuccessFactors().catch(console.error);