import { db } from './db';
import { sql, eq } from 'drizzle-orm';
import type { FactorTask } from '../scripts/factorUtils';
import { v4 as uuidv4 } from 'uuid';

export async function getFactors(): Promise<FactorTask[]> {
  try {
    console.log("Getting all factors from v_success_factors_full view...");
    const result = await db.execute(sql`
      SELECT id, title, description, tasks::text
      FROM v_success_factors_full
      ORDER BY id
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("No factors found in database");
      return [];
    }

    console.log(`Found ${result.rows.length} factors in the database`);
    
    // Parse the JSON tasks manually to ensure proper structure
    const factors = result.rows.map((row: any) => {
      // Parse the JSON string tasks
      let parsedTasks;
      try {
        // Make sure tasks is a string before parsing
        if (typeof row.tasks === 'string') {
          parsedTasks = JSON.parse(row.tasks);
        } else {
          parsedTasks = row.tasks;
        }
      } catch (e) {
        console.error('Error parsing tasks JSON for factor', row.id, e);
        // Provide default empty structure if parsing fails
        parsedTasks = {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        };
      }
      
      // Ensure each stage has a valid array, not null
      const tasksWithDefaults = {
        Identification: Array.isArray(parsedTasks.Identification) ? parsedTasks.Identification : [],
        Definition: Array.isArray(parsedTasks.Definition) ? parsedTasks.Definition : [],
        Delivery: Array.isArray(parsedTasks.Delivery) ? parsedTasks.Delivery : [],
        Closure: Array.isArray(parsedTasks.Closure) ? parsedTasks.Closure : []
      };
      
      return {
        id: String(row.id),
        title: String(row.title),
        description: row.description ? String(row.description) : '',
        tasks: tasksWithDefaults
      };
    });
    
    console.log(`Returning ${factors.length} factors with tasks`);
    
    // Debug log the first factor and its tasks
    if (factors.length > 0) {
      const sampleFactor = factors[0];
      console.log("Sample factor with tasks:", JSON.stringify(sampleFactor, null, 2));
    }
    
    return factors;
  } catch (error) {
    console.error('Error loading factors from database:', error);
    throw error;
  }
}

export async function getFactor(id: string): Promise<FactorTask | null> {
  try {
    console.log(`Getting factor ${id} from v_success_factors_full view...`);
    const result = await db.execute(sql`
      SELECT id, title, description, tasks::text
      FROM v_success_factors_full
      WHERE id = ${id}
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log(`No factor found with ID ${id}`);
      return null;
    }

    // Get row directly from view and parse JSON tasks
    const row = result.rows[0];
    
    // Parse the JSON tasks string
    let parsedTasks;
    try {
      // Make sure tasks is a string before parsing
      if (typeof row.tasks === 'string') {
        parsedTasks = JSON.parse(row.tasks);
      } else {
        parsedTasks = row.tasks;
      }
    } catch (e) {
      console.error(`Error parsing tasks JSON for factor ${id}:`, e);
      // Provide default empty structure if parsing fails
      parsedTasks = {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
    }
    
    // Ensure each stage has a valid array, not null
    const tasksWithDefaults = {
      Identification: Array.isArray(parsedTasks.Identification) ? parsedTasks.Identification : [],
      Definition: Array.isArray(parsedTasks.Definition) ? parsedTasks.Definition : [],
      Delivery: Array.isArray(parsedTasks.Delivery) ? parsedTasks.Delivery : [],
      Closure: Array.isArray(parsedTasks.Closure) ? parsedTasks.Closure : []
    };
    
    const factor: FactorTask = {
      id: String(row.id),
      title: String(row.title),
      description: row.description ? String(row.description) : '',
      tasks: tasksWithDefaults
    };

    console.log(`Returning factor ${id} with tasks:`, JSON.stringify(factor.tasks, null, 2));
    return factor;
  } catch (error) {
    console.error(`Error loading factor ${id} from database:`, error);
    throw error;
  }
}

export async function createFactor(factorData: FactorTask): Promise<FactorTask> {
  try {
    // Make sure we have a valid ID
    if (!factorData.id) {
      factorData.id = uuidv4();
    }

    // Insert the factor
    await db.execute(sql`
      INSERT INTO success_factors (id, title, description)
      VALUES (${factorData.id}, ${factorData.title}, ${factorData.description || ''})
    `);

    // Insert tasks for each stage
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
    
    for (const stage of stages) {
      const tasks = factorData.tasks[stage] || [];
      
      for (const taskText of tasks) {
        await db.execute(sql`
          INSERT INTO success_factor_tasks (factor_id, stage, text)
          VALUES (${factorData.id}, ${stage}, ${taskText})
        `);
      }
    }

    // Return the newly created factor
    return await getFactor(factorData.id) as FactorTask;
  } catch (error) {
    console.error('Error creating factor:', error);
    throw error;
  }
}

export async function updateFactor(factorId: string, factorData: FactorTask): Promise<FactorTask> {
  try {
    // Update the factor
    await db.execute(sql`
      UPDATE success_factors
      SET title = ${factorData.title}, description = ${factorData.description || ''}
      WHERE id = ${factorId}
    `);

    // Delete existing tasks
    await db.execute(sql`
      DELETE FROM success_factor_tasks
      WHERE factor_id = ${factorId}
    `);

    // Insert updated tasks for each stage
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
    
    for (const stage of stages) {
      const tasks = factorData.tasks[stage] || [];
      
      for (const taskText of tasks) {
        await db.execute(sql`
          INSERT INTO success_factor_tasks (factor_id, stage, text)
          VALUES (${factorId}, ${stage}, ${taskText})
        `);
      }
    }

    // Return the updated factor
    return await getFactor(factorId) as FactorTask;
  } catch (error) {
    console.error(`Error updating factor ${factorId}:`, error);
    throw error;
  }
}

export async function deleteFactor(factorId: string): Promise<boolean> {
  try {
    // Delete tasks first (foreign key constraint)
    await db.execute(sql`
      DELETE FROM success_factor_tasks
      WHERE factor_id = ${factorId}
    `);

    // Delete the factor
    const result = await db.execute(sql`
      DELETE FROM success_factors
      WHERE id = ${factorId}
    `);

    return result.rowCount > 0;
  } catch (error) {
    console.error(`Error deleting factor ${factorId}:`, error);
    throw error;
  }
}

export async function saveFactors(factors: FactorTask[]): Promise<boolean> {
  try {
    // Start a transaction
    await db.execute(sql`BEGIN`);

    try {
      // Clear existing data
      await db.execute(sql`DELETE FROM success_factor_tasks`);
      await db.execute(sql`DELETE FROM success_factors`);

      // Insert new data
      for (const factor of factors) {
        await createFactor(factor);
      }

      // Commit the transaction
      await db.execute(sql`COMMIT`);
      return true;
    } catch (error) {
      // Rollback on error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }
  } catch (error) {
    console.error('Error saving factors:', error);
    throw error;
  }
}