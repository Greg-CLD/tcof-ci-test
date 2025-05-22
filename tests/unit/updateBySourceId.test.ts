import request from 'supertest';
import app from '../../server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../server/db';
import { projectTasks as projectTasksTable } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Test data generator: creates test data for all test scenarios
 */
async function setupTestData() {
  // Create test project ids
  const projectId = uuidv4();
  const otherProjectId = uuidv4();

  // Create unique IDs for tasks
  const factorTaskId = uuidv4();
  const factorTaskSourceId = uuidv4(); // Different ID used for source_id lookup
  const regularTaskId = uuidv4();
  const otherProjectTaskId = uuidv4();
  
  // Insert test tasks
  await db.insert(projectTasksTable).values([
    {
      // Success Factor task with different source_id
      id: factorTaskId,
      projectId: projectId,
      text: 'Test Success Factor Task',
      stage: 'identification',
      origin: 'factor',
      sourceId: factorTaskSourceId, // Different from task ID
      completed: false,
      status: 'pending'
    },
    {
      // Regular task (non-Success Factor)
      id: regularTaskId,
      projectId: projectId,
      text: 'Test Regular Task',
      stage: 'identification',
      origin: 'custom',
      sourceId: regularTaskId, // Same as task ID
      completed: false,
      status: 'pending'
    },
    {
      // Task in a different project (for cross-project test)
      id: otherProjectTaskId,
      projectId: otherProjectId,
      text: 'Task in Other Project',
      stage: 'identification',
      origin: 'factor',
      sourceId: uuidv4(),
      completed: false,
      status: 'pending'
    }
  ]).execute();

  return {
    projectId,
    otherProjectId,
    factorTask: {
      id: factorTaskId,
      sourceId: factorTaskSourceId
    },
    regularTask: {
      id: regularTaskId
    },
    otherProjectTask: {
      id: otherProjectTaskId
    }
  };
}

// Clean up test data
async function cleanup(projectId: string, otherProjectId: string) {
  await db.delete(projectTasksTable)
    .where(eq(projectTasksTable.projectId, projectId))
    .execute();
  
  await db.delete(projectTasksTable)
    .where(eq(projectTasksTable.projectId, otherProjectId))
    .execute();
}

describe('Task Update API Hardening Tests', () => {
  let testData: any;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  afterAll(async () => {
    await cleanup(testData.projectId, testData.otherProjectId);
  });

  // Scenario 1: Task found by direct ID match (baseline case)
  it('updates task when taskId equals task.id', async () => {
    const res = await request(app)
      .put(`/api/projects/${testData.projectId}/tasks/${testData.factorTask.id}`)
      .set('x-auth-override', 'true') // Bypass auth for testing
      .send({ completed: true });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.task.completed).toBe(true);
  });

  // Scenario 2: Task found by source_id fallback
  it('updates factor task when taskId equals task.sourceId', async () => {
    const res = await request(app)
      .put(`/api/projects/${testData.projectId}/tasks/${testData.factorTask.sourceId}`)
      .set('x-auth-override', 'true')
      .send({ completed: false });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.task.completed).toBe(false);
  });

  // Scenario 3: Valid UUID but from another project (should 404)
  it('returns 404 when taskId is valid but belongs to another project', async () => {
    const res = await request(app)
      .put(`/api/projects/${testData.projectId}/tasks/${testData.otherProjectTask.id}`)
      .set('x-auth-override', 'true')
      .send({ completed: true });
    
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('TASK_NOT_FOUND');
  });

  // Scenario 4: Invalid UUID format (should 400)
  it('returns 400 when taskId is not a valid UUID', async () => {
    const res = await request(app)
      .put(`/api/projects/${testData.projectId}/tasks/not-a-valid-uuid`)
      .set('x-auth-override', 'true')
      .send({ completed: true });
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_FORMAT');
  });

  // Scenario 5: Regular non-factor task updates still work
  it('updates regular (non-factor) task correctly', async () => {
    const res = await request(app)
      .put(`/api/projects/${testData.projectId}/tasks/${testData.regularTask.id}`)
      .set('x-auth-override', 'true')
      .send({ completed: true });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.task.completed).toBe(true);
  });
});