import { db } from './db';
import { sql, eq } from 'drizzle-orm';
import type { FactorTask } from '../scripts/factorUtils';
import { v4 as uuidv4 } from 'uuid';
import { convertToUuid } from './uuidUtils';

export async function getFactors(): Promise<FactorTask[]> {
  try {
    console.log("Getting all factors directly from database tables...");
    
    // First, get all the basic factor data
    const factorsResult = await db.execute(sql`
      SELECT id, title, description
      FROM success_factors
      ORDER BY id
    `);

    if (!factorsResult.rows || factorsResult.rows.length === 0) {
      console.log("No factors found in database");
      return [];
    }

    console.log(`Found ${factorsResult.rows.length} base factors in the database`);
    
    // Then get all tasks for all factors
    const tasksResult = await db.execute(sql`
      SELECT factor_id, stage, text
      FROM success_factor_tasks
      WHERE text IS NOT NULL AND text <> ''
      ORDER BY factor_id, stage, "order"
    `);
    
    console.log(`Found ${tasksResult.rows.length} task entries in the database`);
    
    // Group tasks by factor_id and stage
    const tasksByFactor: Record<string, Record<string, string[]>> = {};
    
    // Initialize empty task structures for all factors
    for (const factor of factorsResult.rows) {
      const factorId = String(factor.id);
      tasksByFactor[factorId] = {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
    }
    
    // Populate tasks from database results
    for (const task of tasksResult.rows) {
      const factorId = String(task.factor_id);
      const stage = String(task.stage);
      const text = String(task.text);
      
      if (tasksByFactor[factorId] && 
          text.trim() !== '') {
        
        // Make sure the stage exists in our structure
        if (!tasksByFactor[factorId][stage]) {
          tasksByFactor[factorId][stage] = [];
        }
        
        // Add the task text to the appropriate array
        tasksByFactor[factorId][stage].push(text);
      }
    }
    
    // Combine factor data with task data
    const factors: FactorTask[] = factorsResult.rows.map((row: any) => {
      const rawFactorId = String(row.id);
      const factorTasksRecord = tasksByFactor[rawFactorId] || {};
      
      // Convert "sf-#" ID to UUID format
      const factorId = convertToUuid(rawFactorId);
      console.log(`Factor ID conversion: ${rawFactorId} -> ${factorId}`);
      
      // Ensure we have a properly structured tasks object that matches FactorTask
      const typedTasks = {
        Identification: factorTasksRecord.Identification || [],
        Definition: factorTasksRecord.Definition || [],
        Delivery: factorTasksRecord.Delivery || [],
        Closure: factorTasksRecord.Closure || []
      };
      
      return {
        id: factorId, // Use the converted UUID
        // Keep the original ID for database references
        originalId: rawFactorId,
        title: String(row.title),
        description: row.description ? String(row.description) : '',
        tasks: typedTasks
      };
    });
    
    console.log(`Returning ${factors.length} factors with tasks from direct DB query`);
    
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
    // If the ID is a UUID format, we need to locate the original "sf-#" format ID
    // to query the database, as the database still uses the original format
    let dbQueryId = id;
    
    // Check if this is a UUID trying to access a success factor
    // In this case, we need to find which "sf-#" ID it corresponds to
    if (isValidUuid(id)) {
      console.log(`Received UUID format ID: ${id}, attempting to find original ID`);
      
      // First try to get the original ID directly from our mapping
      const originalId = getOriginalId(id);
      
      // If we found a mapping (different from the input UUID)
      if (originalId !== id) {
        dbQueryId = originalId;
        console.log(`Found mapping for original ID: ${dbQueryId} for UUID: ${id}`);
      } else {
        // If no direct mapping, check all factors as a fallback
        console.log(`No direct mapping found for UUID: ${id}, checking all factors...`);
        
        // Get all factors to find which one has this UUID
        const allFactors = await getFactors();
        const matchingFactor = allFactors.find(f => f.id === id);
        
        if (matchingFactor && matchingFactor.originalId) {
          dbQueryId = matchingFactor.originalId;
          console.log(`Found matching original ID: ${dbQueryId} for UUID: ${id}`);
        } else {
          console.log(`No matching original ID found for UUID: ${id}, using as-is`);
        }
      }
    }
    
    console.log(`Getting factor with database ID ${dbQueryId} from database tables...`);
    
    // First, get the basic factor data
    const factorResult = await db.execute(sql`
      SELECT id, title, description
      FROM success_factors
      WHERE id = ${dbQueryId}
    `);

    if (!factorResult.rows || factorResult.rows.length === 0) {
      console.log(`No factor found with ID ${dbQueryId}`);
      return null;
    }

    const factorRow = factorResult.rows[0];
    
    // Then get all tasks for this factor
    const tasksResult = await db.execute(sql`
      SELECT stage, text
      FROM success_factor_tasks
      WHERE factor_id = ${dbQueryId}
      AND text IS NOT NULL AND text <> ''
      ORDER BY stage, "order"
    `);
    
    console.log(`Found ${tasksResult.rows.length} task entries for factor ${dbQueryId}`);
    
    // Initialize empty task structure
    const tasks = {
      Identification: [] as string[],
      Definition: [] as string[],
      Delivery: [] as string[],
      Closure: [] as string[]
    };
    
    // Populate tasks from database results
    for (const task of tasksResult.rows) {
      if (typeof task.stage === 'string' && 
          typeof task.text === 'string' &&
          task.text.trim() !== '') {
        
        // Make sure the stage exists in our structure
        if (tasks[task.stage as keyof typeof tasks]) {
          // Add the task text to the appropriate array
          tasks[task.stage as keyof typeof tasks].push(task.text);
        }
      }
    }
    
    // Get the original ID from the database
    const rawFactorId = String(factorRow.id);
    
    // Convert to UUID for external use
    const factorUuid = convertToUuid(rawFactorId);
    console.log(`Factor ID conversion: ${rawFactorId} -> ${factorUuid}`);
    
    const factor: FactorTask = {
      id: factorUuid, // Use the UUID format
      originalId: rawFactorId, // Keep the original ID for reference
      title: String(factorRow.title),
      description: factorRow.description ? String(factorRow.description) : '',
      tasks: tasks
    };

    console.log(`Returning factor ${factorUuid} with tasks:`, JSON.stringify(factor.tasks, null, 2));
    return factor;
  } catch (error) {
    console.error(`Error loading factor ${id} from database:`, error);
    throw error;
  }
}

export async function createFactor(factorData: FactorTask): Promise<FactorTask> {
  try {
    // Handle possible incoming UUID format IDs
    let dbFactorId = factorData.id;
    
    // If the incoming ID is a UUID and not a "sf-#" format ID, we need to
    // generate a new sf-# ID for database storage, but keep track of the relation
    if (dbFactorId && dbFactorId.includes('-') && dbFactorId.length === 36) {
      // This is a UUID, likely coming from client-side
      console.log(`Incoming UUID format ID in createFactor: ${dbFactorId}`);
      
      // Check if we have an originalId to use
      if (factorData.originalId) {
        dbFactorId = factorData.originalId;
        console.log(`Using provided original ID: ${dbFactorId}`);
      } else {
        // Generate a new "sf-#" ID
        // Get the highest current sf-# and increment
        const result = await db.execute(sql`
          SELECT id FROM success_factors 
          WHERE id LIKE 'sf-%' 
          ORDER BY id DESC LIMIT 1
        `);
        
        if (result.rows && result.rows.length > 0) {
          const lastId = result.rows[0].id;
          const lastNum = parseInt(lastId.replace('sf-', ''));
          dbFactorId = `sf-${lastNum + 1}`;
        } else {
          // No existing factors, start with sf-1
          dbFactorId = 'sf-1';
        }
        
        console.log(`Generated new original ID: ${dbFactorId} for UUID: ${factorData.id}`);
      }
    }
    
    // Make sure we have a valid ID
    if (!dbFactorId) {
      dbFactorId = `sf-${Date.now()}`;
    }

    console.log(`Creating factor with database ID: ${dbFactorId}`);
    
    // Insert the factor
    await db.execute(sql`
      INSERT INTO success_factors (id, title, description)
      VALUES (${dbFactorId}, ${factorData.title}, ${factorData.description || ''})
    `);

    // Insert tasks for each stage
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
    
    for (const stage of stages) {
      const tasks = factorData.tasks[stage] || [];
      
      for (const taskText of tasks) {
        await db.execute(sql`
          INSERT INTO success_factor_tasks (factor_id, stage, text)
          VALUES (${dbFactorId}, ${stage}, ${taskText})
        `);
      }
    }

    // Return the newly created factor (will be converted to UUID format)
    return await getFactor(dbFactorId) as FactorTask;
  } catch (error) {
    console.error('Error creating factor:', error);
    throw error;
  }
}

export async function updateFactor(factorId: string, factorData: FactorTask): Promise<FactorTask> {
  try {
    // Handle UUID vs original ID format for database operations
    let dbFactorId = factorId;
    
    // If this is a UUID, convert to the original ID format for database operations
    if (factorId.includes('-') && factorId.length === 36) {
      console.log(`Received UUID format ID for update: ${factorId}, attempting to find original ID`);
      
      // Check if factorData has originalId
      if (factorData.originalId) {
        dbFactorId = factorData.originalId;
        console.log(`Using provided original ID: ${dbFactorId} for UUID: ${factorId}`);
      } else {
        // Get all factors to find which one has this UUID
        const allFactors = await getFactors();
        const matchingFactor = allFactors.find(f => f.id === factorId);
        
        if (matchingFactor && matchingFactor.originalId) {
          dbFactorId = matchingFactor.originalId;
          console.log(`Found matching original ID: ${dbFactorId} for UUID: ${factorId}`);
        } else {
          console.log(`No matching original ID found for UUID: ${factorId}, using as-is (may fail)`);
        }
      }
    }
    
    console.log(`Updating factor with database ID: ${dbFactorId}`);
    
    // Update the factor
    await db.execute(sql`
      UPDATE success_factors
      SET title = ${factorData.title}, description = ${factorData.description || ''}
      WHERE id = ${dbFactorId}
    `);

    // Delete existing tasks
    await db.execute(sql`
      DELETE FROM success_factor_tasks
      WHERE factor_id = ${dbFactorId}
    `);

    // Insert updated tasks for each stage
    const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
    
    for (const stage of stages) {
      const tasks = factorData.tasks[stage] || [];
      
      for (let i = 0; i < tasks.length; i++) {
        const taskText = tasks[i];
        await db.execute(sql`
          INSERT INTO success_factor_tasks (factor_id, stage, text, "order")
          VALUES (${dbFactorId}, ${stage}, ${taskText}, ${i})
        `);
      }
    }

    // Return the updated factor (will be converted to UUID format)
    return await getFactor(dbFactorId) as FactorTask;
  } catch (error) {
    console.error(`Error updating factor ${factorId}:`, error);
    throw error;
  }
}

export async function deleteFactor(factorId: string): Promise<boolean> {
  try {
    // Handle UUID vs original ID format for database operations
    let dbFactorId = factorId;
    
    // If this is a UUID, convert to the original ID format for database operations
    if (factorId.includes('-') && factorId.length === 36) {
      console.log(`Received UUID format ID for delete: ${factorId}, attempting to find original ID`);
      
      // Get all factors to find which one has this UUID
      const allFactors = await getFactors();
      const matchingFactor = allFactors.find(f => f.id === factorId);
      
      if (matchingFactor && matchingFactor.originalId) {
        dbFactorId = matchingFactor.originalId;
        console.log(`Found matching original ID: ${dbFactorId} for UUID: ${factorId}`);
      } else {
        console.log(`No matching original ID found for UUID: ${factorId}, using as-is (may fail)`);
      }
    }
    
    console.log(`Deleting factor with database ID: ${dbFactorId}`);
    
    // Delete tasks first (foreign key constraint)
    await db.execute(sql`
      DELETE FROM success_factor_tasks
      WHERE factor_id = ${dbFactorId}
    `);

    // Delete the factor
    const result = await db.execute(sql`
      DELETE FROM success_factors
      WHERE id = ${dbFactorId}
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