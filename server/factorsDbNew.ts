import { db } from "./db";
import {
  successFactors,
  successFactorTasks,
  stageEnum,
  type SuccessFactorWithTasks
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Interface for compatibility with existing code
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

// Helper function to transform database data to the expected format
const transformToFactorTask = async (factor: any): Promise<FactorTask> => {
  // Fetch tasks for this factor
  const tasks = await db.select()
    .from(successFactorTasks)
    .where(eq(successFactorTasks.factorId, factor.id))
    .orderBy(successFactorTasks.stage, successFactorTasks.order);

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
    },
    createdAt: factor.createdAt?.toISOString(),
    updatedAt: factor.updatedAt?.toISOString()
  };
};

// Database operations
export const factorsDb = {
  length: 0, // This will be updated on first getAll() call

  async getAll(): Promise<FactorTask[]> {
    try {
      // Fetch all factors
      const factors = await db.select().from(successFactors);
      this.length = factors.length;

      // Transform each factor
      const transformedFactors = await Promise.all(
        factors.map(factor => transformToFactorTask(factor))
      );

      return transformedFactors;
    } catch (error) {
      console.error("Error fetching success factors:", error);
      return [];
    }
  },

  async setAll(factors: FactorTask[]): Promise<void> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Clear existing data if needed
        // Note: We don't completely clear the tables to avoid data loss
        // The seed script should handle updates to existing records

        // Process each factor
        for (const factor of factors) {
          // Check if factor exists
          const existingFactor = await tx.select()
            .from(successFactors)
            .where(eq(successFactors.id, factor.id));

          if (existingFactor.length === 0) {
            // Insert new factor
            await tx.insert(successFactors).values({
              id: factor.id,
              title: factor.title,
              description: factor.description || '',
              updatedAt: new Date()
            });
          } else {
            // Update existing factor
            await tx.update(successFactors)
              .set({
                title: factor.title,
                description: factor.description || '',
                updatedAt: new Date()
              })
              .where(eq(successFactors.id, factor.id));
          }

          // Delete existing tasks for this factor
          await tx.delete(successFactorTasks)
            .where(eq(successFactorTasks.factorId, factor.id));

          // Insert tasks for each stage
          const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
          for (const stage of stages) {
            const tasks = factor.tasks[stage] || [];
            for (let i = 0; i < tasks.length; i++) {
              const task = tasks[i];
              if (task && task.trim()) {
                await tx.insert(successFactorTasks).values({
                  factorId: factor.id,
                  stage: stage,
                  text: task,
                  order: i,
                  updatedAt: new Date()
                });
              }
            }
          }
        }
      });

      // Update length property after setting all factors
      const count = await db.select({ count: sql`count(*)` }).from(successFactors);
      this.length = Number(count[0]?.count || 0);
    } catch (error) {
      console.error("Error updating success factors:", error);
      throw error;
    }
  },

  async add(factor: FactorTask): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // Insert the factor
        await tx.insert(successFactors).values({
          id: factor.id,
          title: factor.title,
          description: factor.description || '',
          updatedAt: new Date()
        });

        // Insert tasks for each stage
        const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
        for (const stage of stages) {
          const tasks = factor.tasks[stage] || [];
          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task && task.trim()) {
              await tx.insert(successFactorTasks).values({
                factorId: factor.id,
                stage: stage,
                text: task,
                order: i,
                updatedAt: new Date()
              });
            }
          }
        }
      });

      // Update length property
      const count = await db.select({ count: sql`count(*)` }).from(successFactors);
      this.length = Number(count[0]?.count || 0);
    } catch (error) {
      console.error("Error adding success factor:", error);
      throw error;
    }
  },

  async findById(id: string): Promise<FactorTask | undefined> {
    try {
      const [factor] = await db.select().from(successFactors).where(eq(successFactors.id, id));
      
      if (!factor) {
        return undefined;
      }

      return await transformToFactorTask(factor);
    } catch (error) {
      console.error(`Error finding success factor with ID ${id}:`, error);
      return undefined;
    }
  },

  async removeById(id: string): Promise<boolean> {
    try {
      // Because of cascade delete, we only need to delete the factor
      const result = await db.delete(successFactors).where(eq(successFactors.id, id));
      
      // Update length property
      const count = await db.select({ count: sql`count(*)` }).from(successFactors);
      this.length = Number(count[0]?.count || 0);
      
      return true; // Success regardless of whether anything was deleted
    } catch (error) {
      console.error(`Error removing success factor with ID ${id}:`, error);
      return false;
    }
  },

  async updateById(id: string, updatedFactor: FactorTask): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Update the factor
        await tx.update(successFactors)
          .set({
            title: updatedFactor.title,
            description: updatedFactor.description || '',
            updatedAt: new Date()
          })
          .where(eq(successFactors.id, id));

        // Delete existing tasks
        await tx.delete(successFactorTasks).where(eq(successFactorTasks.factorId, id));

        // Insert updated tasks for each stage
        const stages = ['Identification', 'Definition', 'Delivery', 'Closure'] as const;
        for (const stage of stages) {
          const tasks = updatedFactor.tasks[stage] || [];
          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (task && task.trim()) {
              await tx.insert(successFactorTasks).values({
                factorId: id,
                stage: stage,
                text: task,
                order: i,
                updatedAt: new Date()
              });
            }
          }
        }
      });

      return true;
    } catch (error) {
      console.error(`Error updating success factor with ID ${id}:`, error);
      return false;
    }
  },

  async clear(): Promise<void> {
    try {
      // This is a destructive operation, so we should be cautious
      // For safety, we'll only allow this in development
      if (process.env.NODE_ENV !== 'development') {
        console.warn("clear() is only allowed in development mode");
        return;
      }

      await db.transaction(async (tx) => {
        // Due to foreign key constraints, we need to delete tasks first
        await tx.delete(successFactorTasks);
        await tx.delete(successFactors);
      });

      this.length = 0;
    } catch (error) {
      console.error("Error clearing success factors:", error);
      throw error;
    }
  },

  // Additional helper methods for the new database-backed implementation

  /**
   * Get a success factor with its tasks in the format expected by the API
   */
  async getFactorWithTasks(id: string): Promise<SuccessFactorWithTasks | undefined> {
    try {
      const factor = await this.findById(id);
      if (!factor) return undefined;
      
      return {
        id: factor.id,
        title: factor.title,
        description: factor.description || '',
        tasks: factor.tasks
      };
    } catch (error) {
      console.error(`Error getting factor with tasks for ID ${id}:`, error);
      return undefined;
    }
  }
};