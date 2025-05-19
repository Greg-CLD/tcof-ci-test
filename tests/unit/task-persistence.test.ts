
import { expect, test, describe } from 'vitest';
import { projectsDb } from '../../server/projectsDb';

describe('Task Persistence', () => {
  test('Success factor task completion should persist after update', async () => {
    // Create a test task
    const taskData = {
      projectId: 'test-project-id',
      text: 'Test Factor Task',
      stage: 'identification',
      origin: 'factor',
      sourceId: 'test-factor-id',
      completed: false
    };
    
    const task = await projectsDb.createTask(taskData);
    expect(task).toBeTruthy();
    expect(task.completed).toBe(false);
    
    // Update task completion
    const updated = await projectsDb.updateTask(task.id, {
      completed: true
    });
    
    expect(updated.completed).toBe(true);
    
    // Verify persistence by fetching again
    const fetched = await projectsDb.getTaskById(task.id);
    expect(fetched.completed).toBe(true);
  });

  test('Should handle source/origin field mapping correctly', async () => {
    // Create task with source field
    const taskData = {
      projectId: 'test-project-id', 
      text: 'Test Source Field',
      stage: 'identification',
      source: 'factor', // Using source instead of origin
      sourceId: 'test-factor-id',
      completed: false
    };

    const task = await projectsDb.createTask(taskData);
    expect(task.origin).toBe('factor');
  });
});
