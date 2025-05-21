import { jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock the database module
jest.mock('../../server/db', () => ({
  execute: jest.fn().mockResolvedValue({
    rows: [{ id: 'test-uuid', completed: true, text: 'Test Task' }]
  })
}));

// Import the function after mocking dependencies
const projectsDb = require('../../server/projectsDb');

describe('Success Factor Task Upsert', () => {
  test('Upserts missing success-factor task', async () => {
    // Generate a UUID for testing
    const newId = uuidv4();
    
    // Set up the update data with success-factor origin
    const updates = { 
      origin: 'success-factor', 
      completed: true, 
      text: 'Test Task', 
      stage: 'identification', 
      status: 'Done',
      projectId: 'test-project-id'
    };
    
    // Call the updateTask function
    const result = await projectsDb.updateTask(newId, updates);
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.origin).toBe('success-factor');
    expect(result.completed).toBe(true);
  });
});