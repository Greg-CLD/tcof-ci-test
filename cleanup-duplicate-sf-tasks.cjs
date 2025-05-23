/**
 * Success Factor Task Duplicate Cleanup Script
 * 
 * This script:
 * 1. Identifies duplicate Success Factor tasks in the database (same sourceId and stage)
 * 2. Keeps only the most recently created task for each unique combination
 * 3. Deletes the older duplicate tasks
 * 
 * This is a one-time cleanup operation to fix existing duplicates. Once run,
 * the prevention fix in cloneSuccessFactors.ts will prevent new duplicates.
 */

const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Utility functions
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️ ${message}`);
}

// Find and clean up duplicate Success Factor tasks
async function cleanupDuplicateTasks() {
  logInfo('Finding all projects...');
  
  try {
    // Get all projects
    const projectsRes = await pool.query('SELECT id, name FROM projects');
    const projects = projectsRes.rows;
    
    logInfo(`Found ${projects.length} projects`);
    
    let totalDuplicatesFound = 0;
    let totalDuplicatesRemoved = 0;
    
    // Process each project
    for (const project of projects) {
      logInfo(`\nProcessing project: ${project.name} (${project.id})`);
      
      // Get all Success Factor tasks for this project
      const tasksRes = await pool.query(
        'SELECT id, source_id, stage, created_at FROM project_tasks WHERE project_id = $1 AND origin = $2',
        [project.id, 'factor']
      );
      
      const tasks = tasksRes.rows;
      logInfo(`Found ${tasks.length} Success Factor tasks`);
      
      // Group tasks by sourceId and stage
      const tasksBySourceIdAndStage = {};
      
      for (const task of tasks) {
        const key = `${task.source_id}:${task.stage}`;
        if (!tasksBySourceIdAndStage[key]) {
          tasksBySourceIdAndStage[key] = [];
        }
        tasksBySourceIdAndStage[key].push(task);
      }
      
      // Find duplicates (same sourceId and stage)
      const duplicateGroups = Object.entries(tasksBySourceIdAndStage)
        .filter(([key, tasksWithKey]) => tasksWithKey.length > 1);
      
      const projectDuplicatesFound = duplicateGroups.length;
      totalDuplicatesFound += projectDuplicatesFound;
      
      if (projectDuplicatesFound > 0) {
        logInfo(`Found ${projectDuplicatesFound} duplicated Success Factor tasks in this project`);
        
        // Handle each duplicate group
        for (const [key, duplicates] of duplicateGroups) {
          logInfo(`  Processing duplicate group: ${key} (${duplicates.length} duplicates)`);
          
          // Sort by created_at to keep the most recently created task
          duplicates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          // Keep the most recent task and delete the others
          const taskToKeep = duplicates[0];
          const tasksToDelete = duplicates.slice(1);
          
          logInfo(`  Keeping task ID: ${taskToKeep.id} (created: ${taskToKeep.created_at})`);
          logInfo(`  Deleting ${tasksToDelete.length} older duplicates`);
          
          // Delete older duplicate tasks
          for (const taskToDelete of tasksToDelete) {
            try {
              await pool.query('DELETE FROM project_tasks WHERE id = $1', [taskToDelete.id]);
              logSuccess(`  Deleted duplicate task: ${taskToDelete.id}`);
              totalDuplicatesRemoved++;
            } catch (error) {
              logError(`  Error deleting task ${taskToDelete.id}: ${error.message}`);
            }
          }
        }
      } else {
        logSuccess(`No duplicate Success Factor tasks found in this project`);
      }
    }
    
    // Overall summary
    console.log('\n=== CLEANUP SUMMARY ===');
    logInfo(`Total projects processed: ${projects.length}`);
    logInfo(`Total duplicate groups found: ${totalDuplicatesFound}`);
    logSuccess(`Total duplicate tasks removed: ${totalDuplicatesRemoved}`);
    
    return { success: true, duplicatesRemoved: totalDuplicatesRemoved };
  } catch (error) {
    logError(`Error during cleanup: ${error.message}`);
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    // Close the database connection pool
    await pool.end();
  }
}

// Run the cleanup process
cleanupDuplicateTasks()
  .then(result => {
    if (result.success) {
      logInfo('\nCleanup process completed successfully.');
      if (result.duplicatesRemoved > 0) {
        logSuccess(`Removed ${result.duplicatesRemoved} duplicate Success Factor tasks.`);
        logInfo('The system should now correctly handle task toggles without losing state.');
      } else {
        logInfo('No duplicate tasks needed to be removed.');
      }
    } else {
      logError('\nCleanup process failed.');
      logError(`Error: ${result.error}`);
    }
  });