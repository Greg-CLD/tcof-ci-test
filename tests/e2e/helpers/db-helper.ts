import { db } from '../../../db';
import { eq } from 'drizzle-orm';
import { successFactorRatings } from '../../../shared/schema';
import { PlanData } from '../../../shared/types/plan-types';

/**
 * Helper functions to query the database during E2E tests
 */
export const dbHelper = {
  /**
   * Get success factor ratings for a specific project
   */
  async getSuccessFactorRatings(projectId: number) {
    try {
      return await db.query.successFactorRatings.findMany({
        where: eq(successFactorRatings.projectId, projectId),
      });
    } catch (error) {
      console.error('Error fetching success factor ratings:', error);
      return [];
    }
  },

  /**
   * Get a plan for a specific project
   */
  async getPlan(projectId: number): Promise<PlanData | null> {
    try {
      const response = await fetch(`http://localhost:5000/api/plans/project/${projectId}`);
      
      if (!response.ok) {
        console.error(`Error fetching plan: ${response.status} ${response.statusText}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching plan:', error);
      return null;
    }
  },
  
  /**
   * Get personal heuristics for a specific project from the plan
   */
  async getPersonalHeuristics(projectId: number): Promise<Array<string | {id?: string, name: string, description?: string}>> {
    const plan = await this.getPlan(projectId);
    return plan?.blocks?.block1?.personalHeuristics || [];
  },
};