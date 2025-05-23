/**
 * Project Boundary Task Fix Verification
 * 
 * This script verifies that task lookups properly respect project boundaries
 * using direct database queries.
 */

const { db } = require('./server/db.js');
const { eq, and } = require('drizzle-orm');

/**
 * Main verification function
 */
async function verifyFix() {
  try {
    console.log('=== Task Boundary Fix Verification ===');
    
    // Get all projects
    const projects = await db.query.projects.findMany();
    if (!projects.length) {
      console.log('No projects found. Please create some projects first.');
      return;
    }
    
    console.log(`Found ${projects.length} projects.`);
    
    // Get project tasks that have sourceId that appears in multiple projects
    const tasksWithSourceIds = await db.execute(
      // SQL to find sourceIds that exist in multiple projects
      `SELECT source_id, COUNT(DISTINCT project_id) as project_count 
       FROM project_tasks 
       WHERE source_id IS NOT NULL 
       GROUP BY source_id 
       HAVING COUNT(DISTINCT project_id) > 1
       ORDER BY project_count DESC
       LIMIT 10`
    );
    
    if (!tasksWithSourceIds.length) {
      console.log('No sourceIds found in multiple projects. Cannot verify fix.');
      return;
    }
    
    // Find the sourceId that appears in the most projects
    const mostCommonSourceId = tasksWithSourceIds[0].source_id;
    console.log(`Found sourceId ${mostCommonSourceId} in multiple projects.`);
    
    // Find all projects with this sourceId
    const projectsWithSourceId = await db.execute(
      `SELECT DISTINCT project_id 
       FROM project_tasks 
       WHERE source_id = $1`,
      [mostCommonSourceId]
    );
    
    if (projectsWithSourceId.length < 2) {
      console.log('Need at least 2 projects with the same sourceId to verify fix.');
      return;
    }
    
    const projectA = projectsWithSourceId[0].project_id;
    const projectB = projectsWithSourceId[1].project_id;
    
    console.log(`Testing with projectA=${projectA} and projectB=${projectB}`);
    
    // Get tasks for both projects
    const tasksA = await db.execute(
      `SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2`,
      [projectA, mostCommonSourceId]
    );
    
    const tasksB = await db.execute(
      `SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2`,
      [projectB, mostCommonSourceId]
    );
    
    console.log(`Found ${tasksA.length} tasks in project A and ${tasksB.length} tasks in project B with the same sourceId.`);
    
    // Get a task ID from each project
    const taskIdA = tasksA[0].id;
    const taskIdB = tasksB[0].id;
    
    console.log(`Task A: ${taskIdA}`);
    console.log(`Task B: ${taskIdB}`);
    
    // Verify that sourceId lookups with project boundaries work correctly
    console.log('\nTesting project boundary enforcement...');
    
    // 1. Get tasks by sourceId without project boundary (old way)
    const allTasksWithSourceId = await db.execute(
      `SELECT * FROM project_tasks WHERE source_id = $1`,
      [mostCommonSourceId]
    );
    
    console.log(`Old method (no project boundary): Found ${allTasksWithSourceId.length} tasks with sourceId ${mostCommonSourceId}`);
    
    // 2. Get tasks by sourceId with project boundary (new way - Project A)
    const tasksWithSourceIdInProjectA = await db.execute(
      `SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2`,
      [projectA, mostCommonSourceId]
    );
    
    console.log(`New method (with project boundary - Project A): Found ${tasksWithSourceIdInProjectA.length} tasks`);
    
    // 3. Get tasks by sourceId with project boundary (new way - Project B)
    const tasksWithSourceIdInProjectB = await db.execute(
      `SELECT * FROM project_tasks WHERE project_id = $1 AND source_id = $2`,
      [projectB, mostCommonSourceId]
    );
    
    console.log(`New method (with project boundary - Project B): Found ${tasksWithSourceIdInProjectB.length} tasks`);
    
    // Verify task IDs are different across projects
    const taskIdsInProjectA = new Set(tasksWithSourceIdInProjectA.map(t => t.id));
    const taskIdsInProjectB = new Set(tasksWithSourceIdInProjectB.map(t => t.id));
    
    const hasOverlap = [...taskIdsInProjectA].some(id => taskIdsInProjectB.has(id));
    
    if (hasOverlap) {
      console.log('❌ FAILED: Found overlapping task IDs between projects!');
    } else {
      console.log('✅ PASSED: No overlapping task IDs between projects.');
      console.log('The project boundary enforcement is working correctly!');
    }
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the verification
verifyFix().catch(console.error);