import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the projectsDb module
vi.mock('../../server/projectsDb', () => ({
  projectsDb: {
    updateTask: vi.fn(),
    getTasksForProject: vi.fn()
  }
}));

// Mock authentication middleware
vi.mock('../../server/auth', () => ({
  isAuthenticated: vi.fn((req, res, next) => {
    // Allow all requests to pass through for testing
    req.user = { id: 'test-user-id' };
    next();
  })
}));

// Create a test Express app
const app = express();
app.use(express.json());

// Import the routes (assuming they're exported properly)
const setupRoutes = require('../../server/routes').default;
setupRoutes(app);

describe("PUT /api/projects/:projectId/tasks/:taskId? endpoint", () => {
  it("returns 400 JSON when taskId missing in URL", async () => {
    const res = await request(app)
      .put("/api/projects/testProject/tasks/")    // trailing slash, no ID
      .send({completed: true});
    
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.error).toBe("INVALID_PARAMETERS");
  });

  it("returns 404 JSON for non-existent task", async () => {
    // Mock projectsDb to return null (task not found)
    vi.mocked(projectsDb).updateTask.mockResolvedValueOnce(null);
    
    const res = await request(app)
      .put("/api/projects/testProject/tasks/non-existent-task")
      .send({completed: true});
    
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 JSON for DB errors", async () => {
    // Mock projectsDb to throw an error
    vi.mocked(projectsDb).updateTask.mockRejectedValueOnce(new Error("DB Error"));
    
    const res = await request(app)
      .put("/api/projects/testProject/tasks/task-id")
      .send({completed: true});
    
    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.success).toBe(false);
  });
});