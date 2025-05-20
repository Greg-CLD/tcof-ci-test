/**
 * Unit Tests for Task Update Error Handling
 * 
 * These tests verify that:
 * 1. Appropriate error logs are generated with [TASK_UPDATE_ERROR] prefix
 * 2. Stack traces are included in error logs
 * 3. Error context includes input projectId and taskId
 * 4. Error reporting includes information on whether lookup matched
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

describe('Task Update Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  describe('Task Lookup Errors', () => {
    test('should log errors with [TASK_UPDATE_ERROR] prefix when task not found', async () => {
      // Mock a scenario where no task matches
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // First mock: sourceId lookup fails
      whereMock.mockImplementationOnce(() => Promise.resolve([]));
      
      // Second mock: exact ID lookup fails
      whereMock.mockImplementationOnce(() => Promise.resolve([]));
      
      // Third mock: all tasks lookup returns empty array
      selectMock.mockImplementationOnce(() => ({
        from: () => Promise.resolve([])
      }));
      
      // Execute the function and expect it to throw
      await expect(
        projectsDb.updateTask('non-existent-id', { completed: true })
      ).rejects.toThrow();
      
      // Verify error logs contain expected prefixes and information
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.any(String)
      );
      
      // Check that error contains information about task not being found
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('Task not found')
      );
      
      // Verify the logs include the ID that was attempted
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('non-existent-id')
      );
    });
    
    test('should log database lookup errors with stack traces', async () => {
      // Mock a database error during lookup
      const dbError = new Error('Database connection error');
      const selectMock = db.select as jest.Mock;
      
      // Mock the database throwing an error
      selectMock.mockImplementationOnce(() => {
        throw dbError;
      });
      
      // Execute the function and expect it to throw
      await expect(
        projectsDb.updateTask('test-id', { completed: true })
      ).rejects.toThrow();
      
      // Verify error logs contain stack trace
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.any(String),
        expect.stringContaining('Stack trace:'),
        expect.any(String)
      );
      
      // Verify error includes the original error details
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.any(String),
        dbError
      );
    });
  });
  
  describe('Database Update Errors', () => {
    test('should log specific errors during the database update operation', async () => {
      // Setup test conditions: task is found but update fails
      const taskId = 'existing-task-id';
      const mockTask = { id: taskId, text: 'Task to update' };
      
      // Mock task lookup success
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // Mock exact ID lookup returns the task
      whereMock.mockImplementationOnce(() => Promise.resolve([])); // sourceId check
      whereMock.mockImplementationOnce(() => Promise.resolve([mockTask])); // exact ID check
      
      // Mock update throws an error
      const updateMock = db.update as jest.Mock;
      const setMock = jest.fn().mockReturnThis();
      const returningSpy = jest.fn().mockImplementation(() => {
        throw new Error('Database constraint error');
      });
      
      updateMock.mockReturnValue({ 
        set: setMock,
        where: jest.fn().mockReturnValue({
          returning: returningSpy
        })
      });
      
      // Execute the function and expect it to throw
      await expect(
        projectsDb.updateTask(taskId, { completed: true })
      ).rejects.toThrow();
      
      // Verify error logs include update operation context
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('Database error updating task')
      );
      
      // Verify error includes matched method information
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('Task was found via'),
        expect.stringContaining('but update operation failed')
      );
    });
    
    test('should include input data in error logs for data processing errors', async () => {
      // Setup conditions: task is found but data processing fails
      const taskId = 'existing-task-id';
      const badData = { text: null }; // This will cause an error when trying to call String(null)
      const mockTask = { id: taskId, text: 'Task to update' };
      
      // Mock task lookup success
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // Mock exact ID lookup returns the task
      whereMock.mockImplementationOnce(() => Promise.resolve([])); // sourceId check
      whereMock.mockImplementationOnce(() => Promise.resolve([mockTask])); // exact ID check
      
      // Execute the function with problematic data
      await expect(
        projectsDb.updateTask(taskId, badData as any)
      ).rejects.toThrow();
      
      // Verify error logs include the input data
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('Input data:'),
        expect.any(String)
      );
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle and log errors during post-update conversion', async () => {
      // Setup test conditions: update succeeds but conversion fails
      const taskId = 'existing-task-id';
      const mockTask = { id: taskId, text: 'Task to update' }; 
      const badUpdateResult = { id: taskId, malformedDate: new Date('invalid-date') }; // Will cause conversion error
      
      // Mock successful task lookup
      const selectMock = db.select as jest.Mock;
      const fromMock = db.from as jest.Mock;
      const whereMock = db.where as jest.Mock;
      
      // Mock exact ID lookup returns the task
      whereMock.mockImplementationOnce(() => Promise.resolve([])); // sourceId check
      whereMock.mockImplementationOnce(() => Promise.resolve([mockTask])); // exact ID check
      
      // Mock successful update but with malformed data
      const updateMock = db.update as jest.Mock;
      const setMock = jest.fn().mockReturnThis();
      const returningSpy = jest.fn().mockResolvedValue([badUpdateResult]);
      
      updateMock.mockReturnValue({ 
        set: setMock,
        where: jest.fn().mockReturnValue({
          returning: returningSpy
        })
      });
      
      // Execute and expect error
      await expect(
        projectsDb.updateTask(taskId, { completed: true })
      ).rejects.toThrow();
      
      // Verify specific error logs for conversion failure
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('Error converting task'),
        expect.any(String)
      );
      
      // Verify raw data is included in logs
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('[TASK_UPDATE_ERROR]'),
        expect.stringContaining('Raw task data:'),
        expect.any(String)
      );
    });
  });
});