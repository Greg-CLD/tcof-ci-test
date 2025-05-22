/**
 * Unit Test for Success Factor Cloning
 * 
 * This test verifies that the cloneSuccessFactorsToProject function works correctly
 * to ensure every canonical Success Factor item exists in project_tasks.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../server/db';
import { eq, and } from 'drizzle-orm';
import { projectTasks } from '@shared/schema';
import * as factorsDb from '../server/factorsDb';
import { cloneSuccessFactorsToProject } from '../server/cloneSuccessFactors';

describe('Success Factor Cloning', () => {
  let testProjectId: string;
  
  beforeAll(async () => {
    // Create a random ID for our test project
    testProjectId = uuidv4();
    console.log(`Created test project ID: ${testProjectId}`);
  });
  
  afterAll(async () => {
    // Clean up any test tasks created
    await db.delete(projectTasks)
      .where(eq(projectTasks.projectId, testProjectId))
      .execute();
    console.log(`Cleaned up test project tasks for ID: ${testProjectId}`);
  });
  
  it('clones all canonical Success Factors to project_tasks', async () => {
    // Get the expected factor count for comparison
    const successFactors = await factorsDb.getFactors();
    
    // Count how many tasks there should be (across all factors and stages)
    let expectedTaskCount = 0;
    for (const factor of successFactors) {
      for (const stage of Object.keys(factor.tasks)) {
        const stageTasks = factor.tasks[stage as keyof typeof factor.tasks] || [];
        expectedTaskCount += stageTasks.length;
      }
    }
    
    console.log(`Expecting ${expectedTaskCount} tasks from ${successFactors.length} factors`);
    
    // Run the cloning function
    const createdTaskCount = await cloneSuccessFactorsToProject(testProjectId);
    
    // Verify the correct number of tasks were created
    expect(createdTaskCount).toBeGreaterThan(0);
    expect(createdTaskCount).toBe(expectedTaskCount);
    
    // Verify tasks exist in DB with correct attributes
    const savedTasks = await db.select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, testProjectId))
      .execute();
    
    expect(savedTasks.length).toBe(expectedTaskCount);
    
    // Verify each task has the correct properties
    const factorTask = savedTasks.find(task => task.origin === 'factor');
    expect(factorTask).toBeDefined();
    expect(factorTask?.source).toBe('factor');
    expect(factorTask?.sourceId).toBeDefined();
    expect(factorTask?.completed).toBe(false);
    
    // Delete one task to test backfill
    if (factorTask) {
      await db.delete(projectTasks)
        .where(
          and(
            eq(projectTasks.projectId, testProjectId),
            eq(projectTasks.id, factorTask.id)
          )
        )
        .execute();
      
      console.log(`Deleted task with ID ${factorTask.id} to test backfill`);
      
      // Verify task was deleted
      const tasksAfterDelete = await db.select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, testProjectId))
        .execute();
      
      expect(tasksAfterDelete.length).toBe(expectedTaskCount - 1);
      
      // Run cloning again - should add only the missing task
      const backfilledCount = await cloneSuccessFactorsToProject(testProjectId);
      expect(backfilledCount).toBe(1);
      
      // Verify all tasks are now present
      const tasksAfterBackfill = await db.select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, testProjectId))
        .execute();
      
      expect(tasksAfterBackfill.length).toBe(expectedTaskCount);
    }
  });
});