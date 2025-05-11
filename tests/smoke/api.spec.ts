
import { createServer } from 'http';
import request from 'supertest';
import { db } from '@db';
import { projects } from '@shared/schema';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('API Smoke Tests', () => {
  let app: express.Express;
  let server: ReturnType<typeof createServer>;
  let projectId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  beforeEach(async () => {
    // Create a test project
    const [project] = await db.insert(projects)
      .values({
        name: 'Test Project',
        description: 'Test project for smoke tests',
        userId: 1, // Assuming a test user exists
      })
      .returning();
    
    projectId = project.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (projectId) {
      await db.delete(projects).where(eq(projects.id, projectId));
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('should create success factor rating', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/success-factor-ratings`)
      .send({
        factorId: 'sf-1',
        resonance: 3
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty('factorId', 'sf-1');
    expect(response.body[0]).toHaveProperty('resonance', 3);
  });
});
