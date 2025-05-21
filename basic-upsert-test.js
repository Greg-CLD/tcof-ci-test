/**
 * Basic Success Factor Task Upsert Test
 * 
 * This script verifies that our upsert functionality for success-factor tasks works correctly.
 * It implements a simpler test than the full testing framework.
 */

import { randomUUID } from 'crypto';
import { storage } from './server/storage.js';

function createSuccessFactorUUID() {
  // Generate a random UUID for testing
  return randomUUID();
}

async function runTest() {
  console.log('=== SUCCESS FACTOR TASK UPSERT TEST ===\n');
  
  try {
    // Step 1: Get a valid project to test with
    console.log('Step 1: Getting a valid project...');
    const projects = await storage.getProjects();
    if (!projects || projects.length === 0) {
      console.error('❌ No projects found for testing');
      return false;
    }
    
    const projectId = projects[0].id;
    console.log(`✅ Found project ID: ${projectId}\n`);
    
    // Step 2: Generate a brand new UUID for the task
    const taskId = createSuccessFactorUUID();
    console.log(`Step 2: Generated test task ID: ${taskId}\n`);
    
    // Step 3: Verify the task doesn't exist
    console.log('Step 3: Verifying task does not exist...');
    try {
      const existingTask = await storage.getTaskById(taskId);
      if (existingTask) {
        console.error('❌ Task unexpectedly exists already, test cannot continue');
        return false;
      }
    } catch (error) {
      // Task not found is expected, so this is actually good
      console.log('✅ Confirmed task does not exist (expected error)');
    }
    
    // Step 4: Try to update the non-existent task (this should create it)
    console.log('\nStep 4: Attempting to update non-existent task...');
    const taskUpdate = {
      projectId,
      id: taskId,
      text: 'Test Success Factor Task',
      origin: 'success-factor',
      stage: 'identification',
      completed: false
    };
    
    try {
      const updatedTask = await storage.updateTask(taskId, taskUpdate);
      if (!updatedTask) {
        console.error('❌ Update returned no task');
        return false;
      }
      
      console.log('✅ Successfully created/updated task:');
      console.log(JSON.stringify(updatedTask, null, 2));
      
      // Verify the task attributes are set correctly
      const success = 
        updatedTask.id === taskId &&
        updatedTask.origin === 'success-factor' &&
        updatedTask.text === 'Test Success Factor Task';
      
      if (success) {
        console.log('\n✅ Task attributes are correctly set');
      } else {
        console.error('\n❌ Task attributes are incorrect');
        return false;
      }
      
      // Step 5: Clean up
      console.log('\nStep 5: Cleaning up test data...');
      const deleted = await storage.deleteTask(taskId);
      
      if (deleted) {
        console.log('✅ Test task successfully deleted');
      } else {
        console.log('⚠️ Could not delete test task');
      }
      
      console.log('\n🎉 SUCCESS FACTOR TASK UPSERT TEST PASSED!');
      return true;
      
    } catch (error) {
      console.error('❌ Error during task update:', error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

runTest().then(success => {
  if (!success) {
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  }
});