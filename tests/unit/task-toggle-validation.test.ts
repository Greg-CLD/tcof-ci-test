
import { describe, it, expect, beforeEach } from 'vitest';
import { projectsDb } from '../../server/projectsDb';
import { taskStateManager } from '../../server/services/taskStateManager';

describe('Task Toggle Validation', () => {
  const validProjectId = '7277a5fe-899b-4fe6-8e35-05dd6103d054';
  const validTaskId = '3f197b9f-51f4-5c52-b05e-c035eeb92621';
  const invalidTaskId = 'invalid-task-id';

  beforeEach(() => {
    taskStateManager.initialize(projectsDb);
  });

  it('should accept valid project/task ID combinations', async () => {
    const result = await taskStateManager.updateTaskState(validTaskId, validProjectId, {
      completed: true
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(validTaskId);
  });

  it('should reject invalid task IDs', async () => {
    await expect(
      taskStateManager.updateTaskState(invalidTaskId, validProjectId, {
        completed: true
      })
    ).rejects.toThrow('Task not found');
  });
});
