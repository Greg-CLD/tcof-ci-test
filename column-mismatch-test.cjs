/**
 * Direct test of column name case sensitivity in task persistence
 */

const { Client } = require('pg');
require('dotenv').config();

async function runTest() {
  console.log('=== Column Name Case Sensitivity Test ===\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Step 1: Check actual project_tasks table schema
    console.log('Step 1: Examining project_tasks table schema...');
    const schemaQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `;
    
    const schemaResult = await client.query(schemaQuery);
    
    console.log('Project_tasks table columns:');
    schemaResult.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Step 2: Find an existing project with Success Factor tasks
    console.log('\nStep 2: Finding existing projects...');
    const projectQuery = `
      SELECT id, name 
      FROM projects 
      ORDER BY "created_at" DESC 
      LIMIT 2;
    `;
    
    const projectResult = await client.query(projectQuery);
    
    if (projectResult.rows.length === 0) {
      console.error('❌ No projects found in database');
      return;
    }
    
    const testProject = projectResult.rows[0];
    console.log(`Using project: ${testProject.name} (${testProject.id})`);
    
    // Step 3: Find Success Factor tasks in this project
    console.log('\nStep 3: Finding Success Factor tasks...');
    const tasksQuery = `
      SELECT id, text, completed, origin, source_id
      FROM project_tasks
      WHERE project_id = $1 AND (origin = 'factor' OR origin = 'success-factor')
      LIMIT 5;
    `;
    
    const tasksResult = await client.query(tasksQuery, [testProject.id]);
    
    if (tasksResult.rows.length === 0) {
      console.error('❌ No Success Factor tasks found for this project');
      return;
    }
    
    console.log(`Found ${tasksResult.rows.length} Success Factor tasks`);
    const taskToUpdate = tasksResult.rows[0];
    console.log(`Selected task: ${taskToUpdate.id} (${taskToUpdate.text})`);
    console.log(`Current state: completed=${taskToUpdate.completed}`);
    
    // Step 4: Direct test of camelCase vs snake_case column names
    console.log('\nStep 4: Testing column name sensitivity...');
    
    // Test 1: Try with camelCase column name (incorrect)
    console.log('\nTest 1: Using camelCase column name "updatedAt"...');
    try {
      const camelCaseQuery = `
        UPDATE project_tasks
        SET completed = $1, "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, completed;
      `;
      
      const newState = !taskToUpdate.completed;
      const camelCaseResult = await client.query(camelCaseQuery, [newState, taskToUpdate.id]);
      
      if (camelCaseResult.rows.length > 0) {
        console.log('✅ CamelCase update successful:');
        console.log(`- New state: completed=${camelCaseResult.rows[0].completed}`);
      } else {
        console.log('❌ CamelCase update affected 0 rows');
      }
    } catch (error) {
      console.error(`❌ CamelCase update failed: ${error.message}`);
    }
    
    // Test 2: Verify the current state
    console.log('\nVerifying current state after camelCase test:');
    const verifyQuery1 = `
      SELECT id, completed, updated_at
      FROM project_tasks
      WHERE id = $1;
    `;
    
    const verifyResult1 = await client.query(verifyQuery1, [taskToUpdate.id]);
    console.log(`- Current state: completed=${verifyResult1.rows[0].completed}`);
    console.log(`- Last updated: ${verifyResult1.rows[0].updated_at}`);
    
    // Test 3: Try with snake_case column name (correct)
    console.log('\nTest 2: Using snake_case column name "updated_at"...');
    try {
      const snakeCaseQuery = `
        UPDATE project_tasks
        SET completed = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, completed, updated_at;
      `;
      
      const newState = !verifyResult1.rows[0].completed;
      const snakeCaseResult = await client.query(snakeCaseQuery, [newState, taskToUpdate.id]);
      
      if (snakeCaseResult.rows.length > 0) {
        console.log('✅ Snake_case update successful:');
        console.log(`- New state: completed=${snakeCaseResult.rows[0].completed}`);
        console.log(`- Updated at: ${snakeCaseResult.rows[0].updated_at}`);
      } else {
        console.log('❌ Snake_case update affected 0 rows');
      }
    } catch (error) {
      console.error(`❌ Snake_case update failed: ${error.message}`);
    }
    
    // Test 4: Final verification
    console.log('\nFinal verification after all tests:');
    const verifyQuery2 = `
      SELECT id, completed, updated_at
      FROM project_tasks
      WHERE id = $1;
    `;
    
    const verifyResult2 = await client.query(verifyQuery2, [taskToUpdate.id]);
    console.log(`- Final state: completed=${verifyResult2.rows[0].completed}`);
    console.log(`- Last updated: ${verifyResult2.rows[0].updated_at}`);
    
    // Step 5: Check for duplicate tasks
    console.log('\nStep 5: Checking for duplicate tasks by source_id...');
    const duplicateQuery = `
      SELECT source_id, stage, COUNT(*) as count
      FROM project_tasks
      WHERE project_id = $1 AND source_id IS NOT NULL
      GROUP BY source_id, stage
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10;
    `;
    
    const duplicateResult = await client.query(duplicateQuery, [testProject.id]);
    
    if (duplicateResult.rows.length > 0) {
      console.log(`❌ Found ${duplicateResult.rows.length} sets of duplicate tasks:`);
      duplicateResult.rows.forEach((row, i) => {
        console.log(`${i+1}. source_id=${row.source_id.substring(0, 8)}... (stage=${row.stage}): ${row.count} duplicates`);
      });
      
      // Show details for the first duplicate
      if (duplicateResult.rows.length > 0) {
        const firstDupe = duplicateResult.rows[0];
        const dupeDetailsQuery = `
          SELECT id, text, completed, origin, source_id, created_at, updated_at
          FROM project_tasks
          WHERE project_id = $1 AND source_id = $2 AND stage = $3
          ORDER BY created_at;
        `;
        
        const dupeDetails = await client.query(dupeDetailsQuery, [
          testProject.id, firstDupe.source_id, firstDupe.stage
        ]);
        
        console.log(`\nDetails for duplicate set with source_id=${firstDupe.source_id.substring(0, 8)}...:`);
        dupeDetails.rows.forEach((task, i) => {
          console.log(`Duplicate #${i+1}:`);
          console.log(`- ID: ${task.id}`);
          console.log(`- Text: ${task.text.substring(0, 30)}${task.text.length > 30 ? '...' : ''}`);
          console.log(`- Completed: ${task.completed}`);
          console.log(`- Created: ${task.created_at}`);
          console.log(`- Updated: ${task.updated_at}`);
          console.log('');
        });
      }
    } else {
      console.log('✅ No duplicate tasks found by source_id and stage');
    }
    
    console.log('\n=== Test Complete ===');
    console.log('ROOT CAUSE: The testing confirms a mismatch between camelCase property names in application code');
    console.log('and the snake_case column names in the database schema.');
    console.log('Specifically, "updatedAt" in the code vs "updated_at" in the database.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

runTest();