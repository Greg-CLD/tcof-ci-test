/**
 * Test Script for TaskIdResolver Service
 * 
 * This script tests the functionality of the TaskIdResolver service 
 * by simulating task lookups with different ID formats:
 * 1. Exact ID match
 * 2. Clean UUID extraction from compound IDs
 * 3. Finding tasks by sourceId (for Success Factor tasks)
 * 
 * Run with: node check-task-id-resolver.js
 */

import { TaskIdResolver } from './server/services/taskIdResolver.js';
import { db } from './server/db.js';

// Enable debugging
process.env.DEBUG_TASKS = 'true';

// Test project ID (replace with a valid project ID from your database)
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Mock a simplified version of projectsDb for testing
const projectsDb = {
  async getTasksForProject(projectId) {
    console.log(`[TEST] Fetching tasks for project: ${projectId}`);
    
    // Connect to the real database
    const result = await db.query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [projectId]
    );
    
    console.log(`[TEST] Found ${result.rows.length} tasks`);
    return result.rows;
  },
  
  async updateTask(taskId, projectId, updates) {
    console.log(`[TEST] Simulating task update for task ${taskId} in project ${projectId}`);
    console.log(`[TEST] Updates:`, updates);
    
    // Don't actually update anything in this test
    return { id: taskId, ...updates };
  }
};

// Helper function to print task lookup results
function printTaskLookupResult(result) {
  console.log('------------------------------------------------');
  console.log(`Lookup Result: ${result.lookupMethod}`);
  console.log(`Original ID: ${result.originalId}`);
  
  if (result.task) {
    console.log(`Found Task ID: ${result.task.id}`);
    console.log(`Task Origin: ${result.task.origin || 'N/A'}`);
    console.log(`Task SourceID: ${result.task.sourceId || 'N/A'}`);
    console.log(`Task Completed: ${result.task.completed}`);
  } else {
    console.log('No task found');
  }
  console.log('------------------------------------------------');
}

// Main test function
async function runTests() {
  console.log('*** TESTING TASKIDRESOLVER SERVICE ***');
  
  try {
    // Get all tasks for the test project
    const allTasks = await projectsDb.getTasksForProject(TEST_PROJECT_ID);
    
    if (!allTasks || allTasks.length === 0) {
      console.error('[TEST] No tasks found for testing. Please use a valid project ID.');
      return;
    }
    
    // 1. Test exact ID match with a regular task ID
    const regularTask = allTasks.find(t => t.origin !== 'factor');
    if (regularTask) {
      console.log('\n*** TEST 1: Exact ID Match ***');
      const exactMatchResult = await TaskIdResolver.findTaskById(
        TEST_PROJECT_ID, 
        regularTask.id,
        projectsDb
      );
      printTaskLookupResult(exactMatchResult);
    }
    
    // 2. Test with a compound ID (adding a suffix to an existing ID)
    if (regularTask) {
      console.log('\n*** TEST 2: Compound ID Match ***');
      const compoundId = `${regularTask.id}-test-suffix`;
      console.log(`Creating compound ID: ${compoundId}`);
      
      const compoundIdResult = await TaskIdResolver.findTaskById(
        TEST_PROJECT_ID,
        compoundId,
        projectsDb
      );
      printTaskLookupResult(compoundIdResult);
    }
    
    // 3. Test with sourceId for a Success Factor task
    const successFactorTask = allTasks.find(t => t.origin === 'factor' && t.sourceId);
    if (successFactorTask) {
      console.log('\n*** TEST 3: SourceId Match ***');
      console.log(`Using sourceId: ${successFactorTask.sourceId}`);
      
      const sourceIdResult = await TaskIdResolver.findTaskById(
        TEST_PROJECT_ID,
        successFactorTask.sourceId,
        projectsDb
      );
      printTaskLookupResult(sourceIdResult);
      
      // 4. Test task synchronization
      console.log('\n*** TEST 4: Task Synchronization ***');
      const syncCount = await TaskIdResolver.syncRelatedTasks(
        TEST_PROJECT_ID,
        successFactorTask.sourceId,
        { completed: !successFactorTask.completed },
        projectsDb
      );
      
      console.log(`Synchronized ${syncCount} related tasks with sourceId: ${successFactorTask.sourceId}`);
    } else {
      console.log('\n*** SKIPPING Success Factor tests (no SF tasks found) ***');
    }
    
    console.log('\n*** ALL TESTS COMPLETED ***');
    
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Close any open database connections
    process.exit(0);
  }
}

// Run the tests
runTests();