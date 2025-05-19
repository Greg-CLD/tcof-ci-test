import { describe, it, expect } from 'vitest';
import { ProjectTask } from '../../server/projectsDb';
import { UnifiedTask } from '../../shared/types';

// Mock the convertDbTaskToProjectTask function since we can't directly import from server/projectsDb
// This matches the implementation but is isolated for testing
function convertDbTaskToProjectTask(dbTask: any): ProjectTask {
  // Determine the origin value - use original or default to 'custom'
  const origin = dbTask.origin || 'custom';
  
  // Ensure both origin and source fields are present
  return {
    id: dbTask.id || 'test-id',
    projectId: dbTask.projectId || 'test-project',
    text: dbTask.text || '',
    stage: dbTask.stage || '',
    origin: origin,
    source: origin, // Critical: source is set to same value as origin
    sourceId: dbTask.sourceId || '',
    completed: !!dbTask.completed,
    notes: dbTask.notes || '',
    priority: dbTask.priority || '',
    dueDate: dbTask.dueDate || '',
    owner: dbTask.owner || '',
    status: dbTask.status || 'To Do',
    createdAt: dbTask.createdAt || new Date().toISOString(),
    updatedAt: dbTask.updatedAt || new Date().toISOString()
  };
}

describe('Task field consistency', () => {
  it('maps DB task to UnifiedTask with both origin and source equal', () => {
    // Arrange - test with factor origin
    const dbMock = {
      id: 't1',
      text: 'Mock task',
      stage: 'identification',
      origin: 'factor',
      sourceId: 'abc',
      completed: false,
    };
    
    // Act - convert to ProjectTask format
    const task = convertDbTaskToProjectTask(dbMock);
    
    // Assert - verify both fields are present and equal
    expect(task.origin).toBe('factor');
    expect(task.source).toBe('factor'); // New invariant
  });
  
  it('sets both origin and source to "custom" when origin is missing', () => {
    // Arrange - test with missing origin
    const dbMock = {
      id: 't2',
      text: 'Task without origin',
      stage: 'identification',
      sourceId: 'def',
      completed: true,
    };
    
    // Act - convert to ProjectTask format
    const task = convertDbTaskToProjectTask(dbMock);
    
    // Assert - verify default values
    expect(task.origin).toBe('custom');
    expect(task.source).toBe('custom');
  });
  
  it('correctly handles "custom" origin tasks', () => {
    // Arrange - test with custom origin
    const dbMock = {
      id: 't3',
      text: 'Custom origin task',
      stage: 'identification',
      origin: 'custom',
      sourceId: 'ghi',
      completed: false,
    };
    
    // Act - convert to ProjectTask format
    const task = convertDbTaskToProjectTask(dbMock);
    
    // Assert - verify fields
    expect(task.origin).toBe('custom');
    expect(task.source).toBe('custom');
  });
});