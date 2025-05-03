/**
 * Update Canonical Success Factors
 * 
 * This script updates the database with the 12 official TCOF success factors,
 * preserving any existing tasks but ensuring the canonical titles are used.
 */

import { factorsDb } from '../server/factorsDb.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The 12 official TCOF success factors to use
const officialFactorTitles = [
  "1.1 Ask Why",
  "1.2 Get a Masterbuilder",
  "1.3 Get Your People on the Bus",
  "1.4 Make Friends and Keep them Friendly",
  "2.1 Recognise that your project is not unique",
  "2.2 Look for Tried & Tested Options",
  "3.1 Think Big, Start Small",
  "3.2 Learn by Experimenting",
  "3.3 Keep on top of risks",
  "4.1 Adjust for optimism",
  "4.2 Measure What Matters, Be Ready to Step Away",
  "4.3 Be Ready to Adapt"
];

async function updateCanonicalFactors() {
  console.log('Starting canonical factor update...');
  
  try {
    // First, get all existing factors from factorsDb
    const existingFactors = factorsDb.getAll();
    console.log(`Found ${existingFactors.length} existing factors in database`);
    
    // Deduplicate and merge tasks by title
    const dedupMap = {};
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
    
    // Process each existing factor to collect tasks
    existingFactors.forEach(item => {
      const normalizedTitle = item.title.trim();
      
      // If this title already exists in our map, merge tasks
      if (dedupMap[normalizedTitle]) {
        // Merge tasks from all stages
        stages.forEach(stage => {
          const sourceTasks = item.tasks?.[stage] || [];
          
          for (const task of sourceTasks) {
            // Only add unique tasks (avoid duplicates)
            if (!dedupMap[normalizedTitle].tasks[stage].includes(task)) {
              dedupMap[normalizedTitle].tasks[stage].push(task);
            }
          }
        });
      } 
      // If this is a new title, add it to the map
      else {
        // Create a base entry with the existing tasks
        dedupMap[normalizedTitle] = { 
          title: normalizedTitle,
          id: item.id,
          tasks: {
            Identification: [...(item.tasks?.Identification || [])],
            Definition: [...(item.tasks?.Definition || [])],
            Delivery: [...(item.tasks?.Delivery || [])],
            Closure: [...(item.tasks?.Closure || [])]
          }
        };
      }
    });
    
    // Create the 12 canonical factors
    const canonicalFactors = officialFactorTitles.map((title, index) => {
      // Try to find an existing factor with exact title match
      let existingFactor = existingFactors.find(f => f.title.trim() === title);
      
      // If no exact match, try to find any factor with similar title
      if (!existingFactor) {
        // Extract number prefix (e.g., "1.1" from "1.1 Ask Why")
        const prefix = title.split(' ')[0];
        
        // Look for factors that might match by prefix or keyword
        existingFactor = existingFactors.find(f => 
          f.title.includes(prefix) || 
          title.toLowerCase().includes(f.title.toLowerCase()) ||
          f.title.toLowerCase().includes(title.toLowerCase().split(' ').slice(1).join(' '))
        );
      }
      
      // If we found a matching factor, merge its tasks
      if (existingFactor) {
        return {
          id: `sf-${index + 1}`,
          title: title,
          tasks: {
            Identification: [...(existingFactor.tasks?.Identification || [])],
            Definition: [...(existingFactor.tasks?.Definition || [])],
            Delivery: [...(existingFactor.tasks?.Delivery || [])],
            Closure: [...(existingFactor.tasks?.Closure || [])]
          }
        };
      }
      
      // If no match, create new factor with empty tasks
      return {
        id: `sf-${index + 1}`,
        title: title,
        tasks: {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        }
      };
    });
    
    // Verify we have exactly 12 factors
    if (canonicalFactors.length !== 12) {
      console.error(`Error: Expected 12 canonical factors but generated ${canonicalFactors.length}`);
      return false;
    }
    
    // Clear existing factors
    factorsDb.clear();
    
    // Add new canonical factors
    canonicalFactors.forEach(factor => {
      factorsDb.add(factor);
    });
    
    console.log(`Successfully updated database with 12 canonical success factors`);
    
    // Save to JSON file for backup
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataDir, 'canonical_factors.json'), 
      JSON.stringify(canonicalFactors, null, 2),
      'utf8'
    );
    
    console.log('Saved canonical factors to data/canonical_factors.json');
    return true;
  } catch (error) {
    console.error('Error updating canonical factors:', error);
    return false;
  }
}

// Run the update function
updateCanonicalFactors().then(success => {
  if (success) {
    console.log('Canonical factor update complete!');
    process.exit(0);
  } else {
    console.error('Canonical factor update failed.');
    process.exit(1);
  }
});