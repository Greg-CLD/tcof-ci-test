/**
 * Task ID Resolver Test Script
 * 
 * This script tests the TaskIdResolver to verify it's correctly finding tasks
 * and enforcing project boundaries during lookups.
 * 
 * Run with: node check-task-id-resolver.js
 */
const { db } = require('./db');
const { projectsDb } = require('./server/projectsDb');
const { getTaskIdResolver } = require('./server/services/taskIdResolver');

// Set to true for more detailed logging
const DEBUG = true;

async function runTest() {
  console.log('=== TASK ID RESOLVER TEST ===');
  
  try {
    // Step 1: Get a test project for verification
    console.log('\nSTEP 1: Finding test project...');
    const projectId = '29ef6e22-52fc-43e3-a05b-19c42bed7d49'; // Use a known project
    
    // Step 2: Get all tasks for this project
    console.log(`\nSTEP 2: Getting all tasks for project ${projectId}...`);
    const tasks = await projectsDb.getTasksForProject(projectId);
    
    if (!tasks || tasks.length === 0) {
      console.error('No tasks found for this project!');
      return;
    }
    
    console.log(`Found ${tasks.length} tasks in project ${projectId}`);
    
    // Step 3: Find a Success Factor task for testing
    console.log('\nSTEP 3: Finding a Success Factor task to test...');
    const successFactorTasks = tasks.filter(t => 
      t.origin === 'factor' || t.origin === 'success-factor' ||
      t.source === 'factor' || t.source === 'success-factor'
    );
    
    if (successFactorTasks.length === 0) {
      console.error('No Success Factor tasks found in this project!');
      return;
    }
    
    const testTask = successFactorTasks[0];
    console.log('Selected Success Factor task:');
    console.log(`- ID: ${testTask.id}`);
    console.log(`- Text: ${testTask.text}`);
    console.log(`- Origin: ${testTask.origin}`);
    console.log(`- Source ID: ${testTask.sourceId || 'none'}`);
    
    // Step 4: Create the TaskIdResolver
    console.log('\nSTEP 4: Initializing TaskIdResolver...');
    const resolver = getTaskIdResolver(projectsDb);
    
    // Step 5: Test finding the task by its ID
    console.log('\nSTEP 5: Testing direct ID lookup...');
    const taskByDirectId = await resolver.findTaskById(testTask.id, projectId);
    
    if (taskByDirectId) {
      console.log('✅ SUCCESS: Found task by direct ID');
      console.log(`- Found ID: ${taskByDirectId.id}`);
      console.log(`- Found Text: ${taskByDirectId.text}`);
    } else {
      console.error('❌ FAILURE: Could not find task by direct ID');
    }
    
    // Step 6: If the task has a sourceId, test finding by sourceId
    if (testTask.sourceId) {
      console.log('\nSTEP 6: Testing sourceId lookup...');
      const taskBySourceId = await resolver.findTaskById(testTask.sourceId, projectId);
      
      if (taskBySourceId) {
        console.log('✅ SUCCESS: Found task by sourceId');
        console.log(`- Found ID: ${taskBySourceId.id}`);
        console.log(`- Found Text: ${taskBySourceId.text}`);
        
        // Check that the found task is in the correct project
        if (taskBySourceId.projectId === projectId) {
          console.log('✅ Correct project ID for found task');
        } else {
          console.error(`❌ CRITICAL ISSUE: Found task from wrong project: ${taskBySourceId.projectId}`);
          console.error('This is the root cause of task toggle persistence failures!');
        }
      } else {
        console.log('❌ FAILURE: Could not find task by sourceId');
      }
      
      // CRITICAL TEST: Try finding the same sourceId in a DIFFERENT project
      // This is the key test to verify project boundary enforcement
      console.log('\nSTEP 7: Testing cross-project sourceId lookup (should NOT find)...');
      
      // Get a different project ID
      const allProjects = await projectsDb.getProjects();
      const differentProjects = allProjects.filter(p => p.id !== projectId);
      
      if (differentProjects.length > 0) {
        const differentProjectId = differentProjects[0].id;
        console.log(`Using different project ID: ${differentProjectId}`);
        
        const taskInDifferentProject = await resolver.findTaskById(testTask.sourceId, differentProjectId);
        
        if (taskInDifferentProject) {
          console.error('❌ CRITICAL ISSUE: Found task by sourceId in a DIFFERENT project!');
          console.error('This allows cross-project task updates and causes persistence failures!');
          console.error(`- Found ID: ${taskInDifferentProject.id}`);
          console.error(`- Found in project: ${taskInDifferentProject.projectId}`);
        } else {
          console.log('✅ GOOD: Could not find task by sourceId in a different project');
          console.log('Project boundary enforcement is working correctly');
        }
      } else {
        console.log('No other projects available for cross-project test');
      }
    } else {
      console.log('\nSkipping sourceId tests - task has no sourceId');
    }
    
    // Step 8: Final diagnosis
    console.log('\n=== DIAGNOSIS SUMMARY ===');
    
    if (taskByDirectId && testTask.sourceId && !await resolver.findTaskById(testTask.sourceId, projectId)) {
      console.log('ISSUE: sourceId lookup is not working correctly');
      console.log('This can cause task toggles to fail when the client uses sourceId instead of ID');
    } else if (testTask.sourceId && await resolver.findTaskById(testTask.sourceId, differentProjectId)) {
      console.log('CRITICAL ISSUE: Cross-project task lookup is allowed!');
      console.log('This is the likely root cause of task toggle persistence failures.');
      console.log('The system is updating tasks in the wrong project, making toggles appear to work');
      console.log('but not actually persisting in the correct project context.');
    } else {
      console.log('Task ID resolution appears to be working correctly');
      console.log('Further investigation needed in the task update process itself');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
runTest().catch(console.error);