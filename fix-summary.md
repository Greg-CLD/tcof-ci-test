# Task Update Response Fix Summary

## Problem
When updating a Success Factor task via the PUT /api/projects/:projectId/tasks/:taskId endpoint, the server was returning the canonical/source task object rather than the updated user's task object. This caused field mismatches in the UI and broke state reconciliation.

## Solution
The fix ensures that the API returns the user's task object with all updates applied, matching the ID that was used in the request. This maintains the integrity of task references in the client application.

## Implementation
I modified the task update endpoint in `server/routes.ts` to:
1. Store the original user task's ID before updating
2. Update the underlying source/canonical task as before
3. Return a properly constructed user task object with the original ID and the updated fields

## Minimal Code Diff
```diff
// In server/routes.ts - PUT /api/projects/:projectId/tasks/:taskId handler
      // Step 2: Update the task
      try {
-        const updatedTask = await projectsDb.updateTask(taskId, updateData);
+        // Store original task details before update
+        const userTaskId = originalTask.id;
+        
+        // Update the underlying task (which might be a different object for success factors)
+        const updatedSourceTask = await projectsDb.updateTask(taskId, updateData);
         
         if (isDebugEnabled) {
           console.log(`[DEBUG_TASK_API] Task updated successfully`);
+          console.log(`[DEBUG_TASK_API] Using user's task ID for response: ${userTaskId}`);
         }
         
+        // Create an updated user task object by merging original task with updates
+        // This ensures we return the task object with the ID that the user expects
+        const updatedUserTask = {
+          ...originalTask,           // Start with the user's original task (includes correct ID)
+          ...updateData,             // Apply the user's updates
+          updatedAt: new Date()      // Add updatedAt timestamp
+        };
+        
         return res.status(200).json({
           success: true,
           message: 'Task updated successfully',
-          task: updatedTask
+          task: updatedUserTask      // Return user's task with updates applied, not source task
         });
       } catch (updateError) {
```

## Unit Test
```javascript
it('should return the updated user task, not the canonical source, after update', async () => {
  // Given a user task and a canonical source
  const userTask = { id: 'user-task-123', sourceId: 'source-abc', completed: false, origin: 'factor' };
  const originalState = { ...userTask };
  
  // When updating the user task
  const response = await updateTask(userTask.id, { completed: true });
  
  // Then the response should return the user task (ID matches), not the source
  expect(response.task.id).toBe(userTask.id);
  expect(response.task.completed).toBe(true);
  expect(response.task.origin).toBe(originalState.origin);
  expect(response.task.sourceId).toBe(originalState.sourceId);
});
```

## Expected JSON Response After Fix
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": "f219d47b-39b5-5be1-86f2-e0ec3afc8e3b-suffix123",
    "text": "Task text",
    "origin": "factor",
    "sourceId": "f219d47b-39b5-5be1-86f2-e0ec3afc8e3b-suffix123",
    "completed": true,
    "updatedAt": "2025-05-22T08:40:12.345Z"
  }
}
```

## Conclusion
This fix ensures that the UI receives consistent task objects with the expected IDs, maintaining state reconciliation and preventing the issue where task completion state wasn't persisting properly in the UI.