/**
 * Unit Tests for Task Lookup Logic
 * 
 * These tests verify that:
 * 1. Tasks can be found via sourceId, exact ID, or prefix matching
 * 2. The lookup sequence works as expected (sourceId → exact → prefix)
 * 3. Error handling is robust with appropriate logging
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
    returning: jest.fn()
  }
}));

// Mock console to capture log messages
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
let consoleLogMock: jest.SpyInstance;
let consoleErrorMock: jest.SpyInstance;

describe('Task Lookup Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  test('should find task by sourceId and use the actual task ID for update', async () => {
    // Setup test conditions
    const sourceId = 'source-factor-id';
    const actualTaskId = 'actual-task-db-id';
    const mockTask = { 
      id: actualTaskId, 
      sourceId: sourceId,
      text: 'Task via sourceId',
      completed: false
    };
    
    // Mock sourceId lookup to succeed
    const selectMock = db.select as jest.Mock;
    const fromMock = db.from as jest.Mock;
    const whereMock = db.where as jest.Mock;
    whereMock.mockImplementationOnce(() => [mockTask]);
    
    // Mock empty results for exact ID lookup (shouldn't be called)
    whereMock.mockImplementationOnce(() => []);
    
    // Mock successful update
    const updateMock = db.update as jest.Mock;
    const setMock = jest.fn().mockReturnThis();
    const returningSpy = jest.fn().mockResolvedValue([{ ...mockTask, completed: true }]);
    
    updateMock.mockReturnValue({ 
      set: setMock,
      where: jest.fn().mockReturnThis(),
      returning: returningSpy
    });
    
    // Execute function - updating task
    await projectsDb.updateTask(sourceId, { completed: true });
    
    // Verify that lookup used sourceId matching
    expect(fromMock).toHaveBeenCalledWith(projectTasks);
    expect(whereMock).toHaveBeenCalledWith(eq(projectTasks.sourceId, sourceId));
    
    // Verify output logs with [TASK_LOOKUP] prefix
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('Attempting sourceId lookup')
    );
    
    // Verify lookupMethod was properly set to 'sourceId'
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('Found task with sourceId')
    );
  });

  test('should fall back to exact ID match if sourceId lookup fails', async () => {
    // Setup test conditions
    const taskId = 'exact-task-id';
    const mockTask = { 
      id: taskId, 
      text: 'Task with exact ID',
      completed: false 
    };
    
    // Mock sourceId lookup to return empty results
    const selectMock = db.select as jest.Mock;
    const fromMock = db.from as jest.Mock;
    const whereMock = db.where as jest.Mock;
    
    // Mock first call (sourceId lookup) - empty result
    whereMock.mockImplementationOnce(() => []);
    
    // Mock second call (exact ID lookup) - success
    whereMock.mockImplementationOnce(() => [mockTask]);
    
    // Mock successful update
    const updateMock = db.update as jest.Mock;
    const setSpy = jest.fn().mockReturnThis();
    const whereSpy = jest.fn().mockReturnThis();
    const returningSpy = jest.fn().mockResolvedValue([{ ...mockTask, completed: true }]);
    
    updateMock.mockReturnValue({ 
      set: setSpy,
      where: whereSpy,
      returning: returningSpy
    });
    
    // Execute function - updating task
    await projectsDb.updateTask(taskId, { completed: true });
    
    // Verify logs show proper sequence (sourceId attempt → exact match)
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('No task found with sourceId')
    );
    
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('Found task with exact ID')
    );
    
    // Verify update used the correct task ID
    expect(updateMock).toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled();
  });

  test('should fall back to prefix matching if sourceId and exact ID lookups fail', async () => {
    // Setup test conditions
    const prefixId = 'prefix123';
    const fullTaskId = 'prefix123-full-uuid';
    const mockTask = { 
      id: fullTaskId, 
      text: 'Task with prefix match',
      completed: false 
    };
    
    // Mock sourceId lookup to return empty results
    const selectMock = db.select as jest.Mock;
    const fromMock = db.from as jest.Mock;
    const whereMock = db.where as jest.Mock;
    
    // First call (sourceId lookup) - empty result
    whereMock.mockImplementationOnce(() => []);
    
    // Second call (exact ID lookup) - empty result
    whereMock.mockImplementationOnce(() => []);
    
    // Third call (get all tasks for prefix matching)
    selectMock.mockImplementationOnce(() => ({
      from: fromMock.mockReturnThis(),
      where: jest.fn().mockReturnThis()
    }));
    
    // Mock array.find for prefix matching
    const allTasks = [mockTask];
    fromMock.mockImplementationOnce(() => Promise.resolve(allTasks));
    
    // Mock successful update
    const updateMock = db.update as jest.Mock;
    const setSpy = jest.fn().mockReturnThis();
    const whereSpy = jest.fn().mockReturnThis();
    const returningSpy = jest.fn().mockResolvedValue([{ ...mockTask, completed: true }]);
    
    updateMock.mockReturnValue({ 
      set: setSpy,
      where: whereSpy,
      returning: returningSpy
    });
    
    // Execute function - updating task by prefix
    await projectsDb.updateTask(prefixId, { completed: true });
    
    // Verify logs show proper sequence
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('No task found with sourceId')
    );
    
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('No task found with exact ID')
    );
    
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('Attempting prefix match')
    );
    
    // Final verification
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('Found task with ID prefix')
    );
  });

  test('should throw error with [TASK_UPDATE_ERROR] prefix when task not found by any method', async () => {
    // Setup mocks for all lookup methods to fail
    const nonExistentId = 'non-existent-id';
    
    // First call (sourceId lookup) - empty result
    const whereMock = db.where as jest.Mock;
    whereMock.mockImplementationOnce(() => []);
    
    // Second call (exact ID lookup) - empty result
    whereMock.mockImplementationOnce(() => []);
    
    // Third call (get all tasks for prefix matching) - empty array
    const selectMock = db.select as jest.Mock;
    const fromMock = db.from as jest.Mock;
    
    selectMock.mockImplementationOnce(() => ({
      from: fromMock
    }));
    
    fromMock.mockImplementationOnce(() => Promise.resolve([]));
    
    // Execute function - should throw error
    await expect(
      projectsDb.updateTask(nonExistentId, { completed: true })
    ).rejects.toThrow();
    
    // Verify error logs with [TASK_UPDATE_ERROR] prefix
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_UPDATE_ERROR]'),
      expect.stringContaining(`Task with ID ${nonExistentId} does not exist`)
    );
    
    // Verify all lookup methods were attempted
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('No task found with sourceId')
    );
    
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('No task found with exact ID')
    );
    
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('No task found with ID prefix')
    );
  });
});