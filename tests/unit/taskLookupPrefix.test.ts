/**
 * Unit Tests for Task ID Lookup with Prefix Matching
 * 
 * These tests verify that:
 * 1. Exact matches on task.id work correctly
 * 2. Prefix matches using the raw task.id (not clean UUIDs) work correctly
 * 3. No match cases are handled properly
 */

import { projectsDb } from '../../server/projectsDb';
import { db } from '../../server/db';
import { projectTasks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock the database operations
jest.mock('../../server/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn()
  }
}));

// Mock console.log to avoid cluttered test output
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = jest.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
});

describe('Task Lookup Prefix Matching', () => {
  
  describe('updateTask', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    // Sample tasks for testing
    const mockTasks = [
      { id: '12345678-abcd-efgh-ijkl-mnopqrstuvwx', text: 'Task 1' },
      { id: '98765432-wxyz-1234-5678-abcdefghijkl', text: 'Task 2' },
      { id: '98765432-wxyz-1234-5678-abcdefghijkl-suffix', text: 'Task with compound ID' }
    ];
    
    test('should find a task with exact ID match', async () => {
      // Setup test conditions
      const taskId = mockTasks[0].id;
      const mockTask = mockTasks[0];
      
      // Mock the database responses
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // Mock exact ID lookup
      whereMock.mockImplementationOnce(() => Promise.resolve([mockTask]));
      
      // Call the function
      await projectsDb.updateTask(taskId, { priority: 'High' });
      
      // Verify calls
      expect(selectMock).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalledWith(projectTasks);
      expect(whereMock).toHaveBeenCalledWith(eq(projectTasks.id, taskId));
      
      // Verify exact match debug logging
      expect(console.log).toHaveBeenCalledWith(
        '[TASK_LOOKUP]',
        expect.objectContaining({
          rawId: taskId,
          matchedId: mockTask.id,
          matchedVia: 'exact'
        })
      );
    });
    
    test('should find a task with prefix match on task.id', async () => {
      // Setup test conditions
      const taskIdPrefix = '98765432-wxyz';
      const mockTask = mockTasks[2]; // Task with compound ID
      
      // Mock the database responses
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // Mock exact ID lookup (returns no results)
      whereMock.mockImplementationOnce(() => Promise.resolve([]));
      
      // Mock source ID lookup (returns no results)
      whereMock.mockImplementationOnce(() => Promise.resolve([]));
      
      // Mock all tasks lookup for prefix matching
      selectMock.mockImplementationOnce(() => ({
        from: () => Promise.resolve(mockTasks)
      }));
      
      // Mock update operation
      const updateSpy = db.update as jest.Mock;
      const setSpy = jest.fn().mockReturnThis();
      const updateWhereSpy = jest.fn().mockReturnThis();
      const executeSpy = jest.fn().mockResolvedValue({ rowCount: 1 });
      
      updateSpy.mockReturnValue({ set: setSpy });
      setSpy.mockReturnValue({ where: updateWhereSpy });
      updateWhereSpy.mockReturnValue({ execute: executeSpy });
      
      // Call the function
      await projectsDb.updateTask(taskIdPrefix, { priority: 'High' });
      
      // Verify update was called with the matched task's full ID, not the prefix
      const updateSpy = db.update as jest.Mock;
      const setSpy = updateSpy().set as jest.Mock;
      const whereSpy = setSpy().where as jest.Mock;
      
      // Expect the full matched DB ID to be used in the update operation, not the clean prefix
      expect(whereSpy).toHaveBeenCalledWith(eq(projectTasks.id, mockTask.id));
      
      // Verify debug logging shows matched ID info
      expect(console.log).toHaveBeenCalledWith(
        '[TASK_LOOKUP]',
        expect.objectContaining({
          rawId: taskIdPrefix,
          matchedId: mockTask.id,
          matchedVia: 'prefix'
        })
      );
    });
    
    test('should throw error when no task matches', async () => {
      // Setup test conditions
      const nonExistentTaskId = 'non-existent-id';
      
      // Mock the database responses
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // Mock exact ID lookup (returns no results)
      whereMock.mockImplementationOnce(() => Promise.resolve([]));
      
      // Mock source ID lookup (returns no results)
      whereMock.mockImplementationOnce(() => Promise.resolve([]));
      
      // Mock all tasks lookup for prefix matching (no matches)
      selectMock.mockImplementationOnce(() => ({
        from: () => Promise.resolve(mockTasks)
      }));
      
      // Call the function and expect error
      await expect(
        projectsDb.updateTask(nonExistentTaskId, { priority: 'High' })
      ).rejects.toThrow(/not found/);
    });
  });
  
  // Similar tests for deleteTask would be implemented here
  
});