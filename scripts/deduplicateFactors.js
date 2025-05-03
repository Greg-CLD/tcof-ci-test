/**
 * Deduplicate Success Factors script
 * 
 * This script reduces the 32 factors in the database to 12 unique factors,
 * combining tasks from duplicates with the same title.
 */
import { factorsDb } from '../server/factorsDb.js';
import fs from 'fs';
import path from 'path';

async function deduplicateFactors() {
  console.log('Starting factor deduplication process...');
  
  try {
    // Get all factors from the database or file
    const factorsPath = path.join(process.cwd(), 'data', 'successFactors.json');
    let rawFactors = [];
    
    if (fs.existsSync(factorsPath)) {
      const data = fs.readFileSync(factorsPath, 'utf8');
      rawFactors = JSON.parse(data);
      console.log(`Loaded ${rawFactors.length} factors from successFactors.json`);
    } else {
      console.log('successFactors.json not found, falling back to factorsDb');
      if (factorsDb.length === 0) {
        console.error('No factors found in database. Please initialize the database first.');
        return false;
      }
      rawFactors = factorsDb.getAll();
      console.log(`Loaded ${rawFactors.length} factors from database`);
    }

    // Deduplicate by factor title
    const dedupMap = {};
    
    rawFactors.forEach(item => {
      const key = item.title.trim();
      
      if (!dedupMap[key]) {
        // Create a base entry with empty task arrays
        dedupMap[key] = { 
          title: item.title, 
          id: item.id, 
          tasks: {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          }
        };
      }
      
      // Merge tasks from all stages
      ['Identification', 'Definition', 'Delivery', 'Closure'].forEach(stage => {
        const sourceTasks = item.tasks?.[stage] || [];
        
        sourceTasks.forEach(task => {
          // Only add unique tasks (avoid duplicates)
          if (!dedupMap[key].tasks[stage].includes(task)) {
            dedupMap[key].tasks[stage].push(task);
          }
        });
      });
    });

    // Convert map back to array
    const dedupFactors = Object.values(dedupMap);
    console.log(`Deduplicated to ${dedupFactors.length} unique factors`);
    
    if (dedupFactors.length !== 12) {
      console.warn(`Warning: Expected 12 unique factors, but found ${dedupFactors.length}`);
    }
    
    // Assign ids consistently if needed
    dedupFactors.forEach((factor, index) => {
      if (!factor.id || factor.id.includes("duplicate")) {
        factor.id = `sf-${index + 1}`;
      }
    });

    // Save to file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataDir, 'successFactors.json'), 
      JSON.stringify(dedupFactors, null, 2),
      'utf8'
    );
    
    // Update the database
    factorsDb.setAll(dedupFactors);
    
    console.log('✅ Deduplicated factors saved successfully!');
    return true;
  } catch (error) {
    console.error('Error deduplicating factors:', error);
    return false;
  }
}

// Run the deduplication function
deduplicateFactors().then(success => {
  if (success) {
    console.log('Factor deduplication complete!');
  } else {
    console.error('Factor deduplication failed.');
    process.exit(1);
  }
});