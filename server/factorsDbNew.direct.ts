/**
 * Database-backed implementation of success factors
 * Uses direct SQL queries to avoid ORM issues
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
  // Track changes
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to transform database rows to the FactorTask interface
const transformFactorWithTasks = (factor: any, tasks: any[]): FactorTask => {
  console.log("[TRANSFORM] Starting transform for factor:", factor.id);
  // Group tasks by stage
  const stagedTasks: { [key: string]: string[] } = {
    Identification: [],
    Definition: [],
    Delivery: [],
    Closure: []
  };

  tasks.forEach(task => {
    if (stagedTasks[task.stage]) {
      stagedTasks[task.stage].push(task.text);
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
    // Removed createdAt/updatedAt since they don't exist in the success_factors table
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
      console.log('Fetching all success factors...');

      // Get all factors and their tasks in a single query
      const result = await db.execute(`
        SELECT 
          f.id,
          f.title,
          f.description,
          json_agg(
            json_build_object(
              'stage', sft.stage,
              'text', sft.text
            )
          ) as tasks
        FROM success_factors f 
        LEFT JOIN success_factor_tasks sft ON f.id = sft.factor_id
        GROUP BY f.id, f.title, f.description
        ORDER BY f.title;
      `);

      // Log the first row to see raw structure
      console.log('Raw first row:', JSON.stringify(result.rows[0], null, 2));

      if (!result.rows || result.rows.length === 0) {
        console.log('No factors found in database');
        return [];
      }

      this.length = result.rows.length;

      // Transform each factor
      const factors: FactorTask[] = await Promise.all(
        result.rows.map(async (factor: any) => {
          // Fetch tasks for this factor
          const tasksQuery = 'SELECT id, factor_id, stage, text, "order" FROM success_factor_tasks WHERE factor_id = $1 ORDER BY stage, "order"';
          const tasksResult = await db.execute(tasksQuery, [factor.id]);

          return transformFactorWithTasks(factor, tasksResult.rows || []);
        })
      );

      return factors;
    } catch (error) {
      console.error('Error fetching success factors:', error);
      return [];
    }
  },

  async setAll(factors: FactorTask[]): Promise<void> {
    try {
      console.log(`Attempting to update all success factors (${factors.length} items)`);

      // Instead of using a transaction, we'll do this in separate queries
      // First clear all data
      await db.execute('DELETE FROM success_factor_tasks');
      await db.execute('DELETE FROM success_factors');

      // Then insert new data
      for (const factor of factors) {
        // Insert factor
        await db.execute(
          'INSERT INTO success_factors (id, title, description) VALUES ($1, $2, $3)',
          [factor.id, factor.title, factor.description || '']
        );

        // Insert factor tasks
        const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
        for (const stage of stages) {
          const tasks = factor.tasks[stage] || [];
          for (let i = 0; i < tasks.length; i++) {
            await db.execute(
              'INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order") VALUES ($1, $2, $3, $4, $5)',
              [uuidv4(), factor.id, stage, tasks[i], i]
            );
          }
        }
      }

      this.length = factors.length;
      console.log(`Successfully updated all success factors`);
    } catch (error) {
      console.error('Error updating success factors:', error);
      throw error;
    }
  },

  async add(factor: FactorTask): Promise<void> {
    try {
      const id = factor.id || `sf-${uuidv4()}`;

      // Insert factor
      await db.execute(
        'INSERT INTO success_factors (id, title, description) VALUES ($1, $2, $3)',
        [id, factor.title, factor.description || '']
      );

      // Insert factor tasks
      const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
      for (const stage of stages) {
        const tasks = factor.tasks[stage] || [];
        for (let i = 0; i < tasks.length; i++) {
          await db.execute(
            'INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order") VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), id, stage, tasks[i], i]
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
      const query = 'SELECT id, title, description FROM success_factors WHERE id = $1';
      const result = await db.execute(query, [id]);

      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }

      // Fetch tasks for this factor
      const tasksQuery = 'SELECT id, factor_id, stage, text, "order" FROM success_factor_tasks WHERE factor_id = $1 ORDER BY stage, "order"';
      const tasksResult = await db.execute(tasksQuery, [id]);

      return transformFactorWithTasks(result.rows[0], tasksResult.rows || []);
    } catch (error) {
      console.error(`Error finding success factor with ID ${id}:`, error);
      return undefined;
    }
  },

  async removeById(id: string): Promise<boolean> {
    try {
      // Delete tasks first (should cascade, but just to be safe)
      await db.execute('DELETE FROM success_factor_tasks WHERE factor_id = $1', [id]);

      // Delete factor
      const result = await db.execute('DELETE FROM success_factors WHERE id = $1', [id]);

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
        'UPDATE success_factors SET title = $1, description = $2 WHERE id = $3',
        [updatedFactor.title, updatedFactor.description || '', id]
      );

      // Delete existing tasks
      await db.execute('DELETE FROM success_factor_tasks WHERE factor_id = $1', [id]);

      // Insert updated tasks
      const stages = ['Identification', 'Definition', 'Delivery', 'Closure'];
      for (const stage of stages) {
        const tasks = updatedFactor.tasks[stage] || [];
        for (let i = 0; i < tasks.length; i++) {
          await db.execute(
            'INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order") VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), id, stage, tasks[i], i]
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

  async getFactorWithTasks(id: string): Promise<SuccessFactorWithTasks | undefined> {
    try {
      // Fetch factor
      const query = 'SELECT id, title, description FROM success_factors WHERE id = $1';
      const result = await db.execute(query, [id]);

      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }

      // Fetch tasks for this factor
      const tasksQuery = 'SELECT id, factor_id, stage, text, "order" FROM success_factor_tasks WHERE factor_id = $1 ORDER BY stage, "order"';
      const tasksResult = await db.execute(tasksQuery, [id]);

      return {
        ...result.rows[0],
        tasks: tasksResult.rows || []
      };
    } catch (error) {
      console.error(`Error getting factor with tasks for ID ${id}:`, error);
      return undefined;
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
          await this.setAll(jsonFactors);
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