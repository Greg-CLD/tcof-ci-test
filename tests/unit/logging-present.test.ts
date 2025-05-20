/**
 * Unit tests for [NET] logging functionality in task operations
 * 
 * These tests verify that our tasks operations always log network request
 * information before making API calls and consistently use clean UUIDs
 */

// Mock setup
const consoleSpy = jest.spyOn(console, 'log');
const mockApiRequest = jest.fn();

// Mock the apiRequest function
jest.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args),
  queryClient: { invalidateQueries: jest.fn(), setQueryData: jest.fn() }
}));

import { useProjectTasks } from '../../client/src/hooks/useProjectTasks';

describe('Task Operation Logging', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
    mockApiRequest.mockClear();
    mockApiRequest.mockResolvedValue({ ok: true, json: () => Promise.resolve({ task: { id: 'test-id' } }) });
  });

  test('logs [NET] info before updating a task', async () => {
    const projectId = 'test-project-id';
    const { updateTask } = useProjectTasks(projectId);
    
    // Set up a compound task ID
    const taskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-factor-suffix';
    const cleanId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
    
    // Call the update function
    await updateTask(taskId, { completed: true });
    
    // Verify logging happens before the API call
    expect(consoleSpy).toHaveBeenCalledWith(
      '[NET]', 
      expect.objectContaining({ 
        rawId: taskId,
        cleanId,
        endpoint: `/api/projects/${projectId}/tasks/${cleanId}`
      })
    );
    
    // Verify that the API call was made with the clean ID
    expect(mockApiRequest).toHaveBeenCalledWith(
      'PUT',
      `/api/projects/${projectId}/tasks/${cleanId}`,
      expect.objectContaining({ completed: true })
    );
  });

  test('logs [NET] info before deleting a task', async () => {
    const projectId = 'test-project-id';
    const { deleteTask } = useProjectTasks(projectId);
    
    // Set up a compound task ID
    const taskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-factor-suffix';
    const cleanId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
    
    // Call the delete function
    await deleteTask(taskId);
    
    // Verify logging happens before the API call
    expect(consoleSpy).toHaveBeenCalledWith(
      '[NET]', 
      expect.objectContaining({ 
        rawId: taskId,
        cleanId,
        endpoint: `/api/projects/${projectId}/tasks/${cleanId}`
      })
    );
    
    // Verify that the API call was made with the clean ID
    expect(mockApiRequest).toHaveBeenCalledWith(
      'DELETE',
      `/api/projects/${projectId}/tasks/${cleanId}`
    );
  });
});