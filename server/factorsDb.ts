import { db } from './db';
import { sql, eq } from 'drizzle-orm';
import type { FactorTask } from '../scripts/factorUtils';
import { v4 as uuidv4 } from 'uuid';

export async function getFactors(): Promise<FactorTask[]> {
  try {
    console.log("Getting all factors from database using v_success_factors_full view...");
    const result = await db.execute(sql`
      SELECT id, title, description, tasks
      FROM v_success_factors_full
      ORDER BY id
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("No factors found in database");
      return [];
    }

    console.log(`Found ${result.rows.length} factors in the database`);
    
    // Log first row as example
    if (result.rows.length > 0) {
      console.log("Sample factor:", JSON.stringify(result.rows[0], null, 2));
    }

    // Map directly to FactorTask objects
    const factors = result.rows.map((row: any) => {
      console.log(`Raw row.tasks type: ${typeof row.tasks}`);
      
      // For debugging - let's see what's in the tasks field
      if (typeof row.tasks === 'string') {
        console.log(`Tasks is a string for factor ${row.id}, attempting to parse JSON`);
        try {
          row.tasks = JSON.parse(row.tasks);
        } catch (e) {
          console.error(`Failed to parse tasks JSON for factor ${row.id}:`, e);
        }
      }
      
      // More debugging
      if (row.tasks) {
        console.log(`Tasks property types for factor ${row.id}:`);
        for (const stage of ['Identification', 'Definition', 'Delivery', 'Closure']) {
          console.log(`- ${stage}: ${Array.isArray(row.tasks[stage]) ? 'array' : typeof row.tasks[stage]}`);
          if (Array.isArray(row.tasks[stage]) && row.tasks[stage].length > 0) {
            console.log(`  Example task: ${typeof row.tasks[stage][0]} - ${row.tasks[stage][0]}`);
          }
        }
      }
      
      // Ensure each stage has a valid array
      const taskObject = {
        Identification: Array.isArray(row.tasks?.Identification) ? row.tasks.Identification.filter(Boolean) : [],
        Definition: Array.isArray(row.tasks?.Definition) ? row.tasks.Definition.filter(Boolean) : [],
        Delivery: Array.isArray(row.tasks?.Delivery) ? row.tasks.Delivery.filter(Boolean) : [],
        Closure: Array.isArray(row.tasks?.Closure) ? row.tasks.Closure.filter(Boolean) : []
      };
      
      return {
        id: String(row.id),
        title: String(row.title),
        description: row.description ? String(row.description) : '',
        tasks: taskObject
      };
    });
    
    console.log(`Returning ${factors.length} factors with tasks`);
    
    // Debug log the first factor and its tasks
    if (factors.length > 0) {
      const sampleFactor = factors[0];
      console.log("Sample factor with tasks:", JSON.stringify(sampleFactor, null, 2));
      
      // Check the task structure of the returned sample
      const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
      for (const stage of stages) {
        console.log(`VERIFY: Stage ${stage} has ${sampleFactor.tasks[stage].length} tasks`);
      }
    }
    
    return factors;
  } catch (error) {
    console.error('Error loading factors from database:', error);
    throw error;
  }
}

export async function getFactor(id: string): Promise<FactorTask | null> {
  try {
    console.log(`Getting factor ${id} from database using v_success_factors_full view...`);
    const result = await db.execute(sql`
      SELECT id, title, description, tasks
      FROM v_success_factors_full
      WHERE id = ${id}
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log(`No factor found with ID ${id}`);
      return null;
    }

    // Map directly to FactorTask object
    const row = result.rows[0];
    const factor: FactorTask = {
      id: String(row.id),
      title: String(row.title),
      description: row.description ? String(row.description) : '',
      tasks: row.tasks as {
        Identification: string[];
        Definition: string[];
        Delivery: string[];
        Closure: string[];
      }
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