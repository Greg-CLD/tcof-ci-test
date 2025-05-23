
const { db } = require('../../server/db');
const assert = require('assert');

async function testTaskPersistence() {
  // Test project/task IDs
  const projectId = '7277a5fe-899b-4fe6-8e35-05dd6103d054';
  const taskId = '3f197b9f-51f4-5c52-b05e-c035eeb92621';
  const wrongProjectId = '9a4c7110-bb5b-4321-a4ba-6c59366c8e96';

  console.log('\n=== Task Toggle & Persistence Test ===');

  // 1. Verify task exists in DB
  const beforeTask = await db.execute(
    'SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2',
    [taskId, projectId]
  );
  console.log('Task exists in DB:', !!beforeTask.rows[0]);

  // 2. Attempt correct project toggle
  const validResponse = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({completed: true})
  });
  console.log('Valid toggle response:', validResponse.status);

  // 3. Verify persistence
  const afterTask = await db.execute(
    'SELECT * FROM project_tasks WHERE id = $1',
    [taskId]
  );
  console.log('Task persisted:', afterTask.rows[0].completed === true);

  // 4. Attempt cross-project toggle (should fail)
  const invalidResponse = await fetch(`/api/projects/${wrongProjectId}/tasks/${taskId}`, {
    method: 'PUT', 
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({completed: false})
  });
  console.log('Cross-project toggle blocked:', invalidResponse.status === 403);

  // 5. Verify original state wasn't affected
  const finalTask = await db.execute(
    'SELECT * FROM project_tasks WHERE id = $1',
    [taskId]
  );
  console.log('Original task state preserved:', finalTask.rows[0].completed === true);
  
  console.log('=== Task Persistence Smoke Test ===');
  
  // Get initial state
  const beforeTask = await db.execute(
    'SELECT * FROM project_tasks WHERE id = $1',
    [taskId]
  );
  console.log('Before state:', beforeTask.rows[0]);
  
  // Attempt update
  const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({completed: true})
  });
  
  console.log('Response status:', response.status);
  console.log('Response body:', await response.text());
  
  // Verify final state
  const afterTask = await db.execute(
    'SELECT * FROM project_tasks WHERE id = $1',
    [taskId]
  );
  console.log('After state:', afterTask.rows[0]);
  
  // Assert persistence
  assert.strictEqual(afterTask.rows[0].completed, true);
}

testTaskPersistence().catch(console.error);
const { test } = require('@playwright/test');

test('task completion persists after page reload', async ({ page }) => {
  // Login and navigate to project
  await page.goto('/projects/7277a5fe-899b-4fe6-8e35-05dd6103d054/checklist');
  
  // Find and toggle a task
  const taskCard = page.locator('[data-testid="task-item"]').first();
  const taskId = await taskCard.getAttribute('data-task-id');
  const initialState = await taskCard.getAttribute('data-completed');
  
  // Toggle completion
  await taskCard.locator('[data-testid="task-checkbox"]').click();
  
  // Reload page
  await page.reload();
  
  // Verify persistence
  const updatedTask = page.locator(`[data-task-id="${taskId}"]`);
  const newState = await updatedTask.getAttribute('data-completed');
  expect(newState).not.toBe(initialState);
});
