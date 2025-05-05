/**
 * Success Factors Utilities for Data Validation and Management
 * Provides tools for both server-side validation and admin data operations
 */
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current module's directory (ES Module alternative to __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Success Factor Interfaces
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

// Known canonical factor titles
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

// Path to success factors data file
const factorsPath = resolve(__dirname, '../data/successFactors.json');

/**
 * Load success factors from the data file
 * @returns Array of success factors
 */
export function loadFactors(): FactorTask[] {
  try {
    if (!fs.existsSync(factorsPath)) {
      console.error(`Error: Success factors file not found at ${factorsPath}`);
      return [];
    }
    
    const data = fs.readFileSync(factorsPath, 'utf8');
    return JSON.parse(data) as FactorTask[];
  } catch (error) {
    console.error(`Error loading success factors: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Save success factors to the data file
 * @param factors Array of success factors to save
 * @returns Boolean indicating success
 */
export function saveFactors(factors: FactorTask[]): boolean {
  try {
    fs.writeFileSync(factorsPath, JSON.stringify(factors, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving success factors: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Check if a factor has valid task arrays for all stages
 * @param factor The factor to check
 * @returns Boolean indicating validity and any issues
 */
export function validateFactorTasks(factor: FactorTask): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
  
  if (!factor.id) {
    issues.push(`Factor is missing an ID`);
  }
  
  if (!factor.title) {
    issues.push(`Factor is missing a title`);
  }
  
  if (!factor.tasks) {
    issues.push(`Factor "${factor.title || 'unknown'}" is missing tasks object`);
    return { valid: false, issues };
  }
  
  for (const stage of stages) {
    // Check if the stage property exists
    if (!(stage in factor.tasks)) {
      issues.push(`Factor "${factor.title}" is missing the "${stage}" stage array`);
    } else if (!Array.isArray(factor.tasks[stage as keyof typeof factor.tasks])) {
      issues.push(`Factor "${factor.title}" has an invalid "${stage}" stage (not an array)`);
    } else if (factor.tasks[stage as keyof typeof factor.tasks].length === 0) {
      issues.push(`Factor "${factor.title}" has no tasks for the "${stage}" stage`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

/**
 * Identify task gaps across all factors
 * @returns Array of issues found
 */
export function identifyTaskGaps(): string[] {
  const factors = loadFactors();
  const issues: string[] = [];
  
  factors.forEach(factor => {
    const { valid, issues: factorIssues } = validateFactorTasks(factor);
    if (!valid) {
      issues.push(...factorIssues);
    }
  });
  
  return issues;
}

/**
 * Generate a report of all factors and their task distribution
 * @returns Object with report data
 */
export function generateFactorsReport(): { factorCount: number; tasksByStage: Record<string, number>; gapsByFactor: Record<string, string[]> } {
  const factors = loadFactors();
  const tasksByStage: Record<string, number> = {
    'Identification': 0,
    'Definition': 0,
    'Delivery': 0,
    'Closure': 0
  };
  
  const gapsByFactor: Record<string, string[]> = {};
  
  factors.forEach(factor => {
    gapsByFactor[factor.title] = [];
    
    for (const stage in tasksByStage) {
      if (factor.tasks[stage as keyof typeof factor.tasks]) {
        const tasks = factor.tasks[stage as keyof typeof factor.tasks];
        tasksByStage[stage] += tasks.length;
        
        if (tasks.length === 0) {
          gapsByFactor[factor.title].push(`No ${stage} tasks`);
        }
      } else {
        gapsByFactor[factor.title].push(`Missing ${stage} stage`);
      }
    }
    
    // Remove factors with no gaps
    if (gapsByFactor[factor.title].length === 0) {
      delete gapsByFactor[factor.title];
    }
  });
  
  return {
    factorCount: factors.length,
    tasksByStage,
    gapsByFactor
  };
}

/**
 * Check canonical factors integrity
 * Validates that all 12 canonical factors are present with correct titles
 * @returns Boolean indicating if all canonical factors are present
 */
export function checkCanonicalFactorsIntegrity(): { valid: boolean; missing: string[]; extra: string[] } {
  const factors = loadFactors();
  const factorTitles = factors.map(f => f.title);
  
  const missing = CANONICAL_FACTOR_TITLES.filter(title => !factorTitles.includes(title));
  const extra = factorTitles.filter(title => !CANONICAL_FACTOR_TITLES.includes(title));
  
  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}

/**
 * Export success factors data to JSON string
 * @returns JSON string representation of factors data
 */
export function exportFactorsToJSON(): string {
  const factors = loadFactors();
  return JSON.stringify(factors, null, 2);
}

/**
 * Verify factors integrity
 * This combines multiple validation checks
 */
export function verifyFactorsIntegrity(): boolean {
  try {
    console.log(`Checking success factors integrity at ${factorsPath}...`);
    
    if (!fs.existsSync(factorsPath)) {
      console.error('\x1b[31mERROR: successFactors.json file not found!\x1b[0m');
      return false;
    }
    
    const factors = loadFactors();
    
    if (!Array.isArray(factors) || factors.length === 0) {
      console.error('\x1b[31mERROR: Success factors data is empty or not an array!\x1b[0m');
      return false;
    }
    
    // Check canonical factors
    const { valid: canonicalValid, missing, extra } = checkCanonicalFactorsIntegrity();
    
    if (!canonicalValid) {
      if (missing.length > 0) {
        console.error(`\x1b[31mERROR: Missing canonical factors: ${missing.join(', ')}\x1b[0m`);
      }
      if (extra.length > 0) {
        console.warn(`\x1b[33mWARNING: Extra non-canonical factors found: ${extra.join(', ')}\x1b[0m`);
      }
    }
    
    if (factors.length !== 12) {
      console.warn(`\x1b[33mWARNING: Expected 12 canonical success factors, but found ${factors.length}\x1b[0m`);
    }
    
    // Check tasks for each factor
    let hasIssues = false;
    
    factors.forEach(factor => {
      const { valid, issues } = validateFactorTasks(factor);
      
      if (!valid) {
        hasIssues = true;
        issues.forEach(issue => {
          if (issue.includes("has no tasks")) {
            console.warn(`\x1b[33mWARNING: ${issue}\x1b[0m`);
          } else {
            console.error(`\x1b[31mERROR: ${issue}\x1b[0m`);
            hasIssues = true;
          }
        });
      }
    });
    
    if (!hasIssues && canonicalValid) {
      console.log('\x1b[32mSuccess factors integrity check passed!\x1b[0m');
      return true;
    } else if (!hasIssues) {
      console.log('\x1b[32mSuccess factors task structure is valid, but canonical factor issues detected\x1b[0m');
      return false;
    } else {
      console.log('\x1b[31mSuccess factors integrity check failed with errors\x1b[0m');
      return false;
    }
  } catch (error) {
    console.error(`\x1b[31mERROR: Failed to check success factors integrity: ${(error as Error).message}\x1b[0m`);
    return false;
  }
}

// If running directly (ES Module equivalent of the CommonJS check)
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyFactorsIntegrity();
}