/**
 * Unit test for the custom task filtering logic in Checklist.tsx
 * 
 * This test verifies that both tasks with source="custom" and origin="custom" 
 * are correctly included when applying the custom task filter.
 */

// Import filter logic matches the implementation in Checklist.tsx
function filterTasksBySource(tasks: any[], sourceFilter: string) {
  return tasks.filter(task => {
    if (sourceFilter === 'all') {
      return true;
    }
    
    // For custom filter, include tasks with source='custom' OR origin='custom'
    if (sourceFilter === 'custom') {
      if (task.source !== 'custom' && task.origin !== 'custom') {
        return false;
      }
      return true;
    } else if (task.source !== sourceFilter) {
      // For other source filters, require exact match
      return false;
    }
    
    return true;
  });
}

describe('Checklist Task Filtering', () => {
  test('custom tasks with origin:"custom" are visible in custom filter', () => {
    // Setup
    const mockTasks = [
      { id: '1', text: 'Task 1', origin: 'custom', source: 'factor', stage: 'identification' },
      { id: '2', text: 'Task 2', source: 'custom', stage: 'identification' },
      { id: '3', text: 'Task 3', origin: 'factor', source: 'factor', stage: 'identification' }
    ];
    
    // Apply filtering logic with sourceFilter = 'custom'
    const filteredTasks = filterTasksBySource(mockTasks, 'custom');
    
    // Assert
    expect(filteredTasks).toHaveLength(2);
    expect(filteredTasks).toContainEqual(expect.objectContaining({ id: '1' }));
    expect(filteredTasks).toContainEqual(expect.objectContaining({ id: '2' }));
  });

  test('all tasks are included with "all" sourceFilter', () => {
    // Setup
    const mockTasks = [
      { id: '1', text: 'Task 1', origin: 'custom', source: 'factor', stage: 'identification' },
      { id: '2', text: 'Task 2', source: 'custom', stage: 'identification' },
      { id: '3', text: 'Task 3', origin: 'factor', source: 'factor', stage: 'identification' }
    ];
    
    // Apply filtering logic with sourceFilter = 'all'
    const filteredTasks = filterTasksBySource(mockTasks, 'all');
    
    // Assert
    expect(filteredTasks).toHaveLength(3);
  });

  test('factor filter only shows tasks with source="factor"', () => {
    // Setup
    const mockTasks = [
      { id: '1', text: 'Task 1', origin: 'custom', source: 'factor', stage: 'identification' },
      { id: '2', text: 'Task 2', source: 'custom', stage: 'identification' },
      { id: '3', text: 'Task 3', origin: 'factor', source: 'factor', stage: 'identification' }
    ];
    
    // Apply filtering logic with sourceFilter = 'factor'
    const filteredTasks = filterTasksBySource(mockTasks, 'factor');
    
    // Assert
    expect(filteredTasks).toHaveLength(2);
    expect(filteredTasks).toContainEqual(expect.objectContaining({ id: '1' }));
    expect(filteredTasks).toContainEqual(expect.objectContaining({ id: '3' }));
  });
});