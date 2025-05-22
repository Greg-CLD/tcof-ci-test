/**
 * Success Factor Task Persistence Verification Script
 * 
 * This script provides a complete verification of task persistence:
 * 1. Gets the current tasks for a project 
 * 2. Toggles a Success Factor task
 * 3. Verifies the update persisted in the database
 * 4. Refreshes data from the API to verify persistence
 * 
 * Copy and paste this entire script into your browser console while logged in
 * to run a comprehensive test of Success Factor task persistence.
 */

async function verifyTaskPersistence() {
  // Configuration
  const projectId = window.currentProjectId || 
    (window.AppState?.projectData?.id) || 
    prompt('Enter project ID:');
  
  if (!projectId) {
    console.error('No project ID found or provided');
    return;
  }
  
  console.log(`🔍 Starting task persistence verification for project: ${projectId}`);
  
  // Step 1: Get all current tasks
  console.log('Step 1: Getting current tasks...');
  const initialTasks = await fetchTasks(projectId);
  
  if (!initialTasks || initialTasks.length === 0) {
    console.error('No tasks found for this project');
    return;
  }
  
  console.log(`Found ${initialTasks.length} tasks`);
  
  // Find a Success Factor task to toggle
  const successFactorTasks = initialTasks.filter(task => 
    task.origin === 'factor' || task.origin === 'success-factor'
  );
  
  if (successFactorTasks.length === 0) {
    console.error('No Success Factor tasks found in this project');
    return;
  }
  
  console.log(`Found ${successFactorTasks.length} Success Factor tasks`);
  
  // Select the first Success Factor task to toggle
  const taskToToggle = successFactorTasks[0];
  console.log('Selected task to toggle:', {
    id: taskToToggle.id,
    text: taskToToggle.text,
    completed: taskToToggle.completed,
    origin: taskToToggle.origin,
    sourceId: taskToToggle.sourceId
  });
  
  // Step 2: Toggle the task completion state
  console.log(`Step 2: Toggling task completion from ${taskToToggle.completed} to ${!taskToToggle.completed}...`);
  
  const toggleResponse = await updateTask(projectId, taskToToggle.id, {
    completed: !taskToToggle.completed
  });
  
  console.log('Toggle response:', toggleResponse);
  
  if (!toggleResponse || toggleResponse.error) {
    console.error('Failed to toggle task:', toggleResponse?.error || 'Unknown error');
    return;
  }
  
  // Step 3: Verify task was updated in the database
  console.log('Step 3: Verifying task was updated in the database...');
  const updatedTasks = await fetchTasks(projectId);
  
  const updatedTask = updatedTasks.find(task => task.id === taskToToggle.id);
  if (!updatedTask) {
    console.error('Task not found after update!');
    return;
  }
  
  const isToggleSuccessful = updatedTask.completed === !taskToToggle.completed;
  console.log('Updated task:', {
    id: updatedTask.id,
    text: updatedTask.text,
    completed: updatedTask.completed,
    origin: updatedTask.origin,
    sourceId: updatedTask.sourceId
  });
  
  console.log(`Toggle successful: ${isToggleSuccessful}`);
  
  // Step 4: Check for related tasks with the same sourceId
  if (taskToToggle.sourceId) {
    console.log('Step 4: Checking for related tasks with the same sourceId...');
    const relatedTasks = updatedTasks.filter(
      task => task.sourceId === taskToToggle.sourceId && task.id !== taskToToggle.id
    );
    
    if (relatedTasks.length > 0) {
      console.log(`Found ${relatedTasks.length} related tasks with sourceId ${taskToToggle.sourceId}`);
      
      // Verify all related tasks have the same completion state
      const allRelatedTasksInSync = relatedTasks.every(
        task => task.completed === updatedTask.completed
      );
      
      console.log(`All related tasks are in sync: ${allRelatedTasksInSync}`);
      
      if (!allRelatedTasksInSync) {
        console.warn('Some related tasks have different completion states:');
        relatedTasks.forEach(task => {
          console.log(`Task ${task.id}: ${task.completed ? 'Completed' : 'Not completed'}`);
        });
      }
    } else {
      console.log(`No related tasks found with sourceId ${taskToToggle.sourceId}`);
    }
  }
  
  // Step 5: Simulate page refresh by fetching tasks again
  console.log('Step 5: Simulating page refresh by fetching tasks again...');
  await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
  
  const refreshedTasks = await fetchTasks(projectId);
  const refreshedTask = refreshedTasks.find(task => task.id === taskToToggle.id);
  
  if (!refreshedTask) {
    console.error('Task not found after simulated refresh!');
    return;
  }
  
  const persistedAfterRefresh = refreshedTask.completed === updatedTask.completed;
  
  console.log('Refreshed task:', {
    id: refreshedTask.id,
    text: refreshedTask.text,
    completed: refreshedTask.completed,
    origin: refreshedTask.origin,
    sourceId: refreshedTask.sourceId
  });
  
  console.log(`Task state persisted after refresh: ${persistedAfterRefresh}`);
  
  // Final summary
  console.log('\n🔍 Task Persistence Verification Summary:');
  console.log(`✅ Initial task found: ${!!taskToToggle}`);
  console.log(`✅ Task toggle API call: ${!!toggleResponse && !toggleResponse.error}`);
  console.log(`✅ Task state updated: ${isToggleSuccessful}`);
  console.log(`✅ Task state persisted after refresh: ${persistedAfterRefresh}`);
  
  if (isToggleSuccessful && persistedAfterRefresh) {
    console.log('\n✅ SUCCESS: Task persistence is working correctly!');
  } else {
    console.log('\n❌ FAILURE: Task persistence is not working correctly.');
    console.log('Please check the logs above for details on the failure.');
  }
}

// Helper function to fetch tasks for a project
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
    
    // Handle non-JSON responses (e.g., HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Non-JSON response received: ${contentType}`);
      return {
        error: 'INVALID_RESPONSE_FORMAT',
        message: 'Received non-JSON response from server',
        status: response.status,
        contentType
      };
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error updating task:', data);
      return {
        error: data.error || 'UNKNOWN_ERROR',
        message: data.message || 'Unknown error occurred',
        status: response.status,
        data
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      error: 'REQUEST_FAILED',
      message: error.message,
      originalError: error
    };
  }
}

// Run the verification
verifyTaskPersistence();