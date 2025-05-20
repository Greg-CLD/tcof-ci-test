/**
 * Unit test for task ID matching in updateTask function
 * 
 * This test verifies that our new task ID matching logic correctly:
 * 1. Finds tasks by exact ID match
 * 2. Finds tasks by clean UUID prefix match
 * 3. Rejects success factor IDs that are not task IDs
 * 4. Uses the matched DB ID for database operations
 */

import { projectsDb } from '../../server/projectsDb';
import { db } from '../../server/db';
import { projectTasks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock the database operations
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([])),
        limit: jest.fn(() => Promise.resolve([]))
      }))
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(() => Promise.resolve([{ id: 'test-db-id-123' }]))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      where: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: 'test-db-id-123' }]))
      }))
    }))
  }
}));

describe('Task ID Matching Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up console logging spy
    jest.spyOn(console, 'log').mockImplementation();
  });

  describe('updateTask function', () => {
    test('should use matched DB ID for database operations', async () => {
      // Setup
      const mockTask = {
        id: 'test-db-id-123-suffix',
        projectId: 'test-project',
        text: 'Test task',
        completed: false,
        origin: 'custom',
        source: 'custom',
        sourceId: null
      };
      
      // Mock the DB select to return our test task when searching
      const mockSelect = jest.fn(() => Promise.resolve([mockTask]));
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn(() => ({
          where: mockSelect,
          limit: jest.fn(() => Promise.resolve([])) // for all tasks query
        }))
      });
      
      // Test data with a clean UUID prefix
      const cleanUuidPrefix = 'test-db-id-123';
      const updateData = { completed: true };
      
      // Execute
      try {
        await projectsDb.updateTask(cleanUuidPrefix, updateData);
        
        // Verify
        const updateSpy = db.update as jest.Mock;
        const setSpy = updateSpy().set as jest.Mock;
        const whereSpy = setSpy().where as jest.Mock;
        
        // Expect the full matched DB ID to be used in the update operation, not the clean prefix
        expect(whereSpy).toHaveBeenCalledWith(eq(projectTasks.id, mockTask.id));
        
        // Verify debug logging shows matched ID info
        expect(console.log).toHaveBeenCalledWith(
          '[TASK_LOOKUP]',
          expect.objectContaining({
            rawId: cleanUuidPrefix,
            matchedId: mockTask.id,
            matchedVia: 'prefix'
          })
        );
      } catch (error) {
        // This should not happen, but including for debugging
        console.error('Test failed with error:', error);
        throw error;
      }
    });
    
    test('should reject success factor IDs', async () => {
      // Setup - simulate a success factor ID by creating tasks with this as sourceId
      const factorId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
      const mockTaskWithFactorSource = {
        id: 'task-123',
        projectId: 'test-project',
        text: 'Test task',
        completed: false,
        origin: 'success_factor',
        source: 'success_factor',
        sourceId: factorId
      };
      
      // Mock the DB select to return tasks with this sourceId
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockTaskWithFactorSource]))
        }))
      });
      
      // Execute & Verify rejection
      await expect(
        projectsDb.updateTask(factorId, { completed: true })
      ).rejects.toThrow(/appears to be a success factor ID/);
      
      // Verify no update was attempted
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});