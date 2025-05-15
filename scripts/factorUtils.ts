
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// Success Factor Interfaces 
export interface FactorTask {
  id: string;
  title: string;
  description?: string;
  originalId?: string; // Original "sf-#" format ID for database operations
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

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

/**
 * Load success factors from database with tasks
 * @returns Array of success factors
 */
export async function loadFactors(): Promise<FactorTask[]> {
  try {
    console.log('Loading factors from database...');
    
    // Get all factors with their tasks
    const result = await db.execute(sql`
      SELECT f.id, f.title, f.description,
             ft.stage, ft.text
      FROM success_factors f
      LEFT JOIN success_factor_tasks ft ON f.id = ft.factor_id
      ORDER BY f.id, ft.stage
    `);

    if (!result.rows || result.rows.length === 0) {
      console.warn('No factors found in database');
      return [];
    }

    // Group tasks by factor and stage
    const factorMap = new Map<string, FactorTask>();
    
    result.rows.forEach((row: any) => {
      if (!factorMap.has(row.id)) {
        factorMap.set(row.id, {
          id: row.id,
          title: row.title,
          description: row.description || '',
          tasks: {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          }
        });
      }

      const factor = factorMap.get(row.id)!;
      if (row.stage && row.text) {
        factor.tasks[row.stage as keyof typeof factor.tasks].push(row.text);
      }
    });

    return Array.from(factorMap.values());
  } catch (error) {
    console.error('Error loading factors from database:', error);
    throw error;
  }
}

/**
 * Save success factors to database
 * @param factors Array of success factors to save
 * @returns Boolean indicating success
 */
export async function saveFactors(factors: FactorTask[]): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      // Clear existing tasks
      await tx.execute(sql`DELETE FROM success_factor_tasks`);
      
      // Update/insert factors and their tasks
      for (const factor of factors) {
        // Upsert factor
        await tx.execute(sql`
          INSERT INTO success_factors (id, title)
          VALUES (${factor.id}, ${factor.title})
          ON CONFLICT (id) DO UPDATE 
          SET title = EXCLUDED.title
        `);

        // Insert tasks for each stage
        for (const [stage, tasks] of Object.entries(factor.tasks)) {
          for (const task of tasks) {
            await tx.execute(sql`
              INSERT INTO success_factor_tasks (factor_id, stage, task_text)
              VALUES (${factor.id}, ${stage}, ${task})
            `);
          }
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Error saving factors to database:', error);
    throw error;
  }
}

// Keep existing validation functions but remove file operations
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
    if (!(stage in factor.tasks)) {
      issues.push(`Factor "${factor.title}" is missing the "${stage}" stage array`);
    } else if (!Array.isArray(factor.tasks[stage as keyof typeof factor.tasks])) {
      issues.push(`Factor "${factor.title}" has an invalid "${stage}" stage (not an array)`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

export async function identifyTaskGaps(): Promise<string[]> {
  const factors = await loadFactors();
  const issues: string[] = [];
  
  factors.forEach(factor => {
    const { valid, issues: factorIssues } = validateFactorTasks(factor);
    if (!valid) {
      issues.push(...factorIssues);
    }
  });
  
  return issues;
}

export async function generateFactorsReport(): Promise<{ factorCount: number; tasksByStage: Record<string, number>; gapsByFactor: Record<string, string[]> }> {
  const factors = await loadFactors();
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

export async function checkCanonicalFactorsIntegrity(): Promise<{ valid: boolean; missing: string[]; extra: string[] }> {
  const factors = await loadFactors();
  const factorTitles = factors.map(f => f.title);
  
  const missing = CANONICAL_FACTOR_TITLES.filter(title => !factorTitles.includes(title));
  const extra = factorTitles.filter(title => !CANONICAL_FACTOR_TITLES.includes(title));
  
  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}

export async function verifyFactorsIntegrity(): boolean {
  try {
    console.log('Checking success factors integrity in database...');
    
    const factors = await loadFactors();
    
    if (!factors || factors.length === 0) {
      console.error('\x1b[31mERROR: No success factors found in database!\x1b[0m');
      return false;
    }
    
    const { valid: canonicalValid, missing, extra } = await checkCanonicalFactorsIntegrity();
    
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
    
    let hasCriticalIssues = false;
    let hasWarnings = false;
    
    for (const factor of factors) {
      const { valid, issues } = validateFactorTasks(factor);
      
      if (!valid) {
        issues.forEach(issue => {
          if (issue.includes("has no tasks")) {
            console.warn(`\x1b[33mWARNING: ${issue}\x1b[0m`);
            hasWarnings = true;
          } else {
            console.error(`\x1b[31mERROR: ${issue}\x1b[0m`);
            hasCriticalIssues = true;
          }
        });
      }
    }
    
    if (!hasCriticalIssues && canonicalValid) {
      if (hasWarnings) {
        console.log('\x1b[32mSuccess factors integrity check passed with warnings!\x1b[0m');
      } else {
        console.log('\x1b[32mSuccess factors integrity check passed!\x1b[0m');
      }
      return true;
    } else if (!hasCriticalIssues) {
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
