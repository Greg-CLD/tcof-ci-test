/**
 * Unit Tests for Task Lookup via Source ID
 * 
 * These tests verify that:
 * 1. Tasks can be found using sourceId 
 * 2. Source ID lookup happens before prefix matching
 * 3. Proper error handling with [TASK_UPDATE_ERROR] prefix for source ID errors
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
    returning: jest.fn(),
    execute: jest.fn()
  }
}));

// Mock console to capture log messages
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
let consoleLogMock: jest.SpyInstance;
let consoleErrorMock: jest.SpyInstance;

describe('Task Lookup via Source ID', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  test('should find task by source ID and use the actual task ID for update', async () => {
    // Setup test conditions
    const sourceId = 'source-factor-id';
    const actualTaskId = 'actual-task-db-id';
    const mockTask = { 
      id: actualTaskId, 
      sourceId: sourceId,
      text: 'Task via sourceId',
      completed: false
    };
    
    // Mock source ID lookup to return a task
    const selectMock = db.select as jest.Mock;
    const fromMock = db.from as jest.Mock;
    const whereMock = db.where as jest.Mock;
    
    // First mock: source ID check (success)
    whereMock.mockImplementationOnce(() => Promise.resolve([mockTask]));
    
    // Mock successful update
    const updateMock = db.update as jest.Mock;
    const setMock = jest.fn().mockReturnThis();
    const returningSpy = jest.fn().mockResolvedValue([{ ...mockTask, completed: true }]);
    
    updateMock.mockReturnValue({ 
      set: setMock,
      where: jest.fn().mockReturnValue({
        returning: returningSpy
      })
    });
    
    // Execute function - updating task by source ID
    await projectsDb.updateTask(sourceId, { completed: true });
    
    // Verify source ID was used in query
    expect(fromMock).toHaveBeenCalledWith(projectTasks);
    expect(whereMock).toHaveBeenCalledWith(eq(projectTasks.sourceId, sourceId));
    
    // Verify the update used the real task ID, not the source ID
    const updateWhereSpy = updateMock().set().where;
    expect(updateWhereSpy).toHaveBeenCalledWith(eq(projectTasks.id, actualTaskId));
    
    // Verify appropriate logs were generated
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.stringContaining('Found task with sourceId')
    );
    
    // Verify lookupMethod was properly set to 'sourceId'
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.objectContaining({
        matchedVia: 'sourceId'
      })
    );
  });
  
  test('should log errors with [TASK_UPDATE_ERROR] prefix when source ID lookup fails', async () => {
    // Setup test conditions
    const sourceId = 'invalid-source-id';
    
    // Mock source ID lookup to throw error
    const selectMock = db.select as jest.Mock;
    selectMock.mockImplementationOnce(() => {
      throw new Error('Database connection error during source ID lookup');
    });
    
    // Execute function - expect it to throw
    await expect(
      projectsDb.updateTask(sourceId, { completed: true })
    ).rejects.toThrow();
    
    // Verify error logs with [TASK_UPDATE_ERROR] prefix
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_UPDATE_ERROR]'),
      expect.any(String)
    );
    
    // Verify error includes context about sourceId
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_UPDATE_ERROR]'),
      expect.stringContaining(sourceId)
    );
  });
  
  test('should handle case where source ID is also a task ID prefix', async () => {
    // Setup test scenario where sourceId could also be a prefix of a task ID
    const ambiguousId = '12345678';  // Could be sourceId or prefix
    const taskWithSourceId = { id: 'task-1', sourceId: ambiguousId, text: 'Task with this source ID' };
    const taskWithPrefixId = { id: '12345678-abcd-1234', sourceId: null, text: 'Task with ID starting with the ambiguous ID' };
    
    // Mock the first sourceId lookup to return a task
    const whereMock = db.where as jest.Mock;
    whereMock.mockImplementationOnce(() => Promise.resolve([taskWithSourceId]));
    
    // Mock successful update
    const updateMock = db.update as jest.Mock;
    updateMock.mockReturnValue({ 
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ ...taskWithSourceId, completed: true }])
      })
    });
    
    // Execute the update
    await projectsDb.updateTask(ambiguousId, { completed: true });
    
    // Verify the source ID match was used instead of trying prefix matching
    const updateWhereSpy = updateMock().set().where;
    expect(updateWhereSpy).toHaveBeenCalledWith(eq(projectTasks.id, taskWithSourceId.id));
    
    // Verify logs show it matched via sourceId
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('[TASK_LOOKUP]'),
      expect.objectContaining({
        matchedVia: 'sourceId'
      })
    );
  });
});