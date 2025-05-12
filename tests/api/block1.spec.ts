/**
 * API tests for Block1 functionality
 * Tests CRUD operations for success factor ratings and personal heuristics
 */
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';

// Simple test implementation without type errors
describe('Block1 API Tests', () => {
  let app: express.Express;
  let server: any;
  const TEST_PROJECT_ID = 999; // Use a fixed project ID for testing
  const USER_ID = 888; // Use a fixed user ID

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Mock authentication middleware for all routes
    app.use((req: any, res, next) => {
      req.isAuthenticated = () => true;
      req.user = { id: USER_ID };
      next();
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server && server.close) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  describe('Success Factor Ratings API', () => {
    it('should create a success factor rating', async () => {
      const payload = {
        factorId: 'sf-1',
        resonance: 3
      };

      const response = await request(app)
        .post(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`)
        .send(payload);

      // Should return a 201 Created status
      expect(response.status).toBe(201);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('factorId', payload.factorId);
      expect(response.body[0]).toHaveProperty('resonance', payload.resonance);
      expect(response.body[0]).toHaveProperty('id');
    });

    it('should get all success factor ratings for a project', async () => {
      // First create a rating to ensure we have data
      await request(app)
        .post(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`)
        .send({ factorId: 'sf-1', resonance: 3 });

      const response = await request(app)
        .get(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`);

      // Should return a 200 status
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('should update a success factor rating', async () => {
      // Create a rating first
      const createResponse = await request(app)
        .post(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`)
        .send({ factorId: 'sf-2', resonance: 3 });
      
      const ratingId = createResponse.body[0].id;
      
      // Update the rating
      const updatePayload = { factorId: 'sf-2', resonance: 5, id: ratingId };
      const updateResponse = await request(app)
        .put(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`)
        .send([updatePayload]);

      // Should return a 200 status
      expect(updateResponse.status).toBe(200);
      
      // Verify the update
      const updatedRating = updateResponse.body.find((r: any) => r.id === ratingId);
      expect(updatedRating).toBeTruthy();
      expect(updatedRating.resonance).toBe(5);
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
        .post(`/api/projects/${TEST_PROJECT_ID}/heuristics`)
        .send(payload);

      // Should return a 201 Created status
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('name', payload.name);
      expect(response.body).toHaveProperty('description', payload.description);
      expect(response.body).toHaveProperty('id');
    });

    it('should get all personal heuristics for a project', async () => {
      // First create a heuristic to ensure we have data
      await request(app)
        .post(`/api/projects/${TEST_PROJECT_ID}/heuristics`)
        .send({ name: 'Get Test Heuristic', description: 'Testing get operation' });

      const response = await request(app)
        .get(`/api/projects/${TEST_PROJECT_ID}/heuristics`);

      // Should return a 200 status
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('should maintain both success factor ratings and personal heuristics', async () => {
      // Add a rating
      await request(app)
        .post(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`)
        .send({ factorId: 'sf-3', resonance: 4 });
      
      // Add a heuristic
      await request(app)
        .post(`/api/projects/${TEST_PROJECT_ID}/heuristics`)
        .send({ name: 'Integration Test', description: 'Testing API interaction' });
      
      // Verify both endpoints return data
      const ratingsResponse = await request(app)
        .get(`/api/projects/${TEST_PROJECT_ID}/success-factor-ratings`);
      
      const heuristicsResponse = await request(app)
        .get(`/api/projects/${TEST_PROJECT_ID}/heuristics`);
      
      expect(ratingsResponse.status).toBe(200);
      expect(heuristicsResponse.status).toBe(200);
      expect(Array.isArray(ratingsResponse.body)).toBeTruthy();
      expect(Array.isArray(heuristicsResponse.body)).toBeTruthy();
    });
  });
});