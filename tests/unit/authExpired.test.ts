import request from 'supertest';
import express from 'express';
import { setupAuth } from '../../server/auth-simple';

// Create a mock for our refreshSession function
jest.mock('../../server/middleware/refresh', () => ({
  refreshSession: jest.fn().mockRejectedValue(new Error('token expired'))
}));

describe('auth middleware', () => {
  let app: express.Express;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    setupAuth(app);
    
    // Add a protected test endpoint
    app.put('/api/projects/p1/tasks/uuid', (req, res) => {
      res.status(200).json({ success: true });
    });
  });
  
  it('returns 401 JSON when session refresh fails', async () => {
    // Attempt to access a protected endpoint with an expired session
    const res = await request(app)
      .post('/api/auth/refresh-session')
      .send({});
      
    // Verify response is 401 with proper error format
    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({ 
        success: false, 
        error: 'AUTH_EXPIRED' 
      })
    );
  });
});