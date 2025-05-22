/**
 * Success Factors Back-fill Script
 * 
 * This script ensures that all existing projects have the complete set of
 * canonical Success Factor tasks in their project_tasks table.
 * 
 * Run with: node scripts/backfill-success-factors.js
 */
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { cloneSuccessFactorsToProject } from '../server/cloneSuccessFactors.js';

/**
 * Run the back-fill operation
 */
async function backfillSuccessFactors() {
  try {
    console.log('Starting Success Factor tasks back-fill process...');
    
    // Get all unique project IDs that have at least one task
    const projectsResult = await db.execute(sql`
      SELECT DISTINCT project_id as id
      FROM project_tasks
      ORDER BY project_id
    `);
    
    if (!projectsResult.rows || projectsResult.rows.length === 0) {
      console.log('No projects found to process.');
      return;
    }
    
    console.log(`Found ${projectsResult.rows.length} existing projects to process`);
    let totalTasksAdded = 0;
    let projectsUpdated = 0;
    
    // Process each project
    for (const project of projectsResult.rows) {
      const projectId = project.id;
      console.log(`Processing project ${projectId}...`);
      
      try {
        // Run the clone operation (which will only add missing tasks)
        const tasksAdded = await cloneSuccessFactorsToProject(projectId);
        
        if (tasksAdded > 0) {
          console.log(`Added ${tasksAdded} missing Success Factor tasks to project ${projectId}`);
          totalTasksAdded += tasksAdded;
          projectsUpdated++;
        } else {
          console.log(`Project ${projectId} already has all Success Factor tasks`);
        }
      } catch (error) {
        console.error(`Error processing project ${projectId}:`, error);
        // Continue with next project
      }
    }
    
    console.log('\nBack-fill summary:');
    console.log(`- Total projects processed: ${projectsResult.rows.length}`);
    console.log(`- Projects updated: ${projectsUpdated}`);
    console.log(`- Total tasks added: ${totalTasksAdded}`);
    console.log('Back-fill process completed successfully');
  } catch (error) {
    console.error('Error during back-fill process:', error);
  } finally {
    // Close any open connections
    process.exit(0);
  }
}

// Execute the script
backfillSuccessFactors();