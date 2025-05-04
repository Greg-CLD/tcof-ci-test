/**
 * One-time import script for TCOF tasks from CSV
 * 
 * This script directly imports tasks from the provided CSV file
 * and updates the 12 canonical TCOF Success Factors in the database.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

// Get dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CSV file
const CSV_PATH = path.join(__dirname, '../attached_assets/tcof_factors_clean.csv');
// Path to the success factors database file
const FACTORS_DB_PATH = path.join(__dirname, '../data/successFactors.json');

// The 12 official TCOF success factors titles (case sensitive)
const CANONICAL_FACTOR_TITLES = [
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

// Function to normalize factor title for matching
function normalizeFactorTitle(title) {
  return title.trim();
}

async function importTcofTasks() {
  try {
    console.log('Starting TCOF tasks import from CSV...');
    
    // Read and parse the CSV file
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Parsed ${records.length} records from CSV file`);
    
    // Display a sample record to debug CSV parsing
    console.log('Sample CSV record:', records[0]);
    
    // Create a map of tasks by factor title and stage
    const tasksByFactor = {};
    
    // Process each record from CSV
    records.forEach(record => {
      const factorTitle = record['TCOF Success Factor '];  // Note the space at the end of column name
      if (!factorTitle) {
        console.log('Skipping record with no factor title:', record);
        return;
      }
      
      const normalizedTitle = normalizeFactorTitle(factorTitle);
      console.log(`Processing factor: "${normalizedTitle}"`);
      
      // Initialize task object for this factor if it doesn't exist
      if (!tasksByFactor[normalizedTitle]) {
        tasksByFactor[normalizedTitle] = {
          title: factorTitle.trim(),
          tasks: {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          }
        };
      }
      
      // Add tasks for each stage if they exist and are not empty
      if (record['1 Identification'] && record['1 Identification'].trim()) {
        tasksByFactor[normalizedTitle].tasks.Identification.push(record['1 Identification'].trim());
      }
      if (record['2 Definition'] && record['2 Definition'].trim()) {
        tasksByFactor[normalizedTitle].tasks.Definition.push(record['2 Definition'].trim());
      }
      if (record['3 Delivery'] && record['3 Delivery'].trim()) {
        tasksByFactor[normalizedTitle].tasks.Delivery.push(record['3 Delivery'].trim());
      }
      if (record['4 Closure'] && record['4 Closure'].trim()) {
        tasksByFactor[normalizedTitle].tasks.Closure.push(record['4 Closure'].trim());
      }
    });
    
    const factorTitlesInCsv = Object.keys(tasksByFactor);
    console.log(`Found ${factorTitlesInCsv.length} unique factors in CSV: ${factorTitlesInCsv.join(', ')}`);
    
    // Verify all canonical factors are in the CSV
    const missingFactors = CANONICAL_FACTOR_TITLES.filter(title => 
      !factorTitlesInCsv.includes(normalizeFactorTitle(title))
    );
    
    if (missingFactors.length > 0) {
      console.warn(`Warning: The following canonical factors are missing from CSV: ${missingFactors.join(', ')}`);
    }
    
    // Read the current success factors from the database
    let factors = [];
    try {
      const factorsJson = fs.readFileSync(FACTORS_DB_PATH, 'utf8');
      factors = JSON.parse(factorsJson);
      console.log(`Loaded ${factors.length} existing factors from database`);
    } catch (error) {
      console.error('Error reading factors database:', error);
      throw new Error('Could not read success factors database');
    }
    
    // Verify we have exactly 12 canonical factors
    if (factors.length !== 12) {
      console.warn(`Warning: Expected 12 canonical factors in database but found ${factors.length}`);
    }
    
    // Update the tasks for each factor while preserving the factor IDs and titles
    let updatedCount = 0;
    const updatedFactors = factors.map(factor => {
      const title = normalizeFactorTitle(factor.title);
      const tasksFromCsv = tasksByFactor[title];
      
      if (tasksFromCsv) {
        console.log(`Updating tasks for factor: ${factor.title} (ID: ${factor.id})`);
        
        // Sort tasks alphabetically within each stage to ensure consistent ordering
        const identificationTasks = [...new Set(tasksFromCsv.tasks.Identification)].sort();
        const definitionTasks = [...new Set(tasksFromCsv.tasks.Definition)].sort();
        const deliveryTasks = [...new Set(tasksFromCsv.tasks.Delivery)].sort();
        const closureTasks = [...new Set(tasksFromCsv.tasks.Closure)].sort();
        
        // Log the number of tasks for each stage
        console.log(`  Identification: ${identificationTasks.length} tasks`);
        console.log(`  Definition: ${definitionTasks.length} tasks`);
        console.log(`  Delivery: ${deliveryTasks.length} tasks`);
        console.log(`  Closure: ${closureTasks.length} tasks`);
        
        updatedCount++;
        
        // Return updated factor with new tasks
        return {
          ...factor,
          tasks: {
            Identification: identificationTasks,
            Definition: definitionTasks,
            Delivery: deliveryTasks,
            Closure: closureTasks
          }
        };
      }
      
      console.warn(`Warning: No tasks found in CSV for factor: ${factor.title} (ID: ${factor.id})`);
      return factor;
    });
    
    console.log(`Updated tasks for ${updatedCount} factors out of ${factors.length} total`);
    
    // Save the updated factors back to the database
    fs.writeFileSync(FACTORS_DB_PATH, JSON.stringify(updatedFactors, null, 2));
    console.log('Successfully saved updated factors to database');
    
    return {
      success: true,
      message: `Updated tasks for ${updatedCount} TCOF success factors`
    };
  } catch (error) {
    console.error('Error importing TCOF tasks:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Execute the import
importTcofTasks()
  .then(result => {
    if (result.success) {
      console.log('SUCCESS:', result.message);
      process.exit(0);
    } else {
      console.error('ERROR:', result.message);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });