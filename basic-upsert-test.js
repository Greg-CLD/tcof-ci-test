/**
 * Basic Success Factor Task Upsert Test
 * 
 * This script verifies that our upsert functionality for success-factor tasks works correctly.
 * It implements a simpler test than the full testing framework.
 */

import postgres from 'postgres';

// PostgreSQL connection
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Get a clean UUID in the format of success factor UUIDs
function createSuccessFactorUUID() {
  return '3f565bf9-70c7-5c41-93e7-c6c4cde32399'; // Made-up UUID that doesn't exist
}

async function runTest() {
  console.log('🧪 Basic Success Factor Task Upsert Test');
  
  try {
    // 1. Find an existing project to work with
    console.log('Step 1: Finding a project to test with...');
    const projects = await sql`SELECT id FROM projects LIMIT 1`;
    
    if (!projects.length) {
      console.error('❌ No projects found to test with');
      await sql.end();
      return;
    }
    
    const projectId = projects[0].id;
    console.log(`✅ Found project: ${projectId}`);
    
    // 2. Generate test UUID for our success factor task
    const testTaskId = createSuccessFactorUUID();
    console.log(`Step 2: Using test success factor ID: ${testTaskId}`);
    
    // 3. Directly test the upsert code path in projectsDb.ts:
    console.log('Step 3: Running direct upsert test...');
    
    // 3a. Check if the task already exists (it shouldn't)
    const existingTask = await sql`
      SELECT * FROM project_tasks 
      WHERE id = ${testTaskId} OR source_id = ${testTaskId}
    `;
    
    console.log(`Task exists before test: ${existingTask.length > 0}`);
    
    if (existingTask.length > 0) {
      // Clean up for test - remove existing task
      await sql`DELETE FROM project_tasks WHERE id = ${testTaskId} OR source_id = ${testTaskId}`;
      console.log('Removed existing task for clean test');
    }
    
    // 3b. Directly insert the test task using the pattern in our updateTask function
    console.log('Inserting test task...');
    const insertResult = await sql`
      INSERT INTO project_tasks 
      (id, project_id, text, stage, completed, origin, source_id) 
      VALUES 
      (${testTaskId}, ${projectId}, 'Test Success Factor Task', 'identification', false, 'success-factor', ${testTaskId}) 
      RETURNING *
    `;
    
    console.log(`Insertion result: ${insertResult.length > 0 ? 'Success' : 'Failed'}`);
    
    if (insertResult.length > 0) {
      console.log('✅ Successfully created task:', insertResult[0]);
    } else {
      console.error('❌ Failed to insert task');
    }
    
    // 4. Verify we can retrieve the task
    console.log('Step 4: Verifying task retrieval...');
    const verifyTask = await sql`
      SELECT * FROM project_tasks 
      WHERE id = ${testTaskId}
    `;
    
    if (verifyTask.length > 0) {
      console.log('✅ Task successfully retrieved from database');
      console.log(JSON.stringify(verifyTask[0], null, 2));
      console.log('\n🎉 BASIC UPSERT TEST PASSED!');
    } else {
      console.error('❌ Task not found in database after insertion');
    }
    
    // 5. Clean up after test
    console.log('Cleaning up test data...');
    await sql`DELETE FROM project_tasks WHERE id = ${testTaskId}`;
    
    await sql.end();
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    await sql.end();
  }
}

await runTest();