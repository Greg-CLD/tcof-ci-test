import { createServer } from 'http';
import request from 'supertest';
import { db } from '@db';
import { 
  projects, 
  successFactorRatings, 
  personalHeuristics,
  users
} from '@shared/schema';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { eq, sql } from 'drizzle-orm';
import { SQL } from 'drizzle-orm/sql/sql';

describe('Block1 API Tests', () => {
  let app: express.Express;
  let server: ReturnType<typeof createServer>;
  let projectId: number;
  let testUserId: number;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Mock authentication for tests
    app.use((req: any, res, next) => {
      // Set a mock authenticated user for all requests
      req.isAuthenticated = () => true;
      req.user = { id: testUserId };
      next();
    });
  });

  beforeEach(async () => {
    // Use direct SQL to create a test user
    const userId = Math.floor(Math.random() * 1000000); // Random ID to avoid conflicts
    const userEmail = `test-user-${Date.now()}@test.com`;
    
    const result = await db.execute(
      sql`INSERT INTO users (id, username, email, password, created_at) 
          VALUES (${userId}, ${userEmail}, ${userEmail}, 'test-password', NOW()) 
          RETURNING id`
    );
    
    testUserId = userId; // Use the ID we generated

    // Use a direct SQL query for inserting a test project to bypass type issues
    // during testing, since we only need a valid project ID
    const projectName = `Test Project ${Date.now()}`;
    const projectDesc = 'Test project for Block1 API tests';
    const uniqueId = Math.floor(Math.random() * 1000000);
    
    const [project] = await db.execute<{ id: number }>(
      sql`INSERT INTO projects (id, name, description, user_id) 
          VALUES (${uniqueId}, ${projectName}, ${projectDesc}, ${testUserId}) 
          RETURNING id`
    );
    
    projectId = project.id;
    
    // Clean up existing data
    await db.delete(successFactorRatings).where(eq(successFactorRatings.projectId, projectId));
    await db.delete(personalHeuristics).where(eq(personalHeuristics.projectId, projectId));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(successFactorRatings).where(eq(successFactorRatings.projectId, projectId));
    await db.delete(personalHeuristics).where(eq(personalHeuristics.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('Success Factor Ratings API', () => {
    it('should create a success factor rating', async () => {
      const payload = {
        factorId: 'sf-1',
        resonance: 3
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/success-factor-ratings`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('factorId', payload.factorId);
      expect(response.body[0]).toHaveProperty('resonance', payload.resonance);
      expect(response.body[0]).toHaveProperty('id');
      
      // Verify in database
      const ratings = await db.select().from(successFactorRatings)
        .where(eq(successFactorRatings.projectId, projectId));
      
      expect(ratings).toHaveLength(1);
      expect(ratings[0].factorId).toBe(payload.factorId);
      expect(ratings[0].resonance).toBe(payload.resonance);
    });

    it('should get all success factor ratings for a project', async () => {
      // Create multiple ratings
      const ratingsData = [
        { factorId: 'sf-1', resonance: 3 },
        { factorId: 'sf-2', resonance: 4 },
        { factorId: 'sf-3', resonance: 2 }
      ];
      
      for (const data of ratingsData) {
        await request(app)
          .post(`/api/projects/${projectId}/success-factor-ratings`)
          .send(data);
      }

      const response = await request(app)
        .get(`/api/projects/${projectId}/success-factor-ratings`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(ratingsData.length);
      
      // Verify each rating
      for (const expectedRating of ratingsData) {
        const found = response.body.some((rating: any) => 
          rating.factorId === expectedRating.factorId && 
          rating.resonance === expectedRating.resonance
        );
        expect(found).toBeTruthy();
      }
    });

    it('should update a success factor rating', async () => {
      // Create a rating
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/success-factor-ratings`)
        .send({ factorId: 'sf-1', resonance: 3 });
      
      const ratingId = createResponse.body[0].id;
      
      // Update the rating
      const updatePayload = { factorId: 'sf-1', resonance: 5, id: ratingId };
      const updateResponse = await request(app)
        .put(`/api/projects/${projectId}/success-factor-ratings`)
        .send([updatePayload]);

      expect(updateResponse.status).toBe(200);
      
      // Verify the update
      const updatedRating = updateResponse.body.find((r: any) => r.id === ratingId);
      expect(updatedRating).toBeTruthy();
      expect(updatedRating.resonance).toBe(5);
      
      // Verify in database
      const ratings = await db.select().from(successFactorRatings)
        .where(eq(successFactorRatings.id, ratingId));
      
      expect(ratings).toHaveLength(1);
      expect(ratings[0].resonance).toBe(5);
    });

    it('should delete a success factor rating', async () => {
      // Create a rating
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/success-factor-ratings`)
        .send({ factorId: 'sf-1', resonance: 3 });
      
      const ratingId = createResponse.body[0].id;
      
      // Delete the rating
      const deleteResponse = await request(app)
        .delete(`/api/projects/${projectId}/success-factor-ratings/${ratingId}`);

      expect(deleteResponse.status).toBe(200);
      
      // Verify deletion in database
      const ratings = await db.select().from(successFactorRatings)
        .where(eq(successFactorRatings.id, ratingId));
      
      expect(ratings).toHaveLength(0);
    });
  });

  describe('Personal Heuristics API', () => {
    it('should create a personal heuristic', async () => {
      const payload = {
        name: 'Test Heuristic',
        description: 'This is a test heuristic',
        favourite: false
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/heuristics`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', payload.name);
      expect(response.body).toHaveProperty('description', payload.description);
      expect(response.body).toHaveProperty('favourite', payload.favourite);
      expect(response.body).toHaveProperty('id');
      
      // Verify in database
      const heuristics = await db.select().from(personalHeuristics)
        .where(eq(personalHeuristics.projectId, projectId));
      
      expect(heuristics).toHaveLength(1);
      expect(heuristics[0].name).toBe(payload.name);
      expect(heuristics[0].description).toBe(payload.description);
    });

    it('should get all personal heuristics for a project', async () => {
      // Create multiple heuristics
      const heuristicsData = [
        { name: 'Heuristic 1', description: 'Description 1' },
        { name: 'Heuristic 2', description: 'Description 2' },
        { name: 'Heuristic 3', description: 'Description 3' }
      ];
      
      for (const data of heuristicsData) {
        await request(app)
          .post(`/api/projects/${projectId}/heuristics`)
          .send(data);
      }

      const response = await request(app)
        .get(`/api/projects/${projectId}/heuristics`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(heuristicsData.length);
      
      // Verify each heuristic
      for (const expectedHeuristic of heuristicsData) {
        const found = response.body.some((heuristic: any) => 
          heuristic.name === expectedHeuristic.name && 
          heuristic.description === expectedHeuristic.description
        );
        expect(found).toBeTruthy();
      }
    });

    it('should update a personal heuristic', async () => {
      // Create a heuristic
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/heuristics`)
        .send({ name: 'Original Name', description: 'Original Description' });
      
      const heuristicId = createResponse.body.id;
      
      // Update the heuristic
      const updatePayload = { 
        name: 'Updated Name', 
        description: 'Updated Description',
        favourite: true
      };
      
      const updateResponse = await request(app)
        .put(`/api/projects/${projectId}/heuristics/${heuristicId}`)
        .send(updatePayload);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('name', updatePayload.name);
      expect(updateResponse.body).toHaveProperty('description', updatePayload.description);
      expect(updateResponse.body).toHaveProperty('favourite', updatePayload.favourite);
      
      // Verify in database
      const heuristics = await db.select().from(personalHeuristics)
        .where(eq(personalHeuristics.id, heuristicId));
      
      expect(heuristics).toHaveLength(1);
      expect(heuristics[0].name).toBe(updatePayload.name);
      expect(heuristics[0].description).toBe(updatePayload.description);
      expect(heuristics[0].favourite).toBe(updatePayload.favourite);
    });

    it('should delete a personal heuristic', async () => {
      // Create a heuristic
      const createResponse = await request(app)
        .post(`/api/projects/${projectId}/heuristics`)
        .send({ name: 'Heuristic to Delete', description: 'Will be deleted' });
      
      const heuristicId = createResponse.body.id;
      
      // Delete the heuristic
      const deleteResponse = await request(app)
        .delete(`/api/projects/${projectId}/heuristics/${heuristicId}`);

      expect(deleteResponse.status).toBe(200);
      
      // Verify deletion in database
      const heuristics = await db.select().from(personalHeuristics)
        .where(eq(personalHeuristics.id, heuristicId));
      
      expect(heuristics).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain both success factor ratings and personal heuristics when adding both', async () => {
      // Add a rating
      await request(app)
        .post(`/api/projects/${projectId}/success-factor-ratings`)
        .send({ factorId: 'sf-1', resonance: 3 });
      
      // Add a heuristic
      await request(app)
        .post(`/api/projects/${projectId}/heuristics`)
        .send({ name: 'Integration Test', description: 'Testing both together' });
      
      // Verify both exist
      const ratingsResponse = await request(app)
        .get(`/api/projects/${projectId}/success-factor-ratings`);
      
      const heuristicsResponse = await request(app)
        .get(`/api/projects/${projectId}/heuristics`);
      
      expect(ratingsResponse.body).toHaveLength(1);
      expect(heuristicsResponse.body).toHaveLength(1);
    });
  });
});