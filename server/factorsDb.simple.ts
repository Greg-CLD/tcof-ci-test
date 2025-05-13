/**
 * Simplified database-backed implementation of success factors
 * Uses direct SQL queries with minimal parameters
 */
import { db } from "../db";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Define the directory name for current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interfaces
export interface SuccessFactorWithTasks {
  id: string;
  title: string;
  description?: string;
  tasks: {
    id: string;
    factor_id: string;
    stage: string;
    text: string;
    order: number;
  }[];
}

export interface FactorTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
  // Optional properties for client-side data
  projectId?: string;
  nodes?: any[];
  connections?: any[];
  lastUpdated?: string | number;
}

// Helper function to transform database rows to the FactorTask interface
const transformFactorWithTasks = (factor: any, tasks: any[]): FactorTask => {
  // Group tasks by stage
  const stagedTasks: { [key: string]: string[] } = {
    Identification: [],
    Definition: [],
    Delivery: [],
    Closure: []
  };

  // Stage name normalization mapping
  const normalizeStage = (stageName: string): string => {
    // Convert to lowercase for case-insensitive comparison
    const stage = stageName.toLowerCase();

    // Map different stage name formats to canonical names
    if (stage === 'stage 1' || stage === 'stage1' || stage === 'identification') {
      return 'Identification';
    } else if (stage === 'stage 2' || stage === 'stage2' || stage === 'definition') {
      return 'Definition';
    } else if (stage === 'stage 3' || stage === 'stage3' || stage === 'delivery') {
      return 'Delivery';
    } else if (stage === 'stage 4' || stage === 'stage4' || stage === 'closure') {
      return 'Closure';
    }

    // If no match found, use the original name with proper capitalization
    return stageName;
  };

  // Process all tasks with stage normalization
  tasks.forEach(task => {
    const normalizedStage = normalizeStage(task.stage);

    if (stagedTasks[normalizedStage]) {
      stagedTasks[normalizedStage].push(task.text);
    } else {
      // Only log warnings when we encounter unknown stage values
      console.warn(`Unknown stage "${task.stage}" (normalized to "${normalizedStage}") for task "${task.text}" in factor ${factor.id}`);
    }
  });

  return {
    id: factor.id,
    title: factor.title,
    description: factor.description || '',
    category: 'Uncategorized', // Default category as it's not stored in the DB
    tasks: {
      Identification: stagedTasks.Identification || [],
      Definition: stagedTasks.Definition || [],
      Delivery: stagedTasks.Delivery || [],
      Closure: stagedTasks.Closure || []
    }
  };
};

// Function to load success factors from JSON file (fallback)
const loadFactorsFromJson = (): FactorTask[] => {
  try {
    // Try multiple possible filenames
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'data', 'successFactors.json'),
      path.join(__dirname, '..', '..', 'data', 'tcof_success_factors_v2.json'),
      path.join(__dirname, '..', '..', 'data', 'tcofFactors.json')
    ];

    // Try each path
    let factorsData;
    let usedPath;

    for (const dataPath of possiblePaths) {
      try {
        if (fs.existsSync(dataPath)) {
          factorsData = fs.readFileSync(dataPath, 'utf8');
          usedPath = dataPath;
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    if (!factorsData) {
      throw new Error('None of the expected success factors JSON files were found');
    }

    console.log(`Loaded success factors from ${usedPath}`);
    return JSON.parse(factorsData);
  } catch (error) {
    console.error('Error loading factors from JSON file:', error);
    return [];
  }
};

// Database operations
export const factorsDb = {
  length: 0, // This will be updated on first getAll() call
  initialized: false,

  async getAll(): Promise<FactorTask[]> {
    try {
      // Just get factors, avoiding parameters for now
      const factorsResult = await db.execute('SELECT id, title, description FROM success_factors');

      if (!factorsResult.rows || factorsResult.rows.length === 0) {
        console.log('No factors found in database');
        return [];
      }

      this.length = factorsResult.rows.length;
      const factors: FactorTask[] = [];

      // Process each factor
      for (const factor of factorsResult.rows) {
        // Get tasks for this factor
        console.log("Running factor tasks query...");
        const tasksResult = await db.execute(
          `SELECT factor_id, stage, array_agg(text) AS tasks 
           FROM success_factor_tasks 
           GROUP BY factor_id, stage 
           ORDER BY factor_id, stage`
        );
        console.log("[DB ROWS]", JSON.stringify(tasksResult.rows, null, 2));

        factors.push(transformFactorWithTasks(factor, tasksResult.rows || []));
      }

      return factors;
    } catch (error) {
      console.error('Error fetching success factors:', error);
      return [];
    }
  },

  async add(factor: FactorTask): Promise<void> {
    try {
      const id = factor.id || `sf-${uuidv4()}`;

      // Insert factor
      await db.execute(
        `INSERT INTO success_factors (id, title, description) VALUES ('${id}', '${factor.title.replace(/'/g, "''")}', '${(factor.description || '').replace(/'/g, "''")}')`
      );

      // Insert factor tasks
      const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
      for (const stage of stages) {
        const tasks = factor.tasks[stage] || [];
        for (let i = 0; i < tasks.length; i++) {
          const taskId = uuidv4();
          await db.execute(
            `INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order")
             VALUES ('${taskId}', '${id}', '${stage}', '${tasks[i].replace(/'/g, "''")}', ${i})`
          );
        }
      }

      this.length++;
    } catch (error) {
      console.error('Error adding success factor:', error);
      throw error;
    }
  },

  async findById(id: string): Promise<FactorTask | undefined> {
    try {
      // Fetch factor
      const factorResult = await db.execute(`SELECT id, title, description FROM success_factors WHERE id = '${id}'`);

      if (!factorResult.rows || factorResult.rows.length === 0) {
        return undefined;
      }

      // Fetch tasks for this factor
      const tasksResult = await db.execute(
        `SELECT id, factor_id, stage, text, "order" FROM success_factor_tasks WHERE factor_id = '${id}' ORDER BY stage, "order"`
      );

      return transformFactorWithTasks(factorResult.rows[0], tasksResult.rows || []);
    } catch (error) {
      console.error(`Error finding success factor with ID ${id}:`, error);
      return undefined;
    }
  },

  async removeById(id: string): Promise<boolean> {
    try {
      // Delete tasks first (just to be safe, should cascade)
      await db.execute(`DELETE FROM success_factor_tasks WHERE factor_id = '${id}'`);

      // Delete factor
      const result = await db.execute(`DELETE FROM success_factors WHERE id = '${id}'`);

      const success = result.rowCount && result.rowCount > 0;
      if (success) {
        this.length--;
      }
      return success;
    } catch (error) {
      console.error(`Error removing success factor with ID ${id}:`, error);
      return false;
    }
  },

  async updateById(id: string, updatedFactor: FactorTask): Promise<boolean> {
    try {
      // Update factor
      await db.execute(
        `UPDATE success_factors 
         SET title = '${updatedFactor.title.replace(/'/g, "''")}', 
             description = '${(updatedFactor.description || '').replace(/'/g, "''")}' 
         WHERE id = '${id}'`
      );

      // Delete existing tasks
      await db.execute(`DELETE FROM success_factor_tasks WHERE factor_id = '${id}'`);

      // Insert updated tasks
      const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
      for (const stage of stages) {
        const tasks = updatedFactor.tasks[stage] || [];
        for (let i = 0; i < tasks.length; i++) {
          const taskId = uuidv4();
          await db.execute(
            `INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order")
             VALUES ('${taskId}', '${id}', '${stage}', '${tasks[i].replace(/'/g, "''")}', ${i})`
          );
        }
      }

      return true;
    } catch (error) {
      console.error(`Error updating success factor with ID ${id}:`, error);
      return false;
    }
  },

  async clear(): Promise<void> {
    try {
      await db.execute('DELETE FROM success_factor_tasks');
      await db.execute('DELETE FROM success_factors');
      this.length = 0;
    } catch (error) {
      console.error('Error clearing success factors:', error);
      throw error;
    }
  },

  // Helper method to initialize the database if empty
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      console.log('Database already initialized');
      return true;
    }

    try {
      const factors = await this.getAll();

      if (factors.length === 0) {
        console.log('No factors found in database, seeding from JSON file...');
        const jsonFactors = loadFactorsFromJson();

        if (jsonFactors.length > 0) {
          // Add each factor individually
          for (const factor of jsonFactors) {
            await this.add(factor);
          }

          this.initialized = true;
          console.log(`Database initialized with ${jsonFactors.length} success factors`);
          return true;
        } else {
          console.error('Failed to load factors from JSON file');
          return false;
        }
      }

      console.log(`Database already initialized with ${factors.length} success factors`);
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing factors database:', error);
      return false;
    }
  }
};