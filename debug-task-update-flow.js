/**
 * Task Update Flow Diagnostic Script
 * 
 * This script provides comprehensive instrumentation to diagnose and track
 * the entire lifecycle of task updates, including:
 * - Network request/response timing and payload logging
 * - Request/response field comparison
 * - ID resolution and mapping
 * - TaskStateManager queue processing
 * - Database transaction timing
 * 
 * Usage:
 * 1. Paste this script in the browser console while logged in
 * 2. The script will intercept and log all task-related API calls
 * 3. Toggle any task to see the full diagnostic output
 */

(function instrumentTaskFlow() {
  // Configuration
  const DEBUG = true;
  const TIMEOUT_THRESHOLD_MS = 500;
  const STUCK_QUEUE_THRESHOLD_MS = 1000;
  
  // Store original fetch for later restoration if needed
  const originalFetch = window.fetch;
  
  // Initialize logging
  console.log('===== Task Update Flow Diagnostic Instrumentation =====');
  console.log('Monitoring all task-related API requests...');
  console.log('Toggle any task to see the full diagnostic output');
  
  // State to track request/response pairs
  const requestLog = new Map();
  let interceptorActive = true;
  
  // Utility to format timestamps
  function formatTime() {
    return new Date().toISOString();
  }
  
  // Detailed logging function
  function log(category, message, data = null) {
    if (!DEBUG) return;
    
    const prefix = `[${formatTime()}] [${category}]`;
    console.log(`${prefix} ${message}`);
    if (data) console.log(data);
  }
  
  // Compare two objects and return differences
  function diffObjects(original, updated) {
    const differences = {};
    const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
    
    for (const key of allKeys) {
      // Skip comparing functions
      if (typeof original[key] === 'function' || typeof updated[key] === 'function') {
        continue;
      }
      
      // Check for missing keys
      if (!(key in original)) {
        differences[key] = { status: 'added', value: updated[key] };
        continue;
      }
      
      if (!(key in updated)) {
        differences[key] = { status: 'removed', value: original[key] };
        continue;
      }
      
      // Check for value differences
      if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
        differences[key] = {
          status: 'changed',
          from: original[key],
          to: updated[key]
        };
      }
    }
    
    return Object.keys(differences).length > 0 ? differences : null;
  }
  
  // Intercept all fetch requests
  window.fetch = async function instrumentedFetch(resource, options = {}) {
    if (!interceptorActive) {
      return originalFetch(resource, options);
    }
    
    // Only track API requests related to tasks
    if (typeof resource !== 'string' || 
        (!resource.includes('/tasks/') && !resource.includes('/tasks?'))) {
      return originalFetch(resource, options);
    }
    
    // Extract request details
    const method = options.method || 'GET';
    const requestId = Date.now().toString();
    const requestStartTime = performance.now();
    let requestBody = null;
    
    if (options.body) {
      try {
        requestBody = JSON.parse(options.body);
      } catch (e) {
        requestBody = options.body;
      }
    }
    
    // Store initial request data
    requestLog.set(requestId, {
      id: requestId,
      url: resource,
      method,
      startTime: requestStartTime,
      body: requestBody,
      completed: false
    });
    
    // Log the request
    log('REQUEST', `${method} ${resource}`, requestBody);
    
    // Process the request and track timing
    try {
      const response = await Promise.race([
        originalFetch(resource, options),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 30000)
        )
      ]);
      
      const requestEndTime = performance.now();
      const duration = requestEndTime - requestStartTime;
      
      // Clone the response so we can read the body twice
      const responseClone = response.clone();
      
      // Get response data
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }
      
      // Update request log with response data
      const requestInfo = requestLog.get(requestId);
      requestInfo.endTime = requestEndTime;
      requestInfo.duration = duration;
      requestInfo.status = response.status;
      requestInfo.responseData = responseData;
      requestInfo.completed = true;
      
      // Check for slow responses
      if (duration > TIMEOUT_THRESHOLD_MS) {
        log('PERFORMANCE', `⚠️ Slow response: ${duration.toFixed(2)}ms exceeded ${TIMEOUT_THRESHOLD_MS}ms threshold`, {
          url: resource,
          method,
          duration
        });
      }
      
      // For PUT requests to tasks, do detailed field comparison
      if (method === 'PUT' && resource.includes('/tasks/')) {
        log('RESPONSE', `${response.status} in ${duration.toFixed(2)}ms`, responseData);
        
        // Compare request and response data for field mismatches
        if (requestBody && responseData) {
          const differences = diffObjects(requestBody, responseData);
          if (differences) {
            log('FIELD_MISMATCH', 'Differences between request and response:', differences);
          } else {
            log('FIELD_MATCH', 'Request and response fields match exactly');
          }
        }
        
        // Extract task IDs for mapping verification
        const taskIdMatch = resource.match(/\/tasks\/([^\/\?]+)/);
        if (taskIdMatch && taskIdMatch[1]) {
          const clientTaskId = taskIdMatch[1];
          const responseTaskId = responseData.id || null;
          
          log('ID_MAPPING', 'Task ID verification', {
            clientId: clientTaskId,
            responseId: responseTaskId,
            match: clientTaskId === responseTaskId
          });
          
          // Check for sourceId preservation (for Success Factor tasks)
          if (requestBody && 
              requestBody.origin === 'factor' && 
              responseData && 
              responseData.origin === 'factor') {
            log('SOURCE_ID', 'Source ID verification', {
              requestSourceId: requestBody.sourceId,
              responseSourceId: responseData.sourceId,
              preserved: requestBody.sourceId === responseData.sourceId
            });
          }
        }
      }
      
      return responseClone;
      
    } catch (error) {
      // Log errors
      const requestEndTime = performance.now();
      const duration = requestEndTime - requestStartTime;
      
      log('ERROR', `${method} ${resource} failed after ${duration.toFixed(2)}ms`, {
        error: error.message,
        stack: error.stack
      });
      
      // Update request log with error data
      const requestInfo = requestLog.get(requestId);
      requestInfo.endTime = requestEndTime;
      requestInfo.duration = duration;
      requestInfo.error = error.message;
      requestInfo.completed = true;
      
      throw error;
    }
  };
  
  // Function to restore original fetch
  window.stopTaskDiagnostics = function() {
    if (interceptorActive) {
      window.fetch = originalFetch;
      interceptorActive = false;
      console.log('Task update diagnostics stopped. Original fetch restored.');
    }
  };
  
  // UI Mutation observer to detect task toggling in the DOM
  function setupTaskToggleObserver() {
    // Target tasks list containers
    const tasksContainer = document.querySelector('[data-testid="tasks-list"]') || 
                          document.querySelector('.tasks-container');
    
    if (!tasksContainer) {
      console.log('Tasks container not found. Observer not initialized.');
      return;
    }
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'data-completed') {
          const taskElement = mutation.target.closest('[data-task-id]');
          if (taskElement) {
            const taskId = taskElement.getAttribute('data-task-id');
            const isCompleted = taskElement.getAttribute('data-completed') === 'true';
            
            log('UI_TOGGLE', `Task ${taskId} toggled to ${isCompleted ? 'completed' : 'not completed'}`);
          }
        }
      }
    });
    
    observer.observe(tasksContainer, { 
      attributes: true, 
      subtree: true,
      attributeFilter: ['data-completed']
    });
    
    log('OBSERVER', 'Task toggle observer initialized');
  }
  
  // Setup task toggle observer
  setTimeout(setupTaskToggleObserver, 1000);
  
  // Report diagnostics summary
  function getRequestSummary() {
    let totalRequests = 0;
    let completedRequests = 0;
    let failedRequests = 0;
    let slowRequests = 0;
    let averageDuration = 0;
    
    const durations = [];
    
    requestLog.forEach(request => {
      totalRequests++;
      
      if (request.completed) {
        completedRequests++;
        
        if (request.error) {
          failedRequests++;
        }
        
        if (request.duration > TIMEOUT_THRESHOLD_MS) {
          slowRequests++;
        }
        
        if (request.duration) {
          durations.push(request.duration);
        }
      }
    });
    
    if (durations.length > 0) {
      averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    }
    
    return {
      totalRequests,
      completedRequests,
      failedRequests,
      slowRequests,
      averageDuration: averageDuration.toFixed(2) + 'ms'
    };
  }
  
  // Expose diagnostic summary function
  window.getTaskDiagnosticSummary = function() {
    const summary = getRequestSummary();
    console.log('===== Task Diagnostic Summary =====');
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Completed Requests: ${summary.completedRequests}`);
    console.log(`Failed Requests: ${summary.failedRequests}`);
    console.log(`Slow Requests (>${TIMEOUT_THRESHOLD_MS}ms): ${summary.slowRequests}`);
    console.log(`Average Duration: ${summary.averageDuration}`);
    return summary;
  };
  
  console.log('Task update diagnostics initialized. Use window.getTaskDiagnosticSummary() to see results, or window.stopTaskDiagnostics() to disable.');
})();