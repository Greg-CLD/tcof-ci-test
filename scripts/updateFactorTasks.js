/**
 * Update Success Factor Tasks from CSV
 * 
 * This script reads the TCOF tasks from a CSV file and updates the existing
 * success factors in the database with these tasks, preserving the canonical factors.
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

// Function to normalize factor title for matching
function normalizeFactorTitle(title) {
  return title.trim().toLowerCase();
}

export async function updateFactorTasks() {
  try {
    // Read and parse the CSV file
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Parsed ${records.length} records from CSV`);
    
    // Create a map of tasks by factor title and stage
    const tasksByFactor = {};
    
    records.forEach(record => {
      const factorTitle = record['TCOF Success Factor'];
      if (!factorTitle) return;
      
      const normalizedTitle = normalizeFactorTitle(factorTitle);
      
      if (!tasksByFactor[normalizedTitle]) {
        tasksByFactor[normalizedTitle] = {
          title: factorTitle.trim(), // Keep original formatting for reference
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
    
    console.log(`Processed tasks for ${Object.keys(tasksByFactor).length} unique factors`);
    
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
    
    // Update the tasks for each factor while preserving the factor IDs and titles
    let updatedCount = 0;
    const updatedFactors = factors.map(factor => {
      const normalizedTitle = normalizeFactorTitle(factor.title);
      const tasksFromCsv = tasksByFactor[normalizedTitle];
      
      if (tasksFromCsv) {
        console.log(`Updating tasks for factor: ${factor.title} (ID: ${factor.id})`);
        updatedCount++;
        
        // Merge the new tasks from CSV
        const mergedTasks = {
          Identification: [...new Set([...tasksFromCsv.tasks.Identification])],
          Definition: [...new Set([...tasksFromCsv.tasks.Definition])],
          Delivery: [...new Set([...tasksFromCsv.tasks.Delivery])],
          Closure: [...new Set([...tasksFromCsv.tasks.Closure])]
        };
        
        return {
          ...factor,
          tasks: mergedTasks
        };
      }
      
      return factor;
    });
    
    console.log(`Updated tasks for ${updatedCount} factors`);
    
    // Save the updated factors back to the database
    fs.writeFileSync(FACTORS_DB_PATH, JSON.stringify(updatedFactors, null, 2));
    console.log('Successfully saved updated factors to database');
    
    return {
      success: true,
      message: `Updated tasks for ${updatedCount} success factors`
    };
  } catch (error) {
    console.error('Error updating factor tasks:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// If called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  updateFactorTasks()
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
}