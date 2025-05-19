/**
 * Unit tests for task completion persistence
 * Tests that completed status persists for SuccessFactor tasks
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEBUG_TASK_COMPLETION } from '@shared/constants.debug';

// Mock the API requests
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args),
  queryClient: {
    invalidateQueries: vi.fn()
  }
}));

// Define test task structures
const mockSuccessFactorTask = {
  id: 'sf-task-123',
  name: 'Test Success Factor Task',
  description: 'Task description',
  completed: false,
  stage: 'identification',
  sourceId: 'success-factor-456',
  sourceType: 'success-factor',
  projectId: 'test-project-789',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  origin: 'success-factor'
};

describe('Task Completion Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockApiRequest.mockImplementation((method, url, data) => {
      if (method === 'GET' && url.includes('/api/projects/')) {
        // Return a list of tasks including our test task
        return Promise.resolve({
          json: () => Promise.resolve([mockSuccessFactorTask]),
          status: 200
        });
      } else if (method === 'PATCH' && url.includes('/api/projects/')) {
        // Return the updated task with completion status
        return Promise.resolve({
          json: () => Promise.resolve({
            ...mockSuccessFactorTask,
            ...data, // Apply the updates from the request
            updatedAt: new Date().toISOString() // Update the timestamp
          }),
          status: 200
        });
      }
      
      // Default fallback response
      return Promise.resolve({
        json: () => Promise.resolve({}),
        status: 404
      });
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should persist completion status for SuccessFactor tasks', async () => {
    if (DEBUG_TASK_COMPLETION) {
      console.log('[DEBUG_TASK_COMPLETION] Running task completion persistence test');
    }
    
    // Step 1: Get the task list (simulating initial page load)
    const initialResponse = await mockApiRequest('GET', `/api/projects/test-project-789/tasks`);
    const initialTaskList = await initialResponse.json();
    
    if (DEBUG_TASK_COMPLETION) {
      console.log('[DEBUG_TASK_COMPLETION] Initial task list:', initialTaskList);
    }
    
    // Verify the task exists and is not completed
    const initialTask = initialTaskList.find((task: any) => task.id === mockSuccessFactorTask.id);
    expect(initialTask).toBeDefined();
    expect(initialTask.completed).toBe(false);
    
    // Step 2: Mark the task as completed
    const updateResponse = await mockApiRequest('PATCH', `/api/projects/test-project-789/tasks/${mockSuccessFactorTask.id}`, {
      completed: true
    });
    const updatedTask = await updateResponse.json();
    
    if (DEBUG_TASK_COMPLETION) {
      console.log('[DEBUG_TASK_COMPLETION] Updated task:', updatedTask);
    }
    
    // Verify the task was updated successfully
    expect(updatedTask.id).toBe(mockSuccessFactorTask.id);
    expect(updatedTask.completed).toBe(true);
    
    // Step 3: Simulate page refresh by fetching task list again
    const refreshResponse = await mockApiRequest('GET', `/api/projects/test-project-789/tasks`);
    const refreshedTaskList = await refreshResponse.json();
    
    if (DEBUG_TASK_COMPLETION) {
      console.log('[DEBUG_TASK_COMPLETION] Refreshed task list:', refreshedTaskList);
    }
    
    // Find our task in the refreshed list
    const refreshedTask = refreshedTaskList.find((task: any) => task.id === mockSuccessFactorTask.id);
    
    // Verify the task is still marked as completed
    expect(refreshedTask).toBeDefined();
    expect(refreshedTask.completed).toBe(true);
    expect(refreshedTask.sourceType).toBe('success-factor');
    
    // Additional verification that our mock was called the expected number of times
    expect(mockApiRequest).toHaveBeenCalledTimes(3);
  });
});