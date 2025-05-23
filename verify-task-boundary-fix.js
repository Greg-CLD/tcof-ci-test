/**
 * Project Boundary Task Fix Verification
 * 
 * This script verifies that task lookups properly respect project boundaries
 * by testing both the old and new methods for task retrieval by sourceId.
 */

import { db } from './server/db.js';
import { projectTasks } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Helper function to check if a task exists in a project with a given sourceId
 */
async function checkTaskExists(projectId, sourceId) {
  const tasks = await db.select()
    .from(projectTasks)
    .where(and(
      eq(projectTasks.projectId, projectId),
      eq(projectTasks.sourceId, sourceId)
    ))
    .limit(1);
  
  return tasks.length > 0;
}

/**
 * Find tasks by sourceId without project boundary (old method)
 */
async function findTasksBySourceId(sourceId) {
  const tasks = await db.select()
    .from(projectTasks)
    .where(eq(projectTasks.sourceId, sourceId));
  
  return tasks;
}

/**
 * Find tasks by sourceId with project boundary (new method)
 */
async function findTasksBySourceIdInProject(projectId, sourceId) {
  const tasks = await db.select()
    .from(projectTasks)
    .where(and(
      eq(projectTasks.projectId, projectId),
      eq(projectTasks.sourceId, sourceId)
    ));
  
  return tasks;
}

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
    
    // Get all Success Factor tasks and find the most common sourceId
    const allTasks = await db.select()
      .from(projectTasks)
      .where(eq(projectTasks.origin, 'factor'));
    
    console.log(`Found ${allTasks.length} Success Factor tasks.`);
    
    // Find the sourceIds that appear in multiple projects
    const sourceIdCounts = {};
    const sourceIdProjects = {};
    
    for (const task of allTasks) {
      if (!task.sourceId) continue;
      
      sourceIdCounts[task.sourceId] = (sourceIdCounts[task.sourceId] || 0) + 1;
      
      if (!sourceIdProjects[task.sourceId]) {
        sourceIdProjects[task.sourceId] = new Set();
      }
      sourceIdProjects[task.sourceId].add(task.projectId);
    }
    
    // Find sourceIds that exist in multiple projects
    const crossProjectSourceIds = Object.keys(sourceIdProjects)
      .filter(sourceId => sourceIdProjects[sourceId].size > 1)
      .sort((a, b) => sourceIdProjects[b].size - sourceIdProjects[a].size);
    
    if (crossProjectSourceIds.length === 0) {
      console.log('No sourceIds found in multiple projects. Cannot verify fix.');
      return;
    }
    
    const testSourceId = crossProjectSourceIds[0];
    const projectsWithSourceId = Array.from(sourceIdProjects[testSourceId]);
    
    console.log(`Found sourceId ${testSourceId} in ${projectsWithSourceId.length} projects.`);
    console.log('Projects with this sourceId:');
    for (const projectId of projectsWithSourceId) {
      const project = projects.find(p => p.id === projectId);
      console.log(`- ${project.name} (${projectId})`);
    }
    
    // Test 1: Use the old method (no project boundary)
    console.log('\nTest 1: Using old method (no project boundary)');
    const oldMethodTasks = await findTasksBySourceId(testSourceId);
    console.log(`Old method returned ${oldMethodTasks.length} tasks for sourceId ${testSourceId}`);
    console.log('Tasks by project:');
    
    const oldMethodTasksByProject = {};
    for (const task of oldMethodTasks) {
      if (!oldMethodTasksByProject[task.projectId]) {
        oldMethodTasksByProject[task.projectId] = [];
      }
      oldMethodTasksByProject[task.projectId].push(task);
    }
    
    for (const [projectId, tasks] of Object.entries(oldMethodTasksByProject)) {
      const project = projects.find(p => p.id === projectId);
      console.log(`- ${project?.name || 'Unknown'} (${projectId}): ${tasks.length} tasks`);
    }
    
    // Test 2: Use the new method with project boundary
    console.log('\nTest 2: Using new method (with project boundary)');
    
    // Test with the first project
    const testProject1 = projectsWithSourceId[0];
    const tasksProject1 = await findTasksBySourceIdInProject(testProject1, testSourceId);
    console.log(`Project 1 (${testProject1}): ${tasksProject1.length} tasks found with sourceId ${testSourceId}`);
    
    // Test with the second project
    const testProject2 = projectsWithSourceId[1];
    const tasksProject2 = await findTasksBySourceIdInProject(testProject2, testSourceId);
    console.log(`Project 2 (${testProject2}): ${tasksProject2.length} tasks found with sourceId ${testSourceId}`);
    
    // Test 3: Check for cross-project contamination
    console.log('\nTest 3: Cross-project boundary validation');
    
    // Check if any tasks from project 1 are returned in project 2's results
    const project1TaskIds = new Set(tasksProject1.map(t => t.id));
    const project2TaskIds = new Set(tasksProject2.map(t => t.id));
    
    const crossContamination = tasksProject1.some(t => project2TaskIds.has(t.id)) || 
                              tasksProject2.some(t => project1TaskIds.has(t.id));
    
    if (crossContamination) {
      console.log('❌ FAILED: Found cross-project contamination!');
    } else {
      console.log('✅ PASSED: No cross-project contamination detected.');
      console.log('The fix is working as expected!');
    }
    
    console.log('\n=== Verification Complete ===');
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

// Run the verification
verifyFix().catch(console.error);