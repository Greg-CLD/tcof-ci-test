if (import.meta.env.DEV) {
  // Always unregister any service workers in development mode to avoid caching issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      console.log(`🧹 Unregistering ${registrations.length} service worker(s) to prevent caching issues`);
      for (const registration of registrations) {
        registration.unregister().then(
          (wasUnregistered) => wasUnregistered ? 
            console.log('Successfully unregistered service worker') : 
            console.log('Service worker not unregistered')
        );
      }
    }).catch(err => console.error('Error unregistering service workers:', err));
  }
  
  // Listen for special HMR force reload events
  window.addEventListener('hmr:force-reload', () => {
    console.log('🔄 HMR forcing hard refresh without cache');
    
    // Clear application cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          console.log(`Clearing cache: ${cacheName}`);
          caches.delete(cacheName);
        });
      });
    }
    
    // Force reload without cache by adding a timestamp parameter
    const url = new URL(window.location.href);
    url.searchParams.set('t', Date.now().toString());
    window.location.href = url.toString();
  });
  
  // Ensure no cache is used when making fetch requests in development
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    // If this is an API request, add cache-busting headers
    if (typeof input === 'string' && input.includes('/api/')) {
      const newInit: RequestInit = {
        ...init,
        cache: 'no-store',
        headers: {
          ...init?.headers,
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      };
      
      // Add timestamp to GET requests for cache busting
      if (!init?.method || init.method === 'GET') {
        const separator = input.includes('?') ? '&' : '?';
        input = `${input}${separator}_t=${Date.now()}`;
      }
      
      return originalFetch(input, newInit);
    } else if (input instanceof Request && input.url.includes('/api/')) {
      // Create a new request with the same properties but with cache headers
      const newRequest = new Request(input, {
        cache: 'no-store',
        headers: {
          ...Object.fromEntries(input.headers.entries()),
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      });
      
      return originalFetch(newRequest);
    }
    
    // For non-API requests, use the original arguments
    return originalFetch(input, init);
  };
}

import React from "react";
import { createRoot } from "react-dom/client";
import * as ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { apiRequest } from "./lib/queryClient";
// Import testing helpers
import "./lib/taskTestHelpers";

// Declare the window object extensions for TypeScript
declare global {
  interface Window {
    listProjects: () => Promise<any>;
    createTestTask: (options: {
      projectId: string;
      text?: string;
      stage?: 'identification' | 'definition' | 'delivery' | 'closure';
      origin?: 'heuristic' | 'factor' | 'policy';
      sourceId?: string;
      completed?: boolean;
    }) => Promise<any>;
    inspectTasks: (projectId: string) => Promise<any>;
    runTaskPersistenceTest: (projectId: string) => Promise<any>;
  }
}

// Initialize accessibility testing in development mode
if (import.meta.env.DEV) {
  // Log that we have accessibility features
  console.log('%c🔍 Accessibility testing enabled via A11yAuditProvider', 'color: #0984e3; font-weight: bold;');
}

// Add the test task creation function to the window object for manual testing
if (import.meta.env.DEV) {
  interface CreateTestTaskOptions {
    projectId: string;
    text?: string;
    stage?: 'identification' | 'definition' | 'delivery' | 'closure';
    origin?: 'heuristic' | 'factor' | 'policy';
    sourceId?: string;
    completed?: boolean;
  }

  // @ts-ignore - Adding to window object for manual testing
  window.inspectTasks = async (projectId: string) => {
    try {
      if (!projectId) {
        console.error('Error: projectId is required');
        return;
      }
      
      console.log(`Inspecting tasks for project: ${projectId}`);
      const response = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
      const tasks = await response.json();
      
      console.group('Tasks data');
      console.log('Raw task data:', tasks);
      
      if (Array.isArray(tasks)) {
        // Group tasks by completion status
        const completed = tasks.filter(t => t.completed);
        const incomplete = tasks.filter(t => !t.completed);
        
        console.log(`Total tasks: ${tasks.length}`);
        console.log(`Completed tasks: ${completed.length}`);
        console.log(`Incomplete tasks: ${incomplete.length}`);
        
        // Group by stage
        const byStage = tasks.reduce((acc, task) => {
          const stage = task.stage;
          if (!acc[stage]) acc[stage] = [];
          acc[stage].push(task);
          return acc;
        }, {} as Record<string, any[]>);
        
        console.log('Tasks by stage:', Object.keys(byStage).map(stage => ({ 
          stage, 
          count: byStage[stage].length
        })));
      } else {
        console.warn('Response is not an array:', tasks);
      }
      console.groupEnd();
      
      return tasks;
    } catch (error) {
      console.error('Failed to inspect tasks:', error);
      console.log('You might need to be logged in to access tasks');
    }
  };

  // @ts-ignore - Adding to window object for manual testing
  window.listProjects = async () => {
    try {
      const response = await apiRequest('GET', '/api/projects');
      const projects = await response.json();
      console.table(projects.map((p: any) => ({ 
        id: p.id, 
        name: p.name,
        organisation: p.organisationName || 'N/A'
      })));
      console.log('Use one of these project IDs with createTestTask()');
      return projects;
    } catch (error) {
      console.error('Failed to list projects:', error);
      console.log('You might need to be logged in to access projects');
    }
  };

  // @ts-ignore - Adding to window object for manual testing
  window.runTaskPersistenceTest = async (projectId: string) => {
    try {
      if (!projectId) {
        console.error('Error: projectId is required');
        return;
      }
      
      console.group('Task Persistence Test');
      console.log('Starting task persistence test for project:', projectId);
      
      // Step 1: Check existing tasks
      console.log('Step 1: Checking existing tasks...');
      const inspectTasksFn = window.inspectTasks as (projectId: string) => Promise<any>;
      const initialTasks = await inspectTasksFn(projectId);
      const initialCount = Array.isArray(initialTasks) ? initialTasks.length : 0;
      console.log(`Initial task count: ${initialCount}`);
      
      // Step 2: Create a test task
      console.log('Step 2: Creating test task...');
      const createTaskFn = window.createTestTask as (options: any) => Promise<any>;
      const newTask = await createTaskFn({
        projectId,
        text: `Persistence Test Task ${Date.now()}`, 
        completed: false
      });
      console.log('Created task:', newTask);
      
      // Step 3: Verify the task was created
      console.log('Step 3: Verifying task was created...');
      const afterCreateTasks = await inspectTasksFn(projectId);
      const afterCreateCount = Array.isArray(afterCreateTasks) ? afterCreateTasks.length : 0;
      console.log(`Task count after creation: ${afterCreateCount}`);
      
      if (afterCreateCount !== initialCount + 1) {
        console.warn('⚠️ Warning: Task count does not match expected value after creation');
      } else {
        console.log('✅ Task count increased as expected');
      }
      
      // Step 4: Mark the task as completed
      if (newTask && newTask.id) {
        console.log('Step 4: Marking task as completed...');
        const updateRes = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${newTask.id}`, {
          completed: true
        });
        const updatedTask = await updateRes.json();
        console.log('Task marked as completed:', updatedTask);
        
        // Step 5: Verify the task was updated
        console.log('Step 5: Verifying task was updated...');
        const afterUpdateTasks = await inspectTasksFn(projectId);
        
        if (Array.isArray(afterUpdateTasks)) {
          const foundTask = afterUpdateTasks.find(t => t.id === newTask.id);
          if (foundTask) {
            console.log('Found task in updated list:', foundTask);
            if (foundTask.completed) {
              console.log('✅ Task completion status updated successfully');
            } else {
              console.warn('⚠️ Warning: Task found but completion status not updated');
            }
          } else {
            console.warn('⚠️ Warning: Task not found in updated list');
          }
        }
      }
      
      console.log('Task persistence test completed');
      console.groupEnd();
      
      return { success: true, message: 'Test completed, check console for detailed results' };
    } catch (error) {
      console.error('Failed to run task persistence test:', error);
      console.groupEnd();
      return { success: false, error };
    }
  };

  // @ts-ignore - Adding to window object for manual testing
  window.createTestTask = async (options: CreateTestTaskOptions) => {
    try {
      const { 
        projectId, 
        text = 'Test Task ' + new Date().toLocaleTimeString(), 
        stage = 'identification',
        origin = 'factor',
        sourceId = 'sf-1',
        completed = false 
      } = options;
      
      if (!projectId) {
        console.error('Error: projectId is required');
        return;
      }
      
      console.log(`Creating test task for project: ${projectId}`);
      
      // First create the task
      const taskData = {
        projectId,
        text,
        stage,
        origin,
        sourceId,
      };
      
      const createRes = await apiRequest('POST', `/api/projects/${projectId}/tasks`, taskData);
      const newTask = await createRes.json();
      console.log('Created task:', newTask);
      
      // If completed flag is true, update the task to completed
      if (completed && newTask.id) {
        const updateRes = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${newTask.id}`, {
          completed: true
        });
        const updatedTask = await updateRes.json();
        console.log('Task marked as completed:', updatedTask);
      }
      
      return newTask;
    } catch (error) {
      console.error('Failed to create test task:', error);
    }
  };
  
  console.log('%c🧪 Test utilities available in console:', 'color: #00b894; font-weight: bold;');
  console.log('%c- window.listProjects() - Lists all your projects with IDs', 'color: #00b894;');
  console.log('%c- window.createTestTask({projectId: "your-project-id"}) - Create a test task', 'color: #00b894;');
  console.log('%c- window.inspectTasks("your-project-id") - Examine tasks for debugging', 'color: #00b894;');
  console.log('%c- window.runTaskPersistenceTest("your-project-id") - Run full lifecycle test', 'color: #00b894;');
  console.log('%c- Complete testing workflow:', 'color: #00b894;');
  console.log('%c  1. Get project ID: window.listProjects()', 'color: #00b894;');
  console.log('%c  2. Run automated test: window.listProjects().then(p => window.runTaskPersistenceTest(p[0].id))', 'color: #00b894;');
  console.log('%c  3. Refresh browser and verify: window.listProjects().then(p => window.inspectTasks(p[0].id))', 'color: #00b894;');
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(e) => console.error('Global error caught by ErrorBoundary:', e)}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
