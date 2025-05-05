/**
 * Script to verify the integrity of success factors data
 * Checks if any factor is missing tasks for any stage
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FactorTask {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

export function checkFactorsIntegrity(): boolean {
  try {
    const factorsPath = path.join(__dirname, '../data/successFactors.json');
    console.log(`Checking success factors integrity at ${factorsPath}...`);
    
    if (!fs.existsSync(factorsPath)) {
      console.error('\x1b[31mERROR: successFactors.json file not found!\x1b[0m');
      return false;
    }
    
    const factorsData = JSON.parse(fs.readFileSync(factorsPath, 'utf8')) as FactorTask[];
    
    if (!Array.isArray(factorsData) || factorsData.length === 0) {
      console.error('\x1b[31mERROR: Success factors data is empty or not an array!\x1b[0m');
      return false;
    }
    
    if (factorsData.length !== 12) {
      console.warn(`\x1b[33mWARNING: Expected 12 canonical success factors, but found ${factorsData.length}\x1b[0m`);
    }
    
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
    let hasIssues = false;
    
    factorsData.forEach((factor, index) => {
      if (!factor.id || !factor.title || !factor.tasks) {
        console.error(`\x1b[31mERROR: Factor at index ${index} is missing required fields (id, title, or tasks)\x1b[0m`);
        hasIssues = true;
        return;
      }
      
      stages.forEach(stage => {
        if (!factor.tasks[stage as keyof typeof factor.tasks]) {
          console.error(`\x1b[31mERROR: Factor "${factor.title}" is missing the "${stage}" stage array\x1b[0m`);
          hasIssues = true;
        } else if (factor.tasks[stage as keyof typeof factor.tasks].length === 0) {
          console.warn(`\x1b[33mWARNING: Factor "${factor.title}" has no tasks for the "${stage}" stage\x1b[0m`);
        }
      });
    });
    
    if (!hasIssues) {
      console.log('\x1b[32mSuccess factors integrity check passed!\x1b[0m');
    }
    
    return !hasIssues;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31mERROR: Failed to check success factors integrity: ${errorMessage}\x1b[0m`);
    return false;
  }
}