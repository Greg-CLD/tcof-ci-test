
import request from 'supertest';
import { app } from '../../server';
import { db } from '../../server/db';
import { projectTasks } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

describe('Task Toggle Endpoint Tests', () => {
  // Known test data
  const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  const PROJECT_ID_OTHER = '9a4c7110-bb5b-4321-a4ba-6c59366c8e96';
  let testFactorTask;
  
  beforeAll(async () => {
    // Create a test Success Factor task
    testFactorTask = {
      id: uuidv4(),
      projectId: PROJECT_ID,
      text: 'Test Success Factor',
      stage: 'identification',
      origin: 'factor',
      sourceId: uuidv4(), // This will be our canonical sourceId
      completed: false,
      status: 'To Do'
    };

    await db.insert(projectTasks).values(testFactorTask);
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(projectTasks)
      .where(eq(projectTasks.id, testFactorTask.id));
  });

  // Test 1: Toggle by sourceId
  it('should toggle task completion by sourceId', async () => {
    const response = await request(app)
      .put(`/api/projects/${PROJECT_ID}/tasks/${testFactorTask.sourceId}`)
      .set('x-auth-override', 'true') // For testing only
      .send({
        completed: true,
        status: 'Done',
        origin: 'factor'
      });

    console.log('Test 1 Response:', {
      status: response.status,
      body: response.body
    });

    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
    expect(response.body.sourceId).toBe(testFactorTask.sourceId);
  });

  // Test 2: Toggle by task ID
  it('should toggle task completion by task ID', async () => {
    const response = await request(app)
      .put(`/api/projects/${PROJECT_ID}/tasks/${testFactorTask.id}`)
      .set('x-auth-override', 'true')
      .send({
        completed: false,
        status: 'To Do',
        origin: 'factor'
      });

    console.log('Test 2 Response:', {
      status: response.status,
      body: response.body
    });

    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(false);
  });

  // Test 3: Invalid UUID
  it('should return 404 for invalid UUID', async () => {
    const response = await request(app)
      .put(`/api/projects/${PROJECT_ID}/tasks/not-a-valid-uuid`)
      .set('x-auth-override', 'true')
      .send({
        completed: true,
        status: 'Done'
      });

    console.log('Test 3 Response:', {
      status: response.status,
      body: response.body
    });

    expect(response.status).toBe(404);
  });

  // Test 4: Cross-project sourceId attempt
  it('should return 404 for cross-project sourceId', async () => {
    const response = await request(app)
      .put(`/api/projects/${PROJECT_ID_OTHER}/tasks/${testFactorTask.sourceId}`)
      .set('x-auth-override', 'true')
      .send({
        completed: true,
        status: 'Done'
      });

    console.log('Test 4 Response:', {
      status: response.status,
      body: response.body
    });

    expect(response.status).toBe(404);
  });
});
