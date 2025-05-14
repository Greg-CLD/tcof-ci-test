/**
 * Helper functions to diagnose and test task persistence in browser console
 * These functions can be executed directly in the browser console to test various aspects
 * of the task persistence functionality
 */

// Function to test if a task can be loaded from API for a given project
export async function testLoadTasks(projectId: string) {
  console.group('🔍 Testing task loading for project ' + projectId);
  try {
    // First try loading canonical tasks from public endpoint
    console.log('Testing public task endpoint...');
    const canonicalResponse = await fetch('/__tcof/public-checklist-tasks');
    if (!canonicalResponse.ok) {
      console.error('❌ Failed to load canonical tasks:', 
        await canonicalResponse.text());
    } else {
      const canonicalData = await canonicalResponse.json();
      console.log('✅ Successfully loaded canonical tasks:', 
        canonicalData?.length || 0, 'factors with tasks');
      
      // Display sample task if available
      if (canonicalData && canonicalData.length > 0) {
        console.log('Sample factor:', canonicalData[0]);
      }
    }
    
    // Then try loading project-specific tasks
    console.log('Testing project tasks endpoint...');
    const projectResponse = await fetch(`/api/projects/${projectId}/tasks`);
    if (!projectResponse.ok) {
      console.error('❌ Failed to load project tasks:', 
        await projectResponse.text());
    } else {
      const projectTasks = await projectResponse.json();
      console.log('✅ Successfully loaded project tasks:', 
        projectTasks?.length || 0, 'tasks');
      
      // Display sample task if available
      if (projectTasks && projectTasks.length > 0) {
        console.log('Sample task:', projectTasks[0]);
      } else {
        console.log('No project-specific tasks found. This might be normal for a new project.');
      }
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  console.groupEnd();
}

// Function to test if a new task can be created for a project
export async function testCreateTask(projectId: string) {
  console.group('🔍 Testing task creation for project ' + projectId);
  try {
    // Create a test task
    const testTask = {
      text: `Test task created at ${new Date().toISOString()}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: `test-${Date.now()}`,
      completed: false,
      notes: 'Test notes',
      priority: 'medium',
      status: 'To Do',
      owner: ''
    };
    
    console.log('Creating test task:', testTask);
    
    const response = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testTask)
    });
    
    if (!response.ok) {
      console.error('❌ Failed to create task:', await response.text());
    } else {
      const result = await response.json();
      console.log('✅ Successfully created task:', result);
      return result;
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  console.groupEnd();
}

// Function to test if a task can be updated
export async function testUpdateTask(projectId: string, taskId: string) {
  console.group(`🔍 Testing task update for project ${projectId}, task ${taskId}`);
  try {
    // Update the task
    const updateData = {
      completed: true,
      notes: `Updated at ${new Date().toISOString()}`,
      status: 'Done'
    };
    
    console.log('Updating task with data:', updateData);
    
    const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      console.error('❌ Failed to update task:', await response.text());
    } else {
      const result = await response.json();
      console.log('✅ Successfully updated task:', result);
      return result;
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  console.groupEnd();
}

// Function to perform a full lifecycle test (create -> update -> verify)
export async function testTaskLifecycle(projectId: string) {
  console.group('🔍 Performing full task lifecycle test for project ' + projectId);
  try {
    // Step 1: Create a task
    console.log('Step 1: Creating a new task...');
    const newTask = await testCreateTask(projectId);
    
    if (!newTask || !newTask.id) {
      console.error('❌ Task creation failed, cannot continue lifecycle test');
      console.groupEnd();
      return;
    }
    
    // Step 2: Update the task
    console.log('Step 2: Updating the new task...');
    const updatedTask = await testUpdateTask(projectId, newTask.id);
    
    if (!updatedTask) {
      console.error('❌ Task update failed, cannot continue lifecycle test');
      console.groupEnd();
      return;
    }
    
    // Step 3: Verify task exists after refresh
    console.log('Step 3: Verifying task persistence...');
    const verifyResponse = await fetch(`/api/projects/${projectId}/tasks`);
    
    if (!verifyResponse.ok) {
      console.error('❌ Failed to verify tasks:', await verifyResponse.text());
      console.groupEnd();
      return;
    }
    
    const allTasks = await verifyResponse.json();
    const foundTask = allTasks.find((t: any) => t.id === newTask.id);
    
    if (foundTask) {
      console.log('✅ Task successfully persisted in the database:', foundTask);
    } else {
      console.error('❌ Task not found after refresh! Persistence failed');
    }
    
    console.log('Full lifecycle test complete');
  } catch (error) {
    console.error('❌ Error during lifecycle test:', error);
  }
  console.groupEnd();
}

// Function to analyze database tables and their structures
export async function analyzeDatabase() {
  console.group('🔍 Analyzing database structure');
  try {
    // Note: This is a diagnostic endpoint that needs to be added to the backend
    const response = await fetch('/__tcof/db-analysis');
    
    if (!response.ok) {
      console.error('❌ Failed to analyze database:', await response.text());
      console.log('This endpoint may not be implemented yet. Add it to your backend to use this diagnostic function.');
    } else {
      const dbInfo = await response.json();
      console.log('Database structure:', dbInfo);
    }
  } catch (error) {
    console.error('❌ Error during database analysis:', error);
  }
  console.groupEnd();
}

// Instructions for use
console.log(`
Task Testing Utilities loaded! You can use these functions in the browser console:

1. window.testLoadTasks(projectId) - Test if tasks can be loaded from the API
2. window.testCreateTask(projectId) - Test if a new task can be created
3. window.testUpdateTask(projectId, taskId) - Test if a task can be updated
4. window.testTaskLifecycle(projectId) - Run a full create/update/verify test
5. window.analyzeDatabase() - Analyze database structure (requires backend endpoint)

Example usage: window.testLoadTasks('your-project-id')
`);

// Expose these functions to the window object for browser console access
declare global {
  interface Window {
    testLoadTasks: typeof testLoadTasks;
    testCreateTask: typeof testCreateTask;
    testUpdateTask: typeof testUpdateTask;
    testTaskLifecycle: typeof testTaskLifecycle;
    analyzeDatabase: typeof analyzeDatabase;
  }
}

if (typeof window !== 'undefined') {
  window.testLoadTasks = testLoadTasks;
  window.testCreateTask = testCreateTask;
  window.testUpdateTask = testUpdateTask;
  window.testTaskLifecycle = testTaskLifecycle;
  window.analyzeDatabase = analyzeDatabase;
}