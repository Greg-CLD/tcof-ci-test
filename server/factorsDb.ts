import { db } from './db';
import { sql, eq } from 'drizzle-orm';
import type { FactorTask } from '../scripts/factorUtils';
import { v4 as uuidv4 } from 'uuid';

export async function getFactors(): Promise<FactorTask[]> {
  try {
    console.log("Getting all factors from database...");
    const result = await db.execute(sql`
      SELECT f.id, f.title, f.description,
             ft.stage, ft.text
      FROM success_factors f
      LEFT JOIN success_factor_tasks ft ON f.id = ft.factor_id
      ORDER BY f.id, ft.stage
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log("No factors found in database");
      return [];
    }

    console.log(`Found ${result.rows.length} factor-task rows in the database`);
    
    // Log first row as example
    if (result.rows.length > 0) {
      console.log("Sample row:", JSON.stringify(result.rows[0], null, 2));
    }

    // Group tasks by factor and stage
    const factorMap = new Map<string, FactorTask>();

    result.rows.forEach((row: any) => {
      if (!factorMap.has(row.id)) {
        console.log(`Creating new factor entry for factor ID: ${row.id}`);
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
        console.log(`Adding task "${row.text}" to stage "${row.stage}" for factor ${row.id}`);
        factor.tasks[row.stage as keyof typeof factor.tasks].push(row.text);
      } else if (row.stage) {
        console.log(`WARNING: Missing text for task in stage "${row.stage}" for factor ${row.id}`);
      } else if (row.text) {
        console.log(`WARNING: Missing stage for task text "${row.text}" for factor ${row.id}`);
      }
    });

    const factors = Array.from(factorMap.values());
    console.log(`Returning ${factors.length} factors with tasks`);
    
    // Debug log the first factor and its tasks
    if (factors.length > 0) {
      console.log("Sample factor with tasks:", JSON.stringify(factors[0], null, 2));
    }
    
    return factors;
  } catch (error) {
    console.error('Error loading factors from database:', error);
    throw error;
  }
}

export async function getFactor(id: string): Promise<FactorTask | null> {
  try {
    const result = await db.execute(sql`
      SELECT f.id, f.title, f.description,
             ft.stage, ft.text
      FROM success_factors f
      LEFT JOIN success_factor_tasks ft ON f.id = ft.factor_id
      WHERE f.id = ${id}
      ORDER BY ft.stage
    `);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const factor: FactorTask = {
      id: String(result.rows[0].id),
      title: String(result.rows[0].title),
      description: result.rows[0].description ? String(result.rows[0].description) : '',
      tasks: {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      }
    };

    result.rows.forEach((row: any) => {
      if (row.stage && row.text) {
        factor.tasks[row.stage as keyof typeof factor.tasks].push(row.text);
      }
    });

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