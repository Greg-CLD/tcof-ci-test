/**
 * Task Boundary Integration Test
 * 
 * This test verifies that the system correctly enforces project boundaries when looking up tasks by sourceId.
 * It demonstrates the fix for the Success Factor task toggle persistence bug where tasks were updated in the wrong project.
 */

import { getTaskIdResolver } from '../../server/services/taskIdResolver';
import { projectsDb } from '../../server/projectsDb';
import { db } from '../../server/db';
import { projectTasks as projectTasksTable } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper to create a canonical Success Factor source ID
// Format matches those in the `factors` table
const createCanonicalSourceId = () => {
  return uuidv4();
};

describe('Task Boundary Enforcement', () => {
  const resolver = getTaskIdResolver(projectsDb);
  
  // Test data for the two projects
  let projectA: string;
  let projectB: string;
  let sharedSourceId: string;
  let taskIdInProjectA: string;
  let taskIdInProjectB: string;
  
  // Setup: Create two projects and add tasks with the same sourceId to both
  beforeAll(async () => {
    // Create canonical sourceId that will be shared between projects
    sharedSourceId = createCanonicalSourceId();
    
    // Create Project A
    const projectAData = await projectsDb.createProject(3, { name: 'Task Boundary Test Project A' });
    projectA = projectAData.id;
    
    // Create Project B
    const projectBData = await projectsDb.createProject(3, { name: 'Task Boundary Test Project B' });
    projectB = projectBData.id;
    
    // Create a task in Project A with the shared sourceId
    const taskA = {
      projectId: projectA,
      text: 'Test task in Project A',
      origin: 'factor',
      source: 'factor',
      sourceId: sharedSourceId,
      completed: false
    };
    
    const resultA = await db.insert(projectTasksTable)
      .values(taskA)
      .returning();
    
    taskIdInProjectA = resultA[0].id;
    
    // Create a task in Project B with the same sourceId
    const taskB = {
      projectId: projectB,
      text: 'Test task in Project B',
      origin: 'factor',
      source: 'factor',
      sourceId: sharedSourceId,
      completed: false
    };
    
    const resultB = await db.insert(projectTasksTable)
      .values(taskB)
      .returning();
    
    taskIdInProjectB = resultB[0].id;
  });
  
  // Cleanup: Remove test data
  afterAll(async () => {
    // Remove the test tasks
    await db.delete(projectTasksTable)
      .where(eq(projectTasksTable.id, taskIdInProjectA));
    
    await db.delete(projectTasksTable)
      .where(eq(projectTasksTable.id, taskIdInProjectB));
    
    // Clear any caches
    resolver.clearCache();
  });
  
  it('should find a task by sourceId only in the specified project', async () => {
    // Try to find the task by sourceId in Project A
    const taskInProjectA = await resolver.findTaskById(sharedSourceId, projectA);
    
    // Verify the task is found and belongs to Project A
    expect(taskInProjectA).toBeDefined();
    expect(taskInProjectA.projectId).toBe(projectA);
    expect(taskInProjectA.id).toBe(taskIdInProjectA);
    expect(taskInProjectA.sourceId).toBe(sharedSourceId);
    
    // Try to find the task by sourceId in Project B
    const taskInProjectB = await resolver.findTaskById(sharedSourceId, projectB);
    
    // Verify the task is found and belongs to Project B
    expect(taskInProjectB).toBeDefined();
    expect(taskInProjectB.projectId).toBe(projectB);
    expect(taskInProjectB.id).toBe(taskIdInProjectB);
    expect(taskInProjectB.sourceId).toBe(sharedSourceId);
    
    // Verify the tasks found in Project A and B are different
    expect(taskInProjectA.id).not.toBe(taskInProjectB.id);
  });
  
  it('should not find a task from another project by real ID', async () => {
    // Try to find Project A's task in Project B (by task ID)
    // This should fail with TASK_NOT_FOUND since it enforces project boundaries
    await expect(resolver.findTaskById(taskIdInProjectA, projectB))
      .rejects
      .toThrow('Task not found');
  });
  
  it('should update a task without affecting tasks in other projects', async () => {
    // Original completion state for both tasks (should be false)
    const taskA = await projectsDb.getTaskById(projectA, taskIdInProjectA);
    const taskB = await projectsDb.getTaskById(projectB, taskIdInProjectB);
    expect(taskA.completed).toBe(false);
    expect(taskB.completed).toBe(false);
    
    // Update task in Project A
    await db.update(projectTasksTable)
      .set({ completed: true })
      .where(and(
        eq(projectTasksTable.id, taskIdInProjectA),
        eq(projectTasksTable.projectId, projectA)
      ));
    
    // Get the tasks again
    const updatedTaskA = await projectsDb.getTaskById(projectA, taskIdInProjectA);
    const updatedTaskB = await projectsDb.getTaskById(projectB, taskIdInProjectB);
    
    // Task in Project A should be updated
    expect(updatedTaskA.completed).toBe(true);
    
    // Task in Project B should remain unchanged
    expect(updatedTaskB.completed).toBe(false);
  });
  
  it('should update a task by sourceId only in the specified project', async () => {
    // Reset task A to not completed
    await db.update(projectTasksTable)
      .set({ completed: false })
      .where(eq(projectTasksTable.id, taskIdInProjectA));
    
    // Find by sourceId in Project A
    const taskInProjectA = await resolver.findTaskById(sharedSourceId, projectA);
    
    // Update by sourceId in Project A
    await db.update(projectTasksTable)
      .set({ completed: true })
      .where(and(
        eq(projectTasksTable.projectId, projectA),
        eq(projectTasksTable.sourceId, sharedSourceId)
      ));
    
    // Get the tasks again
    const updatedTaskA = await projectsDb.getTaskById(projectA, taskIdInProjectA);
    const updatedTaskB = await projectsDb.getTaskById(projectB, taskIdInProjectB);
    
    // Task in Project A should be updated
    expect(updatedTaskA.completed).toBe(true);
    
    // Task in Project B should remain unchanged
    expect(updatedTaskB.completed).toBe(false);
  });
});