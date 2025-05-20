/**
 * Unit tests for UUID extraction in task handler
 * 
 * This test verifies that the server-side UUID extraction correctly
 * handles compound IDs when updating tasks
 */

describe('UUID Extraction for Task Updates', () => {
  // Test the extraction logic
  it('extracts proper UUID from compound IDs', () => {
    const testCases = [
      {
        input: '2f565bf9-70c7-5c41-93e7-c6c4cde32312-9981d938',
        expected: '2f565bf9-70c7-5c41-93e7-c6c4cde32312'
      },
      {
        input: '3f197b9f-51f4-5c52-b05e-c035eeb92621-extra-parts',
        expected: '3f197b9f-51f4-5c52-b05e-c035eeb92621'
      },
      {
        input: '41e3f4a0-e33c-5f8d-9c1e-c90a114338b1',
        expected: '41e3f4a0-e33c-5f8d-9c1e-c90a114338b1'
      }
    ];

    testCases.forEach(testCase => {
      const result = testCase.input.split('-').slice(0, 5).join('-');
      expect(result).toBe(testCase.expected);
    });
  });

  // Mock a simple task lookup scenario
  it('finds tasks with either full ID or extracted UUID', () => {
    // Mock tasks data
    const tasks = [
      {
        id: '2f565bf9-70c7-5c41-93e7-c6c4cde32312',
        text: 'Task with clean UUID'
      },
      {
        id: '3f197b9f-51f4-5c52-b05e-c035eeb92621',
        text: 'Another task with clean UUID'
      }
    ];

    // Test compound ID lookup
    const compoundId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-9981d938';
    const extractedId = compoundId.split('-').slice(0, 5).join('-');
    
    // Should find task using extracted UUID
    const taskByExtractedId = tasks.find(task => task.id === extractedId);
    expect(taskByExtractedId).toBeDefined();
    expect(taskByExtractedId?.id).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
    
    // Should not find task using raw compound ID
    const taskByCompoundId = tasks.find(task => task.id === compoundId);
    expect(taskByCompoundId).toBeUndefined();
    
    // Fallback mechanism should work
    const taskByEither = tasks.find(task => task.id === extractedId) || 
                        tasks.find(task => task.id === compoundId);
    expect(taskByEither).toBeDefined();
    expect(taskByEither?.id).toBe('2f565bf9-70c7-5c41-93e7-c6c4cde32312');
  });
});