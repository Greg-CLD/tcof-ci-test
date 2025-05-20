/**
 * Unit test for the cleanTaskId utility function
 * This tests the consistent UUID extraction from compound task IDs
 */
import { cleanTaskId, createTaskEndpoint } from '../../client/src/utils/cleanTaskId';

describe('cleanTaskId utility', () => {
  test('extracts UUID correctly from compound IDs', () => {
    const testCases = [
      {
        input: '2f565bf9-70c7-5c41-93e7-c6c4cde32312-success-factor',
        expected: '2f565bf9-70c7-5c41-93e7-c6c4cde32312'
      },
      {
        input: '2f565bf9-70c7-5c41-93e7-c6c4cde32312',
        expected: '2f565bf9-70c7-5c41-93e7-c6c4cde32312'
      },
      {
        input: '2f565bf9-70c7-5c41-93e7-c6c4cde32312-some-extra-data-1234567890',
        expected: '2f565bf9-70c7-5c41-93e7-c6c4cde32312'
      },
      {
        input: '',
        expected: ''
      }
    ];

    testCases.forEach(({ input, expected }) => {
      expect(cleanTaskId(input)).toBe(expected);
    });
  });

  test('creates correct endpoint for task operations', () => {
    const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
    const taskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-suffix';
    const cleanedId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';
    
    const endpoint = createTaskEndpoint(projectId, taskId);
    
    // Verify endpoint is properly formatted with cleaned UUID
    const expected = `/api/projects/${projectId}/tasks/${cleanedId}`;
    expect(endpoint).toBe(expected);
    
    // Verify endpoint doesn't contain the suffix
    expect(endpoint).not.toContain('suffix');
  });
  
  test('handles empty or invalid inputs gracefully', () => {
    // Empty project ID
    expect(createTaskEndpoint('', 'task-id')).toBe('/api/projects//tasks/task-id');
    
    // Empty task ID
    expect(createTaskEndpoint('project-id', '')).toBe('/api/projects/project-id/tasks/');
    
    // Both empty
    expect(createTaskEndpoint('', '')).toBe('/api/projects//tasks/');
  });
});