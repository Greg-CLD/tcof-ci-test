/**
 * Diagnostic Task Lookup
 * 
 * This script captures:
 * 1. All tasks in a project with their IDs and sourceIds
 * 2. Whether a specific task ID or sourceId exists in those tasks
 * 3. No changes to the database - read only
 */

import pg from 'pg';

// Database connection
const dbConfig = {
  connectionString: process.env.DATABASE_URL
};

// The specific task ID to diagnose
const TARGET_TASK_ID = '3f197b9f-51f4-5c52-b05e-c035eeb92621';

// Project ID to search in (use the actual ID of your project)
const PROJECT_ID = '7277a5fe-899b-4fe6-8e35-05dd6103d054';

// Create a client
const client = new pg.Client(dbConfig);

async function runDiagnostic() {
  console.log(`\n========= TASK LOOKUP DIAGNOSTIC =========`);
  console.log(`Target Task ID: ${TARGET_TASK_ID}`);
  console.log(`Project ID: ${PROJECT_ID}\n`);
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get all tasks for the project
    console.log(`Querying all tasks for project: ${PROJECT_ID}...`);
    const tasksResult = await client.query(
      'SELECT id, source_id, origin, text FROM project_tasks WHERE project_id = $1',
      [PROJECT_ID]
    );
    
    console.log(`Found ${tasksResult.rows.length} tasks in project\n`);
    
    // Display all tasks with detailed info
    console.log('COMPLETE TASK LIST:');
    console.log('ID | Origin | SourceID | Text');
    console.log('-'.repeat(100));
    
    // Track if we found a match
    let foundExactId = false;
    let foundSourceId = false;
    
    tasksResult.rows.forEach(task => {
      // Check if this task matches our target
      const exactIdMatch = task.id === TARGET_TASK_ID;
      const sourceIdMatch = task.source_id === TARGET_TASK_ID;
      
      // Record if we found a match
      if (exactIdMatch) foundExactId = true;
      if (sourceIdMatch) foundSourceId = true;
      
      // Display task with match indicators
      console.log(`${task.id} ${exactIdMatch ? '✓' : '✗'} | ${task.origin || 'standard'} | ${task.source_id || 'N/A'} ${sourceIdMatch ? '✓' : '✗'} | ${task.text?.substring(0, 40) || 'N/A'}...`);
    });
    
    // Display PUT payload that would be sent
    console.log('\nSIMULATED PUT REQUEST:');
    console.log(`PUT /api/projects/${PROJECT_ID}/tasks/${TARGET_TASK_ID}`);
    console.log(`Content-Type: application/json`);
    console.log(`\nRequest Body:`);
    console.log(JSON.stringify({
      completed: true // This is the typical payload for toggling completion
    }, null, 2));
    
    // Summary of findings
    console.log('\nDIAGNOSTIC SUMMARY:');
    console.log(`Task ID exists as primary key (id): ${foundExactId ? '✓ YES' : '✗ NO'}`);
    console.log(`Task ID exists as source_id: ${foundSourceId ? '✓ YES' : '✗ NO'}`);
    
    if (!foundExactId && !foundSourceId) {
      console.log('\n⚠️ TARGET TASK NOT FOUND IN THIS PROJECT');
      
      // Additional search - try to find this task in any project
      console.log('\nSearching for task across all projects...');
      const globalSearchResult = await client.query(
        'SELECT project_id, id, source_id, origin, text FROM project_tasks WHERE id = $1 OR source_id = $1',
        [TARGET_TASK_ID]
      );
      
      if (globalSearchResult.rows.length > 0) {
        console.log(`✓ Found ${globalSearchResult.rows.length} matching tasks in other projects:`);
        globalSearchResult.rows.forEach(task => {
          console.log(`- Project: ${task.project_id}, ID: ${task.id}, Origin: ${task.origin || 'standard'}, SourceID: ${task.source_id || 'N/A'}`);
        });
      } else {
        console.log('✗ Task not found in any project');
        
        // Let's check if this ID exists in the success_factors table
        const factorResult = await client.query(
          'SELECT id, title FROM success_factors WHERE id = $1',
          [TARGET_TASK_ID]
        );
        
        if (factorResult.rows.length > 0) {
          console.log(`\n✓ ID exists as a Success Factor in the success_factors table:`);
          console.log(`- Title: ${factorResult.rows[0].title}`);
          console.log('⚠️ This is a canonical Success Factor but not yet added to this project');
        } else {
          console.log('\n✗ ID not found in success_factors table either');
        }
      }
    }
    
  } catch (error) {
    console.error('Error during diagnostic:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the diagnostic
runDiagnostic();