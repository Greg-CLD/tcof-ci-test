
const { db } = require('../../server/db');
const assert = require('assert');

async function testTaskPersistence() {
  const projectId = '7277a5fe-899b-4fe6-8e35-05dd6103d054';
  const taskId = '3f197b9f-51f4-5c52-b05e-c035eeb92621';
  
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
