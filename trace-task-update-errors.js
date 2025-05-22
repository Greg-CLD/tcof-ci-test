/**
 * Task Update Error Tracing Script
 * 
 * This script provides a comprehensive diagnostic to trace 500 errors in task updates:
 * 1. Captures the full update lifecycle with detailed logging
 * 2. Records task state before and after attempted updates
 * 3. Monitors all API calls with timing and payload information
 * 4. Tracks field preservation for Success Factor tasks
 * 5. Analyzes error patterns to identify the root cause
 * 
 * Usage: Paste this script into your browser console when logged in
 */

async function traceTaskUpdateErrors() {
  console.clear();
  console.log('🔍 Starting Task Update Error Tracing...');
  
  // Configuration
  const config = {
    projectId: window.currentProjectId || 
      (window.AppState?.projectData?.id) || 
      prompt('Enter project ID:'),
    enableNetworkMonitoring: true,
    captureTaskFields: true,
    compareUpdates: true,
    traceSuccessFactorHandling: true,
    logRequestHeaders: true
  };
  
  if (!config.projectId) {
    console.error('No project ID found or provided');
    return;
  }
  
  console.log(`Project ID: ${config.projectId}`);
  
  // Create diagnostic state storage
  const diagnosticState = {
    apiCalls: [],
    taskUpdates: [],
    errors: [],
    successfulUpdates: [],
    failedUpdates: []
  };
  
  // Setup Network Monitoring
  if (config.enableNetworkMonitoring) {
    setupNetworkMonitoring(diagnosticState);
    console.log('Network monitoring activated');
  }
  
  // Get initial tasks
  console.log('Fetching initial tasks...');
  const initialTasks = await fetchTasks(config.projectId);
  
  if (!initialTasks || initialTasks.length === 0) {
    console.error('No tasks found for this project');
    return;
  }
  
  console.log(`Found ${initialTasks.length} tasks`);
  
  // Find Success Factor tasks
  const successFactorTasks = initialTasks.filter(task => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  
  if (successFactorTasks.length === 0) {
    console.warn('No Success Factor tasks found for testing');
  }
  
  // Display task summary
  console.log('Task Summary:');
  console.table(initialTasks.map(task => ({
    id: task.id,
    text: task.text,
    origin: task.origin || 'unknown',
    sourceId: task.sourceId || 'none',
    completed: task.completed || false
  })));
  
  // Run test cases
  console.log('\n🧪 Running Task Update Test Cases...');
  
  // Test Case 1: Toggle a Success Factor task
  if (successFactorTasks.length > 0) {
    const testTask = successFactorTasks[0];
    console.log(`\nTest Case 1: Toggle Success Factor task "${testTask.text}"`);
    console.log(`Current state: ${testTask.completed ? 'Completed' : 'Not completed'}`);
    
    try {
      // Log detailed task fields before update
      if (config.captureTaskFields) {
        console.log('Task fields before update:', captureTaskFields(testTask));
      }
      
      // Attempt to toggle the task
      const updateResult = await updateTask(
        config.projectId, 
        testTask.id, 
        { completed: !testTask.completed }
      );
      
      console.log('Update result:', updateResult);
      
      if (updateResult.error) {
        console.error('❌ Test Case 1 failed:', updateResult.error);
        diagnosticState.failedUpdates.push({
          taskId: testTask.id,
          error: updateResult.error,
          requestData: { completed: !testTask.completed },
          response: updateResult
        });
      } else {
        console.log('✅ Test Case 1 succeeded');
        diagnosticState.successfulUpdates.push({
          taskId: testTask.id,
          originalState: testTask.completed,
          newState: !testTask.completed,
          response: updateResult
        });
      }
      
      // Verify the update was persisted
      const updatedTasks = await fetchTasks(config.projectId);
      const updatedTask = updatedTasks.find(t => t.id === testTask.id);
      
      if (updatedTask) {
        console.log(`Task state after update: ${updatedTask.completed ? 'Completed' : 'Not completed'}`);
        
        // Log detailed task fields after update
        if (config.captureTaskFields) {
          console.log('Task fields after update:', captureTaskFields(updatedTask));
        }
        
        // Compare fields before and after
        if (config.compareUpdates) {
          const fieldChanges = compareTaskFields(testTask, updatedTask);
          console.log('Field changes:', fieldChanges);
        }
        
        // Check if sourceId and origin were preserved
        if (config.traceSuccessFactorHandling) {
          console.log('Success Factor field preservation:');
          console.log(`- Origin preserved: ${updatedTask.origin === testTask.origin}`);
          console.log(`- SourceId preserved: ${updatedTask.sourceId === testTask.sourceId}`);
        }
      } else {
        console.error('❌ Task not found after update!');
      }
    } catch (error) {
      console.error('❌ Test Case 1 error:', error);
      diagnosticState.errors.push({
        taskId: testTask.id,
        error: error.toString(),
        stack: error.stack
      });
    }
  }
  
  // Test Case 2: Toggle task with the task ID using sourceId for Success Factor
  if (successFactorTasks.length > 0) {
    const testTask = successFactorTasks[0];
    if (testTask.sourceId) {
      console.log(`\nTest Case 2: Toggle task using sourceId "${testTask.sourceId}"`);
      
      try {
        // Attempt to toggle the task using its sourceId
        const updateResult = await updateTask(
          config.projectId, 
          testTask.sourceId, 
          { completed: !testTask.completed }
        );
        
        console.log('Update result:', updateResult);
        
        if (updateResult.error) {
          console.error('❌ Test Case 2 failed:', updateResult.error);
          diagnosticState.failedUpdates.push({
            taskId: testTask.sourceId,
            error: updateResult.error,
            requestData: { completed: !testTask.completed },
            response: updateResult
          });
        } else {
          console.log('✅ Test Case 2 succeeded');
          diagnosticState.successfulUpdates.push({
            taskId: testTask.sourceId,
            targetTaskId: testTask.id,
            originalState: testTask.completed,
            newState: !testTask.completed,
            response: updateResult
          });
        }
      } catch (error) {
        console.error('❌ Test Case 2 error:', error);
        diagnosticState.errors.push({
          taskId: testTask.sourceId,
          error: error.toString(),
          stack: error.stack
        });
      }
    }
  }
  
  // Test Case 3: Try updating a task with a non-existent ID
  console.log('\nTest Case 3: Update task with non-existent ID');
  const nonexistentId = 'non-existent-task-' + Date.now();
  
  try {
    const updateResult = await updateTask(
      config.projectId, 
      nonexistentId, 
      { completed: true }
    );
    
    console.log('Update result:', updateResult);
    
    if (updateResult.error) {
      console.log('✅ Test Case 3 succeeded (Expected error):', updateResult.error);
    } else {
      console.error('❌ Test Case 3 failed (No error for non-existent task ID)');
    }
  } catch (error) {
    console.log('✅ Test Case 3 succeeded (Expected error):', error);
  }
  
  // Test Case 4: Try updating with an invalid project ID
  console.log('\nTest Case 4: Update with invalid project ID');
  
  try {
    const updateResult = await updateTask(
      'invalid-project-id', 
      successFactorTasks.length > 0 ? successFactorTasks[0].id : 'any-task-id', 
      { completed: true }
    );
    
    console.log('Update result:', updateResult);
    
    if (updateResult.error) {
      console.log('✅ Test Case 4 succeeded (Expected error):', updateResult.error);
    } else {
      console.error('❌ Test Case 4 failed (No error for invalid project ID)');
    }
  } catch (error) {
    console.log('✅ Test Case 4 succeeded (Expected error):', error);
  }
  
  // Final Diagnostic Report
  console.log('\n📊 DIAGNOSTIC REPORT');
  console.log('-----------------');
  console.log(`Total API calls: ${diagnosticState.apiCalls.length}`);
  console.log(`Successful updates: ${diagnosticState.successfulUpdates.length}`);
  console.log(`Failed updates: ${diagnosticState.failedUpdates.length}`);
  console.log(`Errors: ${diagnosticState.errors.length}`);
  
  // Analyze failed updates
  if (diagnosticState.failedUpdates.length > 0) {
    console.log('\n❌ FAILED UPDATES ANALYSIS');
    console.log('-----------------------');
    
    diagnosticState.failedUpdates.forEach((failure, index) => {
      console.log(`\nFailure #${index + 1}:`);
      console.log(`Task ID: ${failure.taskId}`);
      console.log(`Error: ${failure.error}`);
      console.log(`Request data:`, failure.requestData);
      
      // Try to determine the root cause
      const rootCause = analyzeFailure(failure);
      console.log(`Probable root cause: ${rootCause}`);
    });
  }
  
  // Provide recommendations
  console.log('\n🔧 RECOMMENDATIONS');
  console.log('----------------');
  
  if (diagnosticState.errors.length > 0 || diagnosticState.failedUpdates.length > 0) {
    // Generate recommendations based on observed issues
    const recommendations = generateRecommendations(diagnosticState);
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  } else {
    console.log('No issues detected. All task updates completed successfully.');
  }
}

// Helper Functions

function setupNetworkMonitoring(diagnosticState) {
  // Use the Performance API to monitor network requests
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || (typeof input === 'string' ? 'GET' : input.method) || 'GET';
    
    // Only monitor task-related API calls
    if (url.includes('/tasks/')) {
      console.log(`🌐 Intercepted ${method} request to ${url}`);
      
      const startTime = performance.now();
      const requestBody = init?.body ? JSON.parse(init.body) : null;
      
      if (requestBody) {
        console.log('Request body:', requestBody);
      }
      
      try {
        const response = await originalFetch.apply(this, arguments);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Clone the response so we can read it twice
        const clonedResponse = response.clone();
        
        try {
          const responseData = await clonedResponse.json();
          
          // Record the API call
          diagnosticState.apiCalls.push({
            url,
            method,
            requestBody,
            responseStatus: response.status,
            responseData,
            duration,
            timestamp: new Date().toISOString()
          });
          
          console.log(`✅ ${method} ${url} - ${response.status} in ${duration.toFixed(2)}ms`);
          console.log('Response:', responseData);
          
          // Check for error responses
          if (!response.ok) {
            console.error(`❌ Error response: ${response.status} ${response.statusText}`);
            diagnosticState.errors.push({
              url,
              method,
              status: response.status,
              statusText: response.statusText,
              data: responseData
            });
          }
        } catch (error) {
          console.error('Failed to parse response as JSON:', error);
          
          // Try to get the text response
          const textResponse = await response.clone().text();
          console.log('Raw response text:', textResponse);
          
          diagnosticState.errors.push({
            url,
            method,
            error: 'Invalid JSON response',
            rawResponse: textResponse.substring(0, 500) // Limit the size
          });
        }
        
        return response;
      } catch (error) {
        console.error(`❌ Network error for ${method} ${url}:`, error);
        
        diagnosticState.errors.push({
          url,
          method,
          error: error.toString(),
          stack: error.stack
        });
        
        throw error;
      }
    }
    
    // Pass through for non-task API calls
    return originalFetch.apply(this, arguments);
  };
}

