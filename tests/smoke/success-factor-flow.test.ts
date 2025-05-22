
import { expect, test } from '@playwright/test';

test('Success Factor task completion preserves metadata', async ({ page }) => {
  // 1. Login and navigate to project page
  await page.goto('http://localhost:5000/login');
  await page.fill('input[name="email"]', 'greg@confluity.co.uk');
  await page.fill('input[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');

  // 2. Create a Success Factor task via UI
  await page.goto('/projects/bc55c1a2-0cdf-4108-aa9e-44b44baea3b8/tasks');
  await page.click('[data-testid="add-success-factor-task"]');
  await page.fill('[data-testid="task-text"]', 'Test Success Factor Task');
  await page.click('[data-testid="save-task"]');

  // 3. Verify task creation response
  const taskResponse = await page.waitForResponse(resp => 
    resp.url().includes('/api/projects') && resp.request().method() === 'POST'
  );
  const createdTask = await taskResponse.json();
  expect(createdTask.origin).toBe('factor');
  expect(createdTask.sourceId).toBeDefined();

  // 4. Mark task as complete
  await page.click(`[data-testid="task-${createdTask.id}-complete"]`);
  
  // 5. Verify update preserves metadata
  const updateResponse = await page.waitForResponse(resp =>
    resp.url().includes(createdTask.id) && resp.request().method() === 'PUT'
  );
  const updatedTask = await updateResponse.json();
  expect(updatedTask.completed).toBe(true);
  expect(updatedTask.origin).toBe('factor');
  expect(updatedTask.sourceId).toBe(createdTask.sourceId);

  // 6. Refresh and verify persistence
  await page.reload();
  const tasksResponse = await page.waitForResponse(resp =>
    resp.url().includes('/api/projects') && resp.request().method() === 'GET'
  );
  const allTasks = await tasksResponse.json();
  const refreshedTask = allTasks.find(t => t.id === createdTask.id);
  
  expect(refreshedTask.completed).toBe(true);
  expect(refreshedTask.origin).toBe('factor');
  expect(refreshedTask.sourceId).toBe(createdTask.sourceId);
});
