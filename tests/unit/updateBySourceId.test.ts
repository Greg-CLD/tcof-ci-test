import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../server/db';
import { projectTasks as projectTasksTable } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Mock data to create a success factor task for testing
 */
async function seedFactorTask() {
  // Create test project id and task data
  const projectId = uuidv4();
  const taskId = uuidv4();
  const sourceId = uuidv4(); // Different ID that will be used for lookup

  // Create a test task with source_id
  await db.insert(projectTasksTable).values({
    id: taskId,
    projectId: projectId,
    text: 'Test Success Factor Task',
    stage: 'identification',
    origin: 'factor',
    sourceId: sourceId, // Important: different from taskId
    completed: false,
    status: 'pending'
  }).execute();

  // Return test data for assertions
  return {
    projectId,
    task: {
      id: taskId,
      sourceId: sourceId,
      text: 'Test Success Factor Task'
    }
  };
}

// Clean up test data
async function cleanup(projectId: string) {
  await db.delete(projectTasksTable)
    .where(eq(projectTasksTable.projectId, projectId))
    .execute();
}

describe('Task Update API by sourceId fallback', () => {
  it('updates factor task by sourceId fallback', async () => {
    // Create test data
    const { projectId, task } = await seedFactorTask();
    
    try {
      // Make PUT request using sourceId instead of the task's primary ID
      const res = await request(app)
        .put(`/api/projects/${projectId}/tasks/${task.sourceId}`)
        .set('x-auth-override', 'true') // Bypass auth for testing
        .send({ completed: true });
      
      // Validate response
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.task.completed).toBe(true);
      
      // Verify database was updated correctly
      const updatedTasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.id, task.id))
        .execute();
      
      expect(updatedTasks.length).toBe(1);
      expect(updatedTasks[0].completed).toBe(true);
    } finally {
      // Clean up test data
      await cleanup(projectId);
    }
  });
});