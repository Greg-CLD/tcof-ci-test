/**
 * Task Toggle ID Resolution Diagnostic
 * 
 * This browser console script traces the complete task toggle lifecycle:
 * 1. Original task ID and sourceId from API response
 * 2. ID transformation during task toggling
 * 3. Actual network request details
 * 4. Server response analysis
 * 
 * RUN INSTRUCTIONS:
 * 1. Open browser console on a page with Success Factor tasks
 * 2. Paste this entire script
 * 3. Click a task to toggle it
 * 4. Check console for detailed logs
 */

(function() {
  console.clear();
  console.log('=== Task Toggle Tracer Activated ===');
  
  // Store references to original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Storage for tasks and requests
  const taskStore = {
    allTasks: [],
    taskById: {},
    successFactorTasks: [],
    pendingRequests: {},
    completedRequests: []
  };
  
  // Helper to extract project ID from path
  function extractProjectId(url) {
    const projectMatch = url.match(/\/projects\/([a-f0-9-]+)/i);
    return projectMatch ? projectMatch[1] : null;
  }
  
  // Helper to extract task ID from path
  function extractTaskId(url) {
    const pathParts = url.split('/');
    // URL pattern: /api/projects/{projectId}/tasks/{taskId}
    const tasksIndex = pathParts.indexOf('tasks');
    if (tasksIndex >= 0 && tasksIndex < pathParts.length - 1) {
      return pathParts[tasksIndex + 1];
    }
    return null;
  }
  
  // Helper for cleaner logging 
  function formatTask(task) {
    return {
      id: task.id,
      text: task.text?.substring(0, 30) + '...',
      origin: task.origin,
      sourceId: task.sourceId,
      completed: task.completed
    };
  }
  
  // Intercept fetch API calls
  window.fetch = async function(url, options) {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Only track API requests
    if (!url.includes('/api/')) {
      return originalFetch.apply(this, arguments);
    }
    
    // For GET tasks requests - capture all tasks
    if (url.includes('/tasks') && (!options || options.method === 'GET' || !options.method)) {
      console.log(`🔍 [API] Fetching tasks from: ${url}`);
      
      // Track this request
      taskStore.pendingRequests[requestId] = {
        type: 'GET_TASKS',
        url,
        options,
        timestamp: Date.now(),
        projectId: extractProjectId(url)
      };
      
      try {
        const response = await originalFetch.apply(this, arguments);
        const clonedResponse = response.clone();
        
        // Process the tasks data
        try {
          const tasks = await clonedResponse.json();
          
          if (Array.isArray(tasks)) {
            // Get the project ID from the URL
            const projectId = extractProjectId(url);
            
            console.log(`📋 [TASKS] Found ${tasks.length} tasks for project ${projectId}`);
            
            // Store all tasks and update our mapping
            taskStore.allTasks = tasks;
            tasks.forEach(task => taskStore.taskById[task.id] = task);
            
            // Identify Success Factor tasks
            const sfTasks = tasks.filter(t => t.origin === 'factor' || t.origin === 'success-factor');
            taskStore.successFactorTasks = sfTasks;
            
            if (sfTasks.length > 0) {
              console.log('🎯 [SUCCESS FACTORS] Found the following Success Factor tasks:');
              sfTasks.forEach((task, i) => {
                console.log(`  ${i+1}. Task "${task.text?.substring(0, 30)}...":`);
                console.log(`     ID: ${task.id}`);
                console.log(`     SourceID: ${task.sourceId || 'N/A'}`);
                console.log(`     Origin: ${task.origin}`);
                console.log(`     Completed: ${task.completed}`);
              });
            } else {
              console.log('⚠️ No Success Factor tasks found in this project');
            }
          }
          
        } catch (e) {
          console.error('Error parsing tasks response:', e);
        }
        
        return response;
        
      } catch (error) {
        console.error('Error in tasks request:', error);
        throw error;
      }
    }
    
    // For PUT task update requests - track task updates
    if (url.includes('/tasks/') && options && options.method === 'PUT') {
      // Extract information from the request
      const projectId = extractProjectId(url);
      const taskId = extractTaskId(url);
      let payload = null;
      
      try {
        if (options.body) {
          payload = JSON.parse(options.body);
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
      
      // Get task information if available in our store
      const task = taskStore.taskById[taskId];
      
      console.group('🔄 [TASK UPDATE] Request details:');
      console.log(`Request URL: ${url}`);
      console.log(`Project ID: ${projectId}`);
      console.log(`Task ID (from URL): ${taskId}`);
      console.log(`Request Payload:`, payload);
      
      if (task) {
        console.log('Task found in store (from previous GET request):');
        console.log(`  Original ID: ${task.id}`);
        console.log(`  Source ID: ${task.sourceId || 'N/A'}`);
        console.log(`  Origin: ${task.origin || 'N/A'}`);
        console.log(`  Text: ${task.text?.substring(0, 30)}...`);
        
        // Check for source ID mismatch - crucial diagnostic
        if (task.sourceId && taskId !== task.id && taskId !== task.sourceId) {
          console.warn('⚠️ WARNING: Task ID in URL does not match either task.id or task.sourceId');
          console.log(`  URL TaskID: ${taskId}`);
          console.log(`  Task.id: ${task.id}`);
          console.log(`  Task.sourceId: ${task.sourceId}`);
        }
      } else {
        console.warn(`⚠️ Task with ID ${taskId} not found in local store - can't verify source`);
      }
      console.groupEnd();
      
      // Track this request for monitoring the response
      taskStore.pendingRequests[requestId] = {
        type: 'UPDATE_TASK',
        url,
        options,
        taskId,
        projectId,
        payload,
        originalTask: task ? formatTask(task) : null,
        timestamp: Date.now()
      };
      
      try {
        // Make the actual request
        const startTime = performance.now();
        const response = await originalFetch.apply(this, arguments);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Clone so we can both read and return the response
        const clonedResponse = response.clone();
        
        // Complete request tracking
        const requestInfo = taskStore.pendingRequests[requestId];
        delete taskStore.pendingRequests[requestId];
        
        // Process the response
        try {
          const responseData = await clonedResponse.json();
          
          console.group('✅ [TASK UPDATE] Response details:');
          console.log(`Status: ${response.status} ${response.statusText}`);
          console.log(`Duration: ${duration.toFixed(2)}ms`);
          console.log(`Response data:`, responseData);
          
          // Analyze the response
          if (response.ok) {
            if (responseData.task) {
              console.log('Updated task in response:');
              console.log(`  ID: ${responseData.task.id}`);
              console.log(`  Source ID: ${responseData.task.sourceId || 'N/A'}`);
              console.log(`  Completed: ${responseData.task.completed}`);
              
              // Store the completed request
              taskStore.completedRequests.push({
                ...requestInfo,
                response: {
                  status: response.status,
                  data: responseData,
                  duration,
                  timestamp: Date.now()
                }
              });
              
            } else {
              console.warn('⚠️ Response OK but no task data returned');
            }
          } else {
            console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
          }
          console.groupEnd();
          
        } catch (e) {
          console.error('Error parsing response:', e);
        }
        
        return response;
      } catch (error) {
        console.error('Error during task update:', error);
        throw error;
      }
    }
    
    // For all other requests, just pass through
    return originalFetch.apply(this, arguments);
  };
  
  console.log('Task toggle tracer active. Toggle a task to see detailed diagnostics.');
  
  // UI element to show diagnostic is active
  const indicatorDiv = document.createElement('div');
  indicatorDiv.style.position = 'fixed';
  indicatorDiv.style.bottom = '10px';
  indicatorDiv.style.right = '10px';
  indicatorDiv.style.backgroundColor = 'rgba(0, 100, 255, 0.8)';
  indicatorDiv.style.color = 'white';
  indicatorDiv.style.padding = '8px 12px';
  indicatorDiv.style.borderRadius = '4px';
  indicatorDiv.style.zIndex = '9999';
  indicatorDiv.style.fontSize = '12px';
  indicatorDiv.textContent = '🔍 Task Toggle Tracer Active';
  document.body.appendChild(indicatorDiv);
  
  // Expose the store for debugging
  window.__taskToggleTracer = {
    store: taskStore,
    getSuccessFactorTasks: () => taskStore.successFactorTasks,
    getCompletedRequests: () => taskStore.completedRequests,
    getRequestSummary: () => {
      const requests = taskStore.completedRequests;
      if (requests.length === 0) {
        return 'No completed requests';
      }
      
      return requests.map((req, i) => {
        return `Request ${i+1}: ${req.type} - Task ${req.taskId} - Status ${req.response.status}`;
      }).join('\n');
    }
  };
})()