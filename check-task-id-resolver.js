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

import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

class MockTasksDB {
  constructor(db) {
    this.db = db;
  }

  async getTasksForProject(projectId) {
    console.log(`Getting tasks for project ${projectId}...`);
    const tasks = await this.db.execute(sql`
      SELECT * FROM project_tasks 
      WHERE project_id = ${projectId}
    `);
    console.log(`Found ${tasks.rows.length} tasks`);
    return tasks.rows || [];
  }

  async updateTask(taskId, projectId, updates) {
    console.log(`Updating task ${taskId} in project ${projectId} with:`, updates);
    const result = await this.db.execute(sql`
      UPDATE project_tasks
      SET completed = ${updates.completed}
      WHERE id = ${taskId} AND project_id = ${projectId}
      RETURNING *
    `);
    
    return result.rows[0] || null;
  }
}

class TaskIdResolver {
  constructor(tasksDb) {
    this.tasksDb = tasksDb;
  }
  
  // Extract a clean UUID from potentially composite ID strings
  cleanId(id) {
    if (!id) return null;
    
    // If it's already a clean UUID (with or without dashes)
    if (/^[0-9a-f-]{32,36}$/i.test(id)) {
      return id;
    }
    
    // Extract UUID from composite strings like "task_123-456_uuid"
    const uuidMatch = id.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch) {
      return uuidMatch[1];
    }
    
    return id;
  }
  
  async findTaskById(projectId, taskId, tasks = null) {
    console.log(`\n=== Finding task with ID ${taskId} in project ${projectId} ===`);
    
    // Get all tasks for this project if not provided
    const projectTasks = tasks || await this.tasksDb.getTasksForProject(projectId);
    
    // Strategy 1: Direct match with the raw ID
    console.log(`Strategy 1: Direct ID match with "${taskId}"`);
    const directMatch = projectTasks.find(task => task.id === taskId);
    if (directMatch) {
      console.log(`✅ Found direct match:`, { id: directMatch.id, text: directMatch.text });
      return { task: directMatch, strategy: 'direct-match' };
    }
    
    // Strategy 2: Try with cleaned UUID
    const cleanedId = this.cleanId(taskId);
    if (cleanedId && cleanedId !== taskId) {
      console.log(`Strategy 2: Clean UUID extraction - extracted "${cleanedId}" from "${taskId}"`);
      const cleanedMatch = projectTasks.find(task => task.id === cleanedId);
      if (cleanedMatch) {
        console.log(`✅ Found match after UUID cleaning:`, { id: cleanedMatch.id, text: cleanedMatch.text });
        return { task: cleanedMatch, strategy: 'clean-uuid' };
      }
    }
    
    // Strategy 3: Check if it matches a sourceId (for Success Factors)
    console.log(`Strategy 3: Lookup by sourceId`);
    const sourceIdMatch = projectTasks.find(task => task.sourceId === taskId);
    if (sourceIdMatch) {
      console.log(`✅ Found match by sourceId:`, { id: sourceIdMatch.id, sourceId: sourceIdMatch.sourceId, text: sourceIdMatch.text });
      return { task: sourceIdMatch, strategy: 'source-id' };
    }
    
    // Strategy 4: Partial ID match (without dashes)
    console.log(`Strategy 4: Partial ID match (without dashes)`);
    const noDashesId = taskId.replace(/-/g, '');
    const noDashesMatch = projectTasks.find(task => {
      const noDashesTaskId = task.id.replace(/-/g, '');
      return noDashesTaskId === noDashesId;
    });
    
    if (noDashesMatch) {
      console.log(`✅ Found match after removing dashes:`, { id: noDashesMatch.id, text: noDashesMatch.text });
      return { task: noDashesMatch, strategy: 'no-dashes' };
    }
    
    console.log(`❌ No task found with ID ${taskId} using any strategy`);
    return { task: null, strategy: 'not-found' };
  }
}

function printTaskLookupResult(result) {
  if (result.task) {
    console.log(`\nTask found using strategy: ${result.strategy}`);
    console.log(`ID: ${result.task.id}`);
    console.log(`Text: ${result.task.text || 'No text'}`);
    console.log(`Source ID: ${result.task.sourceId || 'No sourceId'}`);
    console.log(`Origin: ${result.task.origin || 'No origin'}`);
    console.log(`Completed: ${result.task.completed}`);
  } else {
    console.log(`\nNo task found`);
  }
}

async function runTests() {
  try {
    console.log('=== TASK ID RESOLVER TESTS ===');
    
    // Create instances
    const tasksDb = new MockTasksDB(db);
    const resolver = new TaskIdResolver(tasksDb);
    
    // Sample project to test with (this should be a real project ID from your database)
    const projectId = '29ef6e22-52fc-43e3-a05b-19c42bed7d49';
    
    // Get all tasks for this project
    const projectTasks = await tasksDb.getTasksForProject(projectId);
    
    if (projectTasks.length === 0) {
      console.error(`No tasks found for project ${projectId}`);
      return;
    }
    
    // Log all tasks
    console.log('\n=== All Tasks in Project ===');
    projectTasks.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id}, SourceId: ${task.sourceId || 'none'}, Origin: ${task.origin || 'none'}, Text: ${task.text || 'No text'}`);
    });
    
    // Find a Success Factor task if possible
    const successFactorTask = projectTasks.find(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (!successFactorTask) {
      console.log('No Success Factor tasks found in this project');
    } else {
      console.log('\n=== Testing with Success Factor Task ===');
      console.log(`Selected task: ${successFactorTask.id} (${successFactorTask.text})`);
      
      // Test 1: Direct ID lookup
      const directResult = await resolver.findTaskById(projectId, successFactorTask.id, projectTasks);
      printTaskLookupResult(directResult);
      
      // Test 2: Source ID lookup (if sourceId exists)
      if (successFactorTask.sourceId) {
        console.log('\n=== Testing Lookup by Source ID ===');
        const sourceIdResult = await resolver.findTaskById(projectId, successFactorTask.sourceId, projectTasks);
        printTaskLookupResult(sourceIdResult);
      }
      
      // Test 3: Composite ID lookup (simulate IDs that might come from UI)
      const compositeId = `task_${successFactorTask.id}_composite`;
      console.log(`\n=== Testing Lookup by Composite ID ===`);
      console.log(`Composite ID: ${compositeId}`);
      const compositeResult = await resolver.findTaskById(projectId, compositeId, projectTasks);
      printTaskLookupResult(compositeResult);
    }
    
    console.log('\n=== Testing Non-Existent Task ID ===');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const nonExistentResult = await resolver.findTaskById(projectId, fakeId, projectTasks);
    printTaskLookupResult(nonExistentResult);
    
    // Testing a real update
    if (successFactorTask) {
      console.log('\n=== Testing Task Update ===');
      const newCompletionState = !successFactorTask.completed;
      console.log(`Changing completion from ${successFactorTask.completed} to ${newCompletionState}`);
      
      // Find the task first
      const taskToUpdate = await resolver.findTaskById(projectId, successFactorTask.id, projectTasks);
      
      if (taskToUpdate.task) {
        // Perform the update
        const updatedTask = await tasksDb.updateTask(
          taskToUpdate.task.id, 
          projectId, 
          { completed: newCompletionState }
        );
        
        if (updatedTask) {
          console.log('✅ Task updated successfully!');
          console.log(`New state: completed=${updatedTask.completed}`);
        } else {
          console.log('❌ Task update failed!');
        }
      }
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();