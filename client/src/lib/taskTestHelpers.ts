/**
 * Task persistence testing helpers
 * These functions can be called from the browser console or used 
 * via the TaskPersistenceHelper component
 */
import { apiRequest } from './queryClient';

/**
 * Test loading tasks for a project
 * @param projectId The project ID
 * @returns Array of tasks or error
 */
export async function testLoadTasks(projectId: string) {
  console.log(`Testing task loading for project ${projectId}...`);
  try {
    const response = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
    const tasks = await response.json();
    console.log(`Successfully loaded ${tasks.length} tasks:`, tasks);
    return tasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
}

/**
 * Test creating a new task
 * @param projectId The project ID
 * @returns The created task or error
 */
export async function testCreateTask(projectId: string) {
  console.log(`Testing task creation for project ${projectId}...`);
  
  const timestamp = new Date().toISOString();
  const taskData = {
    text: `Test task created at ${timestamp}`,
    stage: 'identification',
    origin: 'custom',
    sourceId: `test-${Date.now()}`,
    priority: 'medium',
    status: 'pending',
  };
  
  try {
    const response = await apiRequest('POST', `/api/projects/${projectId}/tasks`, taskData);
    const task = await response.json();
    console.log('Task created successfully:', task);
    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Test updating an existing task
 * @param projectId The project ID
 * @param taskId The task ID
 * @returns The updated task or error
 */
export async function testUpdateTask(projectId: string, taskId: string) {
  console.log(`Testing task update for project ${projectId}, task ${taskId}...`);
  
  try {
    // First, get the task
    const getResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks/${taskId}`);
    const task = await getResponse.json();
    
    // Then update it
    const updateData = {
      ...task,
      text: `${task.text} (updated at ${new Date().toISOString()})`,
      status: task.status === 'completed' ? 'pending' : 'completed'
    };
    
    const updateResponse = await apiRequest('PUT', `/api/projects/${projectId}/tasks/${taskId}`, updateData);
    const updatedTask = await updateResponse.json();
    
    console.log('Task updated successfully:', updatedTask);
    return updatedTask;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Run a full task lifecycle test (create, update, verify)
 * @param projectId The project ID
 */
export async function testTaskLifecycle(projectId: string) {
  console.log(`Starting full task lifecycle test for project ${projectId}...`);
  
  try {
    // 1. Create a task
    console.log('Step 1: Creating a new task');
    const newTask = await testCreateTask(projectId);
    
    // 2. Update the task
    console.log('Step 2: Updating the task');
    const updatedTask = await testUpdateTask(projectId, newTask.id);
    
    // 3. Load the tasks and verify our task is there
    console.log('Step 3: Verifying task persistence');
    const tasks = await testLoadTasks(projectId);
    
    const foundTask = tasks.find(t => t.id === newTask.id);
    if (foundTask) {
      console.log('✅ Task successfully persisted:', foundTask);
      return { success: true, task: foundTask };
    } else {
      console.error('❌ Task not found after reload. Persistence test failed.');
      return { success: false, error: 'Task not found after reload' };
    }
  } catch (error) {
    console.error('Task lifecycle test failed:', error);
    return { success: false, error };
  }
}

/**
 * Analyze database tables
 */
export async function analyzeDatabase() {
  console.log('Analyzing database schema...');
  
  try {
    const response = await apiRequest('GET', '/api/system/database-schema');
    const schema = await response.json();
    console.log('Database schema:', schema);
    return schema;
  } catch (error) {
    console.error('Error analyzing database:', error);
    throw error;
  }
}

// Add these functions to the global window object for browser console access
declare global {
  interface Window {
    testLoadTasks: typeof testLoadTasks;
    testCreateTask: typeof testCreateTask;
    testUpdateTask: typeof testUpdateTask;
    testTaskLifecycle: typeof testTaskLifecycle;
    analyzeDatabase: typeof analyzeDatabase;
  }
}

// Export these functions to the global window object
if (typeof window !== 'undefined') {
  window.testLoadTasks = testLoadTasks;
  window.testCreateTask = testCreateTask;
  window.testUpdateTask = testUpdateTask;
  window.testTaskLifecycle = testTaskLifecycle;
  window.analyzeDatabase = analyzeDatabase;
}