/**
 * Test that Success Factor tasks are properly persisted when accessed via sourceId
 * 
 * This test verifies that PUT /api/projects/:projectId/tasks/:taskId properly
 * persists updates when the task is found via sourceId lookup rather than
 * direct ID match.
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

// Mock authentication for testing
jest.mock('../../server/auth', () => ({
  setupAuth: jest.fn(),
  isAuthenticated: jest.fn().mockImplementation((req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: 1 };
    next();
  })
}));

describe('Success Factor Task Updates via sourceId', () => {
  let app: express.Express;
  let server: any;
  let projectId: string;
  let factorTaskId: string;
  let factorSourceId: string;

  beforeAll(async () => {
    // Create Express app and register routes
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Generate IDs for our test
    projectId = uuidv4();
    factorTaskId = uuidv4();
    factorSourceId = uuidv4();

    // Insert test project
    await db.execute(sql`
      INSERT INTO projects (id, name, user_id, created_at, updated_at)
      VALUES (${projectId}, 'Test Project', 1, NOW(), NOW())
    `);

    // Insert test task with sourceId
    await db.execute(sql`
      INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, completed, status, created_at, updated_at
      ) VALUES (
        ${factorTaskId}, ${projectId}, 'Test Factor Task', 'identification', 'factor', 
        ${factorSourceId}, false, 'pending', NOW(), NOW()
      )
    `);
  });

  afterAll(async () => {
    // Clean up test data
    await db.execute(sql`DELETE FROM project_tasks WHERE id = ${factorTaskId}`);
    await db.execute(sql`DELETE FROM projects WHERE id = ${projectId}`);
    
    if (server) {
      server.close();
    }
  });

  it('should persist changes when updating a task via sourceId lookup', async () => {
    // 1. Verify task exists and is not completed
    const initialTaskResult = await db.execute(sql`
      SELECT * FROM project_tasks WHERE id = ${factorTaskId}
    `);
    
    expect(initialTaskResult.rows.length).toBe(1);
    expect(initialTaskResult.rows[0].completed).toBe(false);

    // 2. Send PUT request using the sourceId (not the actual task ID)
    const updateResponse = await request(app)
      .put(`/api/projects/${projectId}/tasks/${factorSourceId}`)
      .set('Content-Type', 'application/json')
      .send({ completed: true });

    // 3. Verify the response
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.task).toBeDefined();

    // 4. Verify that the task was actually updated in the database
    const updatedTaskResult = await db.execute(sql`
      SELECT * FROM project_tasks WHERE id = ${factorTaskId}
    `);
    
    expect(updatedTaskResult.rows.length).toBe(1);
    expect(updatedTaskResult.rows[0].completed).toBe(true);

    // 5. Verify that the database has the correct sourceId
    expect(updatedTaskResult.rows[0].source_id).toBe(factorSourceId);

    // 6. Make a GET request to verify API returns the updated task
    const getResponse = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set('Content-Type', 'application/json');
    
    expect(getResponse.status).toBe(200);
    
    // Find our test task in the response
    const foundTask = getResponse.body.find((task: any) => task.id === factorTaskId);
    expect(foundTask).toBeDefined();
    expect(foundTask.completed).toBe(true);
    expect(foundTask.sourceId).toBe(factorSourceId);
  });
});