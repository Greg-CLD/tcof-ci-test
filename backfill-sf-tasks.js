/**
 * Success Factors Backfill Script
 * 
 * This standalone script ensures all existing projects have
 * all canonical Success Factor tasks added to their project_tasks table.
 * 
 * Run with: node backfill-sf-tasks.js
 */
import { db } from './db/index.js';
import { cloneAllSuccessFactorTasks } from './server/cloneSuccessFactors.js';
import { sql } from 'drizzle-orm';

const DEBUG = true;

async function main() {
  try {
    console.log('Starting Success Factor tasks back-fill process...');
    
    // Get all projects
    console.log('Retrieving all projects...');
    const projects = await db.execute(sql`
      SELECT id 
      FROM projects 
      ORDER BY id
    `);
    
    if (!projects || !projects.rows || projects.rows.length === 0) {
      console.log('No projects found to process.');
      return;
    }
    
    console.log(`Found ${projects.rows.length} projects to process.`);
    
    let projectsUpdated = 0;
    let totalTasksAdded = 0;
    
    // Process each project
    for (const project of projects.rows) {
      const projectId = project.id;
      console.log(`Processing project ${projectId}...`);
      
      try {
        // Get current tasks count
        const beforeCount = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM project_tasks
          WHERE project_id = ${projectId} AND origin = 'factor'
        `);
        
        const beforeTaskCount = beforeCount.rows[0]?.count || 0;
        console.log(`Project ${projectId} has ${beforeTaskCount} Success Factor tasks before back-fill.`);
        
        // Clone all Success Factor tasks for the project
        const tasksAdded = await cloneAllSuccessFactorTasks(projectId);
        
        // Get updated tasks count
        const afterCount = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM project_tasks
          WHERE project_id = ${projectId} AND origin = 'factor'
        `);
        
        const afterTaskCount = afterCount.rows[0]?.count || 0;
        
        if (afterTaskCount > beforeTaskCount) {
          const actualTasksAdded = afterTaskCount - beforeTaskCount;
          console.log(`Added ${actualTasksAdded} Success Factor tasks to project ${projectId}`);
          totalTasksAdded += actualTasksAdded;
          projectsUpdated++;
        } else {
          console.log(`Project ${projectId} already has all Success Factor tasks (${afterTaskCount} tasks).`);
        }
      } catch (error) {
        console.error(`Error processing project ${projectId}:`, error);
        // Continue with the next project
      }
    }
    
    console.log('\nBack-fill summary:');
    console.log(`- Projects processed: ${projects.rows.length}`);
    console.log(`- Projects updated: ${projectsUpdated}`);
    console.log(`- Total tasks added: ${totalTasksAdded}`);
    
  } catch (error) {
    console.error('Error running back-fill script:', error);
  } finally {
    console.log('Back-fill process complete.');
    process.exit(0);
  }
}

// Run the script
main();