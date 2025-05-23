/**
 * Debug Task Resolution Process
 * 
 * This script simulates the task ID resolution process in detail,
 * showing every step of how tasks are located using different strategies.
 * It will:
 * 1. Load all tasks for a specific project
 * 2. Show detailed IDs and sourceIds
 * 3. Attempt lookup by various methods
 * 4. Log the full resolution process
 * 
 * Run with: node debug-task-resolution.js
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database connection
const dbConfig = {
  connectionString: process.env.DATABASE_URL
};

// Test project
const PROJECT_ID = '7277a5fe-899b-4fe6-8e35-05dd6103d054'; // Bug Test Project

// Create a client
const client = new pg.Client(dbConfig);

// Helper to extract UUID part from compound IDs
function cleanUUID(id) {
  if (!id) return null;
  
  if (id.includes('-')) {
    // Standard UUID pattern has 5 segments
    const segments = id.split('-');
    if (segments.length >= 5) {
      return segments.slice(0, 5).join('-');
    }
  }
  
  return id;
}

async function runDebug() {
  console.log('\n========= TASK RESOLUTION DEBUG ANALYSIS =========\n');
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // STEP 1: Get all tasks for the project
    console.log('STEP 1: Loading all tasks for project...');
    
    const tasksResult = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [PROJECT_ID]
    );
    
    console.log(`\nFound ${tasksResult.rows.length} tasks in project\n`);
    
    // Show all tasks with detailed debugging info
    console.log('DETAILED TASK LIST (PRE-LOOKUP):\n');
    console.log('ID | Origin | SourceID | Text');
    console.log('-'.repeat(80));
    
    tasksResult.rows.forEach(task => {
      console.log(`${task.id} | ${task.origin || 'standard'} | ${task.source_id || 'N/A'} | ${task.text?.substring(0, 25) || 'N/A'}...`);
    });
    
    // STEP 2: Find a Success Factor task to test with
    console.log('\n\nSTEP 2: Finding a Success Factor task for testing...');
    
    const factorTasks = tasksResult.rows.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    let testTask;
    
    if (factorTasks.length > 0) {
      testTask = factorTasks[0];
      console.log(`Found Success Factor task: ${testTask.id}`);
    } else {
      console.log('No Success Factor tasks found, looking for a custom task with sourceId...');
      
      const customSourceTasks = tasksResult.rows.filter(task => 
        task.source_id && task.source_id.length > 0
      );
      
      if (customSourceTasks.length > 0) {
        testTask = customSourceTasks[0];
        console.log(`Found custom task with sourceId: ${testTask.id}`);
      } else {
        console.log('No tasks with sourceId found, using first task...');
        testTask = tasksResult.rows[0];
      }
    }
    
    if (!testTask) {
      throw new Error('Could not find any tasks for testing');
    }
    
    console.log('\nTEST TASK DETAILS:');
    console.log(`ID: ${testTask.id}`);
    console.log(`Text: ${testTask.text}`);
    console.log(`Origin: ${testTask.origin || 'standard'}`);
    console.log(`SourceID: ${testTask.source_id || 'N/A'}`);
    console.log(`Completed: ${testTask.completed}`);
    
    // STEP 3: Simulate TaskIdResolver lookup process
    console.log('\n\nSTEP 3: Simulating the TaskIdResolver lookup process...');
    
    // Prepare different ID formats for testing
    const testCases = [
      {
        name: 'Exact ID match',
        id: testTask.id,
        description: 'Exact match with the task\'s primary ID'
      },
      {
        name: 'Source ID lookup',
        id: testTask.source_id,
        description: 'Using the task\'s sourceId instead of primary ID'
      },
      {
        name: 'Compound ID lookup',
        id: `${testTask.id}-suffix-123`,
        description: 'ID with a suffix that needs to be parsed'
      },
      {
        name: 'Partial ID lookup',
        id: testTask.id.substring(0, 8),
        description: 'First 8 characters of the UUID'
      }
    ].filter(tc => tc.id); // Remove cases where the ID is undefined
    
    // Run each test case
    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.name} ---`);
      console.log(`Description: ${testCase.description}`);
      console.log(`Input ID: ${testCase.id}`);
      
      // Strategy 1: Exact ID match
      console.log('\n1. Strategy: Exact ID match');
      const exactMatchResult = await client.query(
        'SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2',
        [testCase.id, PROJECT_ID]
      );
      
      if (exactMatchResult.rows.length > 0) {
        console.log('✅ SUCCESS: Task found via exact ID match');
        console.log(`Found task ID: ${exactMatchResult.rows[0].id}`);
        continue; // Move to next test case
      } else {
        console.log('❌ FAILED: No exact ID match found');
      }
      
      // Strategy 2: UUID cleaning (compound ID handling)
      console.log('\n2. Strategy: UUID cleaning (for compound IDs)');
      const cleanedId = cleanUUID(testCase.id);
      console.log(`Cleaned ID: ${cleanedId}`);
      
      if (cleanedId !== testCase.id) {
        const cleanedMatchResult = await client.query(
          'SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2',
          [cleanedId, PROJECT_ID]
        );
        
        if (cleanedMatchResult.rows.length > 0) {
          console.log('✅ SUCCESS: Task found via UUID cleaning');
          console.log(`Found task ID: ${cleanedMatchResult.rows[0].id}`);
          continue; // Move to next test case
        } else {
          console.log('❌ FAILED: No match found with cleaned UUID');
        }
      } else {
        console.log('⏩ SKIPPED: ID does not appear to be a compound ID');
      }
      
      // Strategy 3: Source ID lookup
      console.log('\n3. Strategy: Source ID lookup');
      const sourceIdResult = await client.query(
        'SELECT * FROM project_tasks WHERE source_id = $1 AND project_id = $2',
        [testCase.id, PROJECT_ID]
      );
      
      if (sourceIdResult.rows.length > 0) {
        console.log('✅ SUCCESS: Task found via sourceId lookup');
        console.log(`Found task ID: ${sourceIdResult.rows[0].id}`);
        console.log(`Corresponding sourceId: ${sourceIdResult.rows[0].source_id}`);
        continue; // Move to next test case
      } else {
        console.log('❌ FAILED: No match found with sourceId lookup');
      }
      
      // Strategy 4: Partial match
      console.log('\n4. Strategy: Partial ID match');
      
      // This is tricky in SQL without using LIKE, which can be slow
      // In the real implementation, this is done in memory after fetching all tasks
      const partialMatches = tasksResult.rows.filter(task => {
        return task.id.includes(testCase.id) || 
               (task.source_id && task.source_id.includes(testCase.id));
      });
      
      if (partialMatches.length > 0) {
        console.log(`✅ SUCCESS: Found ${partialMatches.length} tasks via partial matching`);
        
        // Prioritize factor tasks in matches
        const factorMatch = partialMatches.find(t => 
          t.origin === 'factor' || t.origin === 'success-factor'
        );
        
        if (factorMatch) {
          console.log('✅ SUCCESS: Found a Success Factor task in partial matches');
          console.log(`Selected task ID: ${factorMatch.id}`);
        } else {
          console.log(`Selected first match: ${partialMatches[0].id}`);
        }
        
        continue; // Move to next test case
      } else {
        console.log('❌ FAILED: No partial matches found');
      }
      
      console.log('\n❌ ALL STRATEGIES FAILED FOR THIS TEST CASE');
    }
    
    // STEP 4: Simulate an actual task update
    console.log('\n\nSTEP 4: Simulating a task update...');
    console.log(`Task ID: ${testTask.id}`);
    console.log(`Current completion state: ${testTask.completed}`);
    
    const newCompletionState = !testTask.completed;
    console.log(`Setting completion to: ${newCompletionState}`);
    
    // Create a new timestamp for the update
    const updatedAt = new Date().toISOString();
    
    await client.query(
      'UPDATE project_tasks SET completed = $1, updated_at = $2 WHERE id = $3 AND project_id = $4 RETURNING *',
      [newCompletionState, updatedAt, testTask.id, PROJECT_ID]
    );
    
    console.log('✅ Update executed successfully');
    
    // Verify the update persisted
    const verifyResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1',
      [testTask.id]
    );
    
    if (verifyResult.rows.length > 0) {
      const updatedTask = verifyResult.rows[0];
      console.log('\nVERIFY AFTER UPDATE:');
      console.log(`Completion state is now: ${updatedTask.completed}`);
      console.log(`Origin preserved: ${updatedTask.origin}`);
      console.log(`SourceID preserved: ${updatedTask.source_id}`);
      
      if (updatedTask.completed === newCompletionState) {
        console.log('✅ UPDATE PERSISTED SUCCESSFULLY');
      } else {
        console.log('❌ UPDATE FAILED - state did not change');
      }
    } else {
      console.log('❌ VERIFY FAILED - could not find the task after update');
    }
    
    // Reset the task to its original state for future tests
    await client.query(
      'UPDATE project_tasks SET completed = $1, updated_at = $2 WHERE id = $3',
      [testTask.completed, testTask.updated_at, testTask.id]
    );
    console.log('\n(Task restored to original state for future tests)');
    
    console.log('\n========= DEBUG SUMMARY =========');
    console.log('The multi-strategy task lookup process provides several fallback mechanisms:');
    console.log('1. Exact ID match - direct lookup by primary key');
    console.log('2. UUID cleaning - extracts the UUID part from compound IDs');
    console.log('3. Source ID lookup - finds tasks by their canonical source ID');
    console.log('4. Partial matching - fuzzy matching for partial/incomplete IDs');
    console.log('\nThis ensures Success Factor tasks can be reliably found and updated,');
    console.log('even when IDs are altered, prefixed, or only partially available.');
    
  } catch (error) {
    console.error('ERROR DURING DEBUG:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the debug analysis
runDebug();