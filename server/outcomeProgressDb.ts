import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { outcomes, outcomeProgress } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// Interface for outcome objects
export interface Outcome {
  id: string;
  title: string;
  description?: string;
  level: string;
  isCustom: boolean;
  createdByUserId?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for outcome progress objects
export interface OutcomeProgress {
  id: string;
  projectId: string;
  outcomeId: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

// Outcome database operations
export const outcomesDb = {
  // Get all standard outcomes (non-custom)
  async getStandardOutcomes(): Promise<Outcome[]> {
    try {
      const results = await db.select().from(outcomes).where(eq(outcomes.isCustom, false));
      return results.map(outcome => ({
        ...outcome,
        description: outcome.description || undefined, // Convert null to undefined
        isCustom: outcome.isCustom === null ? false : outcome.isCustom
      })) as Outcome[];
    } catch (error) {
      console.error('Error getting standard outcomes:', error);
      return [];
    }
  },
  
  // Get custom outcomes for a specific user
  async getCustomOutcomesByUserId(userId: number): Promise<Outcome[]> {
    try {
      const results = await db.select().from(outcomes)
        .where(and(
          eq(outcomes.isCustom, true),
          eq(outcomes.createdByUserId, userId)
        ));
      
      return results.map(outcome => ({
        ...outcome,
        description: outcome.description || undefined, // Convert null to undefined
        isCustom: outcome.isCustom === null ? true : outcome.isCustom
      })) as Outcome[];
    } catch (error) {
      console.error('Error getting custom outcomes by user ID:', error);
      return [];
    }
  },
  
  // Get a specific outcome by ID
  async getOutcomeById(id: string): Promise<Outcome | undefined> {
    try {
      const [result] = await db.select().from(outcomes).where(eq(outcomes.id, id));
      
      if (!result) return undefined;
      
      return {
        ...result,
        description: result.description || undefined, // Convert null to undefined
        isCustom: result.isCustom === null ? false : result.isCustom
      } as Outcome;
    } catch (error) {
      console.error('Error getting outcome by ID:', error);
      return undefined;
    }
  },
  
  // Create a new custom outcome
  async createCustomOutcome(title: string, userId: number, description?: string): Promise<Outcome | null> {
    try {
      const [result] = await db.insert(outcomes).values({
        id: uuidv4(),
        title,
        description,
        level: 'custom',
        isCustom: true,
        createdByUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      if (!result) return null;
      
      return {
        ...result,
        description: result.description || undefined, // Convert null to undefined
        isCustom: result.isCustom === null ? true : result.isCustom
      } as Outcome;
    } catch (error) {
      console.error('Error creating custom outcome:', error);
      return null;
    }
  },
  
  // Delete a custom outcome
  async deleteCustomOutcome(id: string, userId: number): Promise<boolean> {
    try {
      // Only allow deletion if the outcome is custom and created by this user
      const [outcome] = await db.select().from(outcomes).where(
        and(
          eq(outcomes.id, id),
          eq(outcomes.isCustom, true),
          eq(outcomes.createdByUserId, userId)
        )
      );
      
      if (!outcome) {
        return false;
      }
      
      // Delete the outcome
      await db.delete(outcomes).where(eq(outcomes.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting custom outcome:', error);
      return false;
    }
  }
};

// Outcome progress database operations
export const outcomeProgressDb = {
  // Get all progress entries for a specific project
  async getProgressByProjectId(projectId: string): Promise<OutcomeProgress[]> {
    try {
      return await db.select().from(outcomeProgress)
        .where(eq(outcomeProgress.projectId, projectId))
        .orderBy(desc(outcomeProgress.updatedAt));
    } catch (error) {
      console.error('Error getting outcome progress by project ID:', error);
      return [];
    }
  },
  
  // Get the latest progress for each outcome in a project
  async getLatestProgressByProjectId(projectId: string): Promise<Record<string, OutcomeProgress>> {
    try {
      const allProgress = await db.select().from(outcomeProgress)
        .where(eq(outcomeProgress.projectId, projectId))
        .orderBy(desc(outcomeProgress.updatedAt));
      
      // Group by outcomeId and keep only the latest entry for each
      const latestByOutcome: Record<string, OutcomeProgress> = {};
      
      for (const progress of allProgress) {
        if (!latestByOutcome[progress.outcomeId]) {
          latestByOutcome[progress.outcomeId] = progress;
        }
      }
      
      return latestByOutcome;
    } catch (error) {
      console.error('Error getting latest outcome progress by project ID:', error);
      return {};
    }
  },
  
  // Update or create progress for an outcome in a project
  async updateOutcomeProgress(projectId: string, outcomeId: string, value: number): Promise<OutcomeProgress | null> {
    try {
      // Create a new progress entry
      const [progress] = await db.insert(outcomeProgress).values({
        id: uuidv4(),
        projectId,
        outcomeId,
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return progress;
    } catch (error) {
      console.error('Error updating outcome progress:', error);
      return null;
    }
  },
  
  // Delete all progress entries for a specific outcome in a project
  async deleteOutcomeProgress(projectId: string, outcomeId: string): Promise<boolean> {
    try {
      await db.delete(outcomeProgress).where(
        and(
          eq(outcomeProgress.projectId, projectId),
          eq(outcomeProgress.outcomeId, outcomeId)
        )
      );
      return true;
    } catch (error) {
      console.error('Error deleting outcome progress:', error);
      return false;
    }
  },
  
  // Delete all progress entries for a project (e.g., when deleting a project)
  async deleteAllProjectProgress(projectId: string): Promise<boolean> {
    try {
      await db.delete(outcomeProgress).where(eq(outcomeProgress.projectId, projectId));
      return true;
    } catch (error) {
      console.error('Error deleting all project progress:', error);
      return false;
    }
  }
};