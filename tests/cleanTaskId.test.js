/**
 * Unit tests for the clean UUID task lookup functionality
 * 
 * This tests the ability of the server to:
 * 1. Find a task by its clean UUID when the actual ID is a compound ID
 * 2. Update/delete using only the clean UUID part of the ID
 * 3. Properly handle edge cases
 */

import { expect, test, describe, beforeEach, afterEach, jest } from '@jest/globals';

// Mock plan storage for testing
const mockProject = {
  id: 'test-project-id',
  tasks: [
    {
      id: 'abc12345-6789-0123-4567-89abcdef0123-compound-suffix',
      text: 'Task with compound ID',
      completed: false,
      source_id: null
    },
    {
      id: 'def67890-1234-5678-90ab-cdef01234567',
      text: 'Task with clean ID only',
      completed: false,
      source_id: null
    }
  ]
};

// Mock projectsDb functions
jest.mock('../server/projectsDb', () => {
  const original = jest.requireActual('../server/projectsDb');
  
  return {
    ...original,
    loadProjectPlan: jest.fn().mockImplementation(() => {
      return { success: true, plan: mockProject };
    }),
    saveProjectPlan: jest.fn().mockImplementation(() => {
      return { success: true };
    })
  };
});

// Import the functions to test (after mocking)
import { updateTask, deleteTask } from '../server/projectsDb';

describe('Task ID Lookup Tests', () => {
  
  describe('updateTask function', () => {
    test('should find and update a task using clean UUID when DB has compound ID', async () => {
      // Extract only the clean UUID part
      const cleanId = 'abc12345-6789-0123-4567-89abcdef0123';
      
      const result = await updateTask('test-project-id', cleanId, { completed: true });
      
      expect(result.success).toBe(true);
      expect(result.task.id).toBe('abc12345-6789-0123-4567-89abcdef0123-compound-suffix');
      expect(result.task.completed).toBe(true);
    });
    
    test('should still find a task with exact ID match', async () => {
      const exactId = 'def67890-1234-5678-90ab-cdef01234567';
      
      const result = await updateTask('test-project-id', exactId, { completed: true });
      
      expect(result.success).toBe(true);
      expect(result.task.id).toBe(exactId);
      expect(result.task.completed).toBe(true);
    });
    
    test('should return error when no task matches either clean or exact ID', async () => {
      const nonExistentId = 'non-existent-task-id';
      
      const result = await updateTask('test-project-id', nonExistentId, { completed: true });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('deleteTask function', () => {
    test('should find and delete a task using clean UUID when DB has compound ID', async () => {
      // Extract only the clean UUID part
      const cleanId = 'abc12345-6789-0123-4567-89abcdef0123';
      
      const result = await deleteTask('test-project-id', cleanId);
      
      expect(result.success).toBe(true);
    });
    
    test('should still delete a task with exact ID match', async () => {
      const exactId = 'def67890-1234-5678-90ab-cdef01234567';
      
      const result = await deleteTask('test-project-id', exactId);
      
      expect(result.success).toBe(true);
    });
    
    test('should return error when no task matches either clean or exact ID', async () => {
      const nonExistentId = 'non-existent-task-id';
      
      const result = await deleteTask('test-project-id', nonExistentId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});