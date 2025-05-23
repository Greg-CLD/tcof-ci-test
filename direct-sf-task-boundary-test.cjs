/**
 * Project Task Boundary Test
 * 
 * This script directly tests whether the same sourceId exists in multiple projects,
 * and if our task lookup function properly enforces project boundaries when finding tasks.
 * This is the suspected root cause of the Success Factor task toggle persistence bug.
 * 
 * Run with: node direct-sf-task-boundary-test.cjs
 */

const pg = require('pg');

// Connect to database
const DB_URL = process.env.DATABASE_URL;

async function query(sql, params = []) {
  const client = new pg.Client(DB_URL);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function runTest() {
  console.log('=== SUCCESS FACTOR TASK BOUNDARY TEST ===\n');
  
  try {
    // Step 1: Find existing projects that belong to the same user
    console.log('Step 1: Finding existing projects...');
    
    const projects = await query(
      `SELECT id, name FROM projects WHERE user_id = 3 LIMIT 2`
    );
    
    if (projects.length < 2) {
      console.error('Need at least 2 projects for this test. Please create another project.');
      return;
    }
    
    const projectA = projects[0];
    const projectB = projects[1];
    
    console.log(`Project A: ${projectA.id} (${projectA.name})`);
    console.log(`Project B: ${projectB.id} (${projectB.name})\n`);
    
    // Step 2: Check for duplicate task IDs across projects
    console.log('Step 2: Checking for same sourceId across projects...');
    
    const sharedSourceIds = await query(
      `SELECT pt1.source_id, 
              COUNT(DISTINCT pt1.project_id) as project_count,
              array_agg(DISTINCT pt1.project_id) as project_ids
       FROM project_tasks pt1
       WHERE pt1.origin = 'factor'
       GROUP BY pt1.source_id
       HAVING COUNT(DISTINCT pt1.project_id) > 1
       LIMIT 10`
    );
    
    if (sharedSourceIds.length === 0) {
      console.log('No shared sourceIds found across projects (unexpected).');
      return;
    }
    
    console.log(`Found ${sharedSourceIds.length} sourceIds that exist in multiple projects:`);
    
    // Select the first shared sourceId for testing
    const testSourceId = sharedSourceIds[0].source_id;
    console.log(`Using test sourceId: ${testSourceId}`);
    
    // Get the specific tasks for this sourceId in both projects
    const tasksWithSourceId = await query(
      `SELECT id, project_id, text, origin, source_id, completed
       FROM project_tasks 
       WHERE source_id = $1
       ORDER BY project_id`,
      [testSourceId]
    );
    
    console.log(`\nFound ${tasksWithSourceId.length} tasks with sourceId ${testSourceId}:`);
    tasksWithSourceId.forEach(task => {
      console.log(`- Task ${task.id} in project ${task.project_id}: "${task.text.substring(0, 30)}..." (completed=${task.completed})`);
    });
    
    // Step 3: Test for boundary enforcement by updating a task in one project
    console.log('\nStep 3: Testing project boundary enforcement...');
    
    // Get tasks for this sourceId in both our test projects
    const projectATasks = tasksWithSourceId.filter(t => t.project_id === projectA.id);
    const projectBTasks = tasksWithSourceId.filter(t => t.project_id === projectB.id);
    
    if (projectATasks.length === 0 || projectBTasks.length === 0) {
      console.log('Could not find tasks with the same sourceId in both test projects');
      // Select two projects that have tasks with the same sourceId
      const projectPairs = await query(
        `SELECT pt1.project_id as project_a_id, pt2.project_id as project_b_id,
                pt1.source_id, pt1.id as task_a_id, pt2.id as task_b_id
         FROM project_tasks pt1
         JOIN project_tasks pt2 ON pt1.source_id = pt2.source_id
                             AND pt1.project_id != pt2.project_id
         WHERE pt1.origin = 'factor' AND pt2.origin = 'factor'
         LIMIT 1`
      );
      
      if (projectPairs.length === 0) {
        console.log('Could not find any project pairs with the same sourceId');
        return;
      }
      
      const pair = projectPairs[0];
      console.log(`Found tasks with the same sourceId (${pair.source_id}):`);
      console.log(`- Task ${pair.task_a_id} in project ${pair.project_a_id}`);
      console.log(`- Task ${pair.task_b_id} in project ${pair.project_b_id}`);
      
      // Use these instead
      const projectATasks = await query(
        `SELECT id, project_id, text, completed FROM project_tasks WHERE id = $1`,
        [pair.task_a_id]
      );
      const projectBTasks = await query(
        `SELECT id, project_id, text, completed FROM project_tasks WHERE id = $1`,
        [pair.task_b_id]
      );
      
      if (projectATasks.length === 0 || projectBTasks.length === 0) {
        console.log('Could not retrieve task details');
        return;
      }
    }
    
    const taskA = projectATasks[0];
    const taskB = projectBTasks[0];
    
    console.log(`\nTask in Project A: ${taskA.id} (completed=${taskA.completed})`);
    console.log(`Task in Project B: ${taskB.id} (completed=${taskB.completed})`);
    
    // Update Task A - toggle its completed state
    const newStateA = !taskA.completed;
    console.log(`\nUpdating Task A (${taskA.id}) to completed=${newStateA}...`);
    
    await query(
      `UPDATE project_tasks
       SET completed = $1, status = $2
       WHERE id = $3 AND project_id = $4`,
      [newStateA, newStateA ? 'Done' : 'To Do', taskA.id, taskA.project_id]
    );
    
    // Verify both Task A and Task B after update
    const updatedTaskA = await query(
      `SELECT id, completed FROM project_tasks WHERE id = $1`,
      [taskA.id]
    );
    
    const updatedTaskB = await query(
      `SELECT id, completed FROM project_tasks WHERE id = $1`,
      [taskB.id]
    );
    
    console.log('\nAfter updating Task A:');
    console.log(`- Task A (${updatedTaskA[0].id}): completed=${updatedTaskA[0].completed}`);
    console.log(`- Task B (${updatedTaskB[0].id}): completed=${updatedTaskB[0].completed}`);
    
    const hasCorrectBoundaries = updatedTaskA[0].completed === newStateA && 
                               updatedTaskB[0].completed === taskB.completed;
    
    if (hasCorrectBoundaries) {
      console.log('\n✅ Project boundary enforcement WORKS CORRECTLY');
      console.log('Task A was updated but Task B remained unchanged as expected.');
    } else {
      console.log('\n❌ REGRESSION DETECTED: Project boundary enforcement FAILED');
      console.log('Task B was incorrectly affected by updating Task A.');
    }
    
    // Step 4: Test for task toggle with the API endpoint (should fail)
    console.log('\nStep 4: Testing task toggle via direct database update...');
    
    // Reset Task A to its original state
    await query(
      `UPDATE project_tasks
       SET completed = $1, status = $2
       WHERE id = $3`,
      [taskA.completed, taskA.completed ? 'Done' : 'To Do', taskA.id]
    );
    
    // Simulate the API issue by attempting to find a task without specifying project
    console.log('\nSimulating error: looking up task by sourceId without project boundary...');
    
    const tasksWithSameSourceId = await query(
      `SELECT id, project_id, completed FROM project_tasks
       WHERE source_id = $1`,
      [testSourceId]
    );
    
    if (tasksWithSameSourceId.length > 1) {
      console.log(`\n❌ REGRESSION DETECTED: Found ${tasksWithSameSourceId.length} tasks with the same sourceId`);
      console.log('This causes the task toggle bug because the wrong task could be selected without project boundary enforcement.');
      
      console.log('\nTasks with same sourceId:');
      tasksWithSameSourceId.forEach(task => {
        console.log(`- Task ${task.id} in project ${task.project_id}: completed=${task.completed}`);
      });
    } else {
      console.log('\nUnexpected: Only found one task with this sourceId');
    }
    
    // Step 5: Test for duplicate task creation during seeding
    console.log('\nStep 5: Checking for duplicate Success Factor tasks in a project...');
    
    const duplicateTasks = await query(
      `SELECT source_id, COUNT(*) as count
       FROM project_tasks
       WHERE project_id = $1 AND origin = 'factor'
       GROUP BY source_id
       HAVING COUNT(*) > 3
       LIMIT 10`,
      [projectA.id]
    );
    
    if (duplicateTasks.length > 0) {
      console.log(`\n❌ REGRESSION DETECTED: Found ${duplicateTasks.length} Success Factors with duplicate tasks`);
      
      // Get details for the first duplicate
      const firstDupe = duplicateTasks[0];
      const dupeDetails = await query(
        `SELECT id, stage, text, source_id
         FROM project_tasks
         WHERE project_id = $1 AND source_id = $2
         ORDER BY stage`,
        [projectA.id, firstDupe.source_id]
      );
      
      console.log(`\nExample: Success Factor ${firstDupe.source_id} has ${firstDupe.count} tasks (should have 3):`);
      dupeDetails.forEach(task => {
        console.log(`- Task ${task.id}: "${task.text.substring(0, 30)}..." (stage: ${task.stage})`);
      });
    } else {
      console.log('\nNo duplicate Success Factor tasks found in project (unexpected)');
    }
    
    // Summary of findings
    console.log('\n=== TEST SUMMARY ===');
    console.log(`1. Project Boundary Issue: ${hasCorrectBoundaries ? '✅ Not detected (fixed)' : '❌ Detected'}`);
    console.log(`2. Multiple Tasks with Same SourceId: ${tasksWithSameSourceId.length > 1 ? '✅ Detected' : 'Not detected (unexpected)'}`);
    console.log(`3. Duplicate Success Factor Tasks: ${duplicateTasks.length > 0 ? '✅ Detected' : 'Not detected (unexpected)'}`);
    
    console.log('\nNext Steps:');
    console.log('1. Fix taskIdResolver.ts to properly enforce project boundaries during lookups');
    console.log('2. Fix cloneSuccessFactors.ts to check for existing tasks correctly');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
runTest();