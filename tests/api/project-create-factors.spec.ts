import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes.ts';
import { db } from '../../server/db';
import { projects, projectTasks } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as factorsDb from '../../server/factorsDb';

describe('Project creation clones Success Factor tasks', () => {
  let app: express.Express;
  let server: any;
  const USER_ID = 777;
  let projectId: string | undefined;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // mock auth
    app.use((req: any, _res: any, next: any) => {
      req.isAuthenticated = () => true;
      req.user = { id: USER_ID };
      next();
    });
  });

  afterAll(async () => {
    if (projectId) {
      await db.delete(projectTasks).where(eq(projectTasks.projectId, projectId)).execute();
      await db.delete(projects).where(eq(projects.id, projectId)).execute();
    }

    await new Promise<void>((resolve) => {
      if (server && server.close) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it('creates a project and seeds Success Factor tasks', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'SF clone test' });
    expect(res.status).toBe(201);
    projectId = res.body.id;
    expect(projectId).toBeDefined();

    const factors = await factorsDb.getFactors();
    let expected = 0;
    for (const factor of factors) {
      for (const stage of Object.keys(factor.tasks)) {
        expected += (factor.tasks as any)[stage]?.length || 0;
      }
    }

    const tasks = await db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId!));
    const factorTasks = tasks.filter((t: any) => t.origin === 'factor');
    expect(factorTasks.length).toBe(expected);
  });
});