// Helper function to fetch tasks
async function fetchTasks(projectId) {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// Helper function to update a task
async function updateTask(projectId, taskId, updates) {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Non-JSON response received: ${contentType}`);
      const text = await response.text();
      return {
        error: 'INVALID_RESPONSE_FORMAT',
        status: response.status,
        contentType,
        responseText: text.substring(0, 500) // Limit size for logging
      };
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        error: data.error || 'UNKNOWN_ERROR',
        status: response.status,
        message: data.message,
        data
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      error: 'REQUEST_FAILED',
      message: error.message,
      originalError: error.toString()
    };
  }
}

// Helper function to capture task fields
function captureTaskFields(task) {
  // Capture all fields we care about for debugging
  return {
    id: task.id,
    text: task.text,
    completed: task.completed,
    origin: task.origin,
    sourceId: task.sourceId,
    stage: task.stage,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    projectId: task.projectId
  };
}

// Helper function to compare task fields
function compareTaskFields(originalTask, updatedTask) {
  const changes = {};
  const fieldsToCompare = [
    'id', 'text', 'completed', 'origin', 'sourceId', 
    'stage', 'updatedAt', 'projectId'
  ];
  
  fieldsToCompare.forEach(field => {
    if (JSON.stringify(originalTask[field]) !== JSON.stringify(updatedTask[field])) {
      changes[field] = {
        before: originalTask[field],
        after: updatedTask[field]
      };
    }
  });
  
  return changes;
}

// Helper function to analyze failures
function analyzeFailure(failure) {
  // Common patterns
  if (failure.error === 'TASK_NOT_FOUND') {
    return 'Task ID could not be resolved or found in the database';
  }
  
  if (failure.error === 'VALIDATION_ERROR') {
    return 'Input validation failed for the task update';
  }
  
  if (failure.error === 'INVALID_RESPONSE_FORMAT') {
    return 'Server returned a non-JSON response (possibly HTML or server error)';
  }
  
  if (failure.response?.status === 500) {
    return 'Server encountered an internal error during task update';
  }
  
  if (failure.response?.status === 404) {
    return 'Task or project not found';
  }
  
  if (failure.response?.status === 401) {
    return 'Authentication failure (session may have expired)';
  }
  
  // Default
  return 'Unknown error - check network logs for details';
}

// Helper function to generate recommendations
function generateRecommendations(diagnosticState) {
  const recommendations = [];
  
  // Analyze failures and errors
  const hasTaskNotFound = diagnosticState.failedUpdates.some(f => f.error === 'TASK_NOT_FOUND');
  const hasInvalidResponseFormat = diagnosticState.failedUpdates.some(f => f.error === 'INVALID_RESPONSE_FORMAT');
  const hasServerErrors = diagnosticState.failedUpdates.some(f => f.response?.status === 500);
  const hasAuthErrors = diagnosticState.failedUpdates.some(f => f.response?.status === 401);
  
  if (hasTaskNotFound) {
    recommendations.push('Ensure TaskIdResolver is properly handling all task ID formats, especially for Success Factor tasks');
    recommendations.push('Check the database for missing or corrupt task entries');
  }
  
  if (hasInvalidResponseFormat) {
    recommendations.push('Ensure all response handlers set proper Content-Type headers (application/json)');
    recommendations.push('Check error handlers to ensure they always return JSON, not HTML error pages');
  }
  
  if (hasServerErrors) {
    recommendations.push('Review server error logs for exceptions during task update operations');
    recommendations.push('Ensure proper field preservation for Success Factor tasks (origin and sourceId)');
    recommendations.push('Verify database transaction handling and rollback on error');
  }
  
  if (hasAuthErrors) {
    recommendations.push('Check authentication session handling and token refresh logic');
  }
  
  // General recommendations
  recommendations.push('Implement detailed error logging with request/response tracking');
  recommendations.push('Add robust task field validation and preservation for Success Factor tasks');
  recommendations.push('Set explicit Content-Type headers in all API routes');
  
  return recommendations;
}

// Run the trace
traceTaskUpdateErrors();