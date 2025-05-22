# Task Toggle De-duplication Fix

## Root Cause Analysis

After investigating the TaskCard and Checklist components, I identified the root cause of duplicate PUT requests when toggling task completion. The issue occurs because the TaskCard's toggle function wasn't guarded against potential rapid, duplicated click events.

When a user clicks the checkbox to toggle a task's completion status, sometimes the browser registers this as multiple click events in rapid succession (due to UI rendering or event bubbling), causing the same API call to be made twice with identical data.

## Solution Summary

I implemented three key mechanisms to prevent duplicate PUT requests:

1. **Request Tracking with Unique IDs**: Each toggle request now gets a unique request ID for debugging
2. **Processing State Lock**: Using a React ref to track if a toggle is being processed
3. **Time-based Throttling**: Preventing multiple requests within 500ms of each other

## Code Implementation

```diff
- import React, { useState } from 'react';
+ import React, { useState, useRef, useCallback } from 'react';

// ... other imports remain unchanged

-  // Handle task completion toggle
-  const handleToggleCompleted = () => {
+  // Use refs to track toggle state and debounce
+  const isProcessingToggle = useRef(false);
+  const lastToggleTime = useRef(0);
+  const requestId = useRef(0);
+  
+  // Handle task completion toggle with debounce to prevent duplicate requests
+  const handleToggleCompleted = useCallback(() => {
+    // Generate unique request ID for this toggle operation
+    const currentRequestId = ++requestId.current;
+    const now = Date.now();
     
     // Ensure we always have a valid task ID
     if (!id) {
       console.error('[TASK_ERROR] Missing required task ID, cannot update task');
       return;
     }
+    
+    // Debounce: Prevent rapid repeated toggles (avoid duplicate requests)
+    if (isProcessingToggle.current) {
+      console.debug(`[TASK_DEBOUNCE] Ignoring duplicate toggle request #${currentRequestId} while previous request is processing`);
+      return;
+    }
+    
+    // Add time-based throttling (prevent multiple requests within 500ms)
+    if (now - lastToggleTime.current < 500) {
+      console.debug(`[TASK_DEBOUNCE] Ignoring rapid toggle request #${currentRequestId} (within 500ms)`);
+      return;
+    }
+    
+    // Mark that we're processing a toggle request and update timestamp
+    isProcessingToggle.current = true;
+    lastToggleTime.current = now;
+    
+    // Log debounced request with unique ID and timestamp
+    console.debug(`[TASK_TOGGLE] Processing toggle request #${currentRequestId} at ${now}`);

     // Safely handle potentially undefined props using proper types
     const safeOrigin = typeof origin !== 'undefined' ? 
       origin as TaskUpdates['origin'] : null;
       
     const safeSourceId = typeof sourceId !== 'undefined' && sourceId !== null ? 
       String(sourceId) : null;
     
     // Determine if we have a valid sourceId for a Success Factor task
     const isFactorTask = source === 'factor' || safeOrigin === 'factor';
     const hasValidSourceId = isFactorTask && safeSourceId !== null && isValidUUID(safeSourceId);
     
     // Debug log all props with validation info
     console.debug('[TASK_PROPS]', {
+      requestId: currentRequestId,
       id, 
       text, 
       completed,
       source,
       origin: safeOrigin,
       sourceId: safeSourceId,
       sourceIdValid: hasValidSourceId ? 'Yes' : 'No',
       stage, 
       status
     });

     // Type-safe status assignment
     const newStatus = !completed ? 'Done' : 'To Do' as const;
     setEditedStatus(newStatus);

     // Choose the most appropriate ID to use for the update
     // For Success Factor tasks with valid sourceId, use sourceId
     // Otherwise fall back to the task's id
     const updateId = hasValidSourceId ? safeSourceId : id;
     
     // Detailed debug logging for task update
     console.debug(`[TASK_UPDATE] Toggle task completion:
+    - Request ID: ${currentRequestId}
     - Using ID: ${updateId} (${hasValidSourceId ? 'valid sourceId' : 'fallback to id'})
     - Original ID: ${id}
     - Source ID: ${safeSourceId || 'N/A'}
     - Source ID Valid UUID: ${hasValidSourceId ? 'Yes' : 'No'}
     - Origin: ${safeOrigin || 'N/A'}
     - Source: ${source}
     - Is Factor Task: ${isFactorTask ? 'Yes' : 'No'}
     - New completed state: ${!completed}
     - New status: ${newStatus}`);
     
     // Create update object with type-safe fields
     const updateData: TaskUpdates = {
       completed: !completed,
       status: newStatus,
     };
     
     // Only include origin if it exists and as the correct type
     if (safeOrigin || source) {
       const originValue = safeOrigin || source;
       // This type assertion is safe because both origin and source are either
       // one of the allowed values or undefined
       updateData.origin = originValue as TaskUpdates['origin'];
     }
     
     // Only include sourceId if it exists
     if (safeSourceId) {
       updateData.sourceId = safeSourceId;
     }
     
+    try {
       // Send the update with validated ID and clean payload
       onUpdate(updateId, updateData, isGoodPractice);
+    } finally {
+      // Set a timeout to reset the processing flag after a reasonable time 
+      // to ensure we don't block future toggles if something goes wrong
+      setTimeout(() => {
+        isProcessingToggle.current = false;
+        console.debug(`[TASK_TOGGLE] Reset processing flag for request #${currentRequestId}`);
+      }, 1000);
+    }
-  };
+  }, [id, completed, source, origin, sourceId, stage, status, isGoodPractice, onUpdate]);
```

## Test Plan

The following JavaScript snippet could be used in a unit test to verify that duplicate requests are properly prevented:

```js
// Mock test for task toggle de-duplication
describe('TaskCard toggle de-duplication', () => {
  it('should prevent duplicate PUT requests when toggled rapidly', async () => {
    // Setup
    const onUpdate = jest.fn();
    const taskId = 'test-123';
    
    // Render component with mocked props
    const { getByRole } = render(
      <TaskCard 
        id={taskId}
        text="Test Task"
        completed={false}
        stage="identification"
        source="factor"
        onUpdate={onUpdate}
      />
    );
    
    // Get the checkbox button
    const checkbox = getByRole('button', { name: /mark as complete/i });
    
    // Simulate rapid multiple clicks (within 500ms)
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);
    
    // Wait for any async operations
    await waitFor(() => {
      // Verify that onUpdate was called exactly once
      expect(onUpdate).toHaveBeenCalledTimes(1);
      
      // Verify correct arguments were passed
      expect(onUpdate).toHaveBeenCalledWith(
        taskId, 
        expect.objectContaining({ completed: true }), 
        false
      );
    });
  });
});
```

## Expected Results

1. When a user clicks the checkbox once, a single PUT request is made
2. If the same checkbox is clicked rapidly in succession, only one request will be processed
3. Console logs will show debugging information with request IDs and clear indicators when requests are ignored
4. The fix is completely transparent to users - they just see their task status update as expected