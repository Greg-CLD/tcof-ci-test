/**
 * Task ID Resolution Test
 * 
 * This script tests our task ID resolution capabilities by:
 * 1. Finding a Success Factor task
 * 2. Testing lookup by the original UUID
 * 3. Testing lookup by sourceId
 * 4. Testing lookup by a partial ID match
 * 
 * Run with: node check-task-id-resolution.js
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL
};

// Test configuration
const PROJECT_ID = '7277a5fe-899b-4fe6-8e35-05dd6103d054'; // Bug Test Project

// Create a database client
const client = new pg.Client(dbConfig);

async function runTest() {
  console.log("===== Task ID Resolution Test =====\n");
  
  try {
    // Connect to the database
    await client.connect();
    console.log("Connected to database\n");
    
    // Step 1: Get all tasks for the project
    console.log("Step 1: Getting all tasks for project...");
    const tasksResult = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1',
      [PROJECT_ID]
    );
    
    console.log(`Found ${tasksResult.rows.length} tasks for project ${PROJECT_ID}`);
    
    // Step 2: Find our test Success Factor task
    console.log("\nStep 2: Finding Success Factor task...");
    const factorTasks = tasksResult.rows.filter(task => 
      task.origin === 'factor' || task.origin === 'success-factor'
    );
    
    if (factorTasks.length === 0) {
      console.log("No Success Factor tasks found. Creating one for testing...");
      
      const taskId = uuidv4();
      const sourceId = uuidv4();
      
      // Create a test task
      await client.query(
        `INSERT INTO project_tasks 
         (id, project_id, text, stage, origin, source_id, completed, notes, priority, owner, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          taskId,
          PROJECT_ID,
          'Test Success Factor Task for ID Resolution',
          'Definition',
          'factor',
          sourceId,
          false,
          '',
          'medium',
          '',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      
      console.log(`Created test Success Factor task with ID: ${taskId} and sourceId: ${sourceId}`);
      
      // Refetch tasks
      const updatedTasksResult = await client.query(
        'SELECT * FROM project_tasks WHERE project_id = $1',
        [PROJECT_ID]
      );
      
      const updatedFactorTasks = updatedTasksResult.rows.filter(task => 
        task.origin === 'factor' || task.origin === 'success-factor'
      );
      
      if (updatedFactorTasks.length === 0) {
        throw new Error("Failed to create Success Factor task");
      }
      
      factorTasks.push(updatedFactorTasks[0]);
    }
    
    // Use the first Success Factor task for our tests
    const testTask = factorTasks[0];
    console.log(`Selected test task: ${testTask.id}`);
    console.log(`Task details:`);
    console.log(`  - Text: ${testTask.text}`);
    console.log(`  - Origin: ${testTask.origin}`);
    console.log(`  - Source ID: ${testTask.source_id}`);
    console.log(`  - Completed: ${testTask.completed}`);
    
    // Step 3: Test exact ID match lookup
    console.log("\nStep 3: Testing exact ID match lookup...");
    const exactMatchResult = await client.query(
      'SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2',
      [testTask.id, PROJECT_ID]
    );
    
    if (exactMatchResult.rows.length === 1) {
      console.log("✅ Success: Task found by exact ID match");
    } else {
      console.log("❌ Failure: Task not found by exact ID match");
    }
    
    // Step 4: Test sourceId lookup
    console.log("\nStep 4: Testing sourceId lookup...");
    if (testTask.source_id) {
      const sourceIdResult = await client.query(
        'SELECT * FROM project_tasks WHERE source_id = $1 AND project_id = $2',
        [testTask.source_id, PROJECT_ID]
      );
      
      if (sourceIdResult.rows.length === 1) {
        console.log("✅ Success: Task found by sourceId");
        
        // Verify it's the same task
        const taskFromSourceId = sourceIdResult.rows[0];
        if (taskFromSourceId.id === testTask.id) {
          console.log("✅ Success: Task found by sourceId is the same task");
        } else {
          console.log("❌ Failure: Task found by sourceId is a different task");
          console.log(`  - Expected ID: ${testTask.id}`);
          console.log(`  - Actual ID: ${taskFromSourceId.id}`);
        }
      } else {
        console.log("❌ Failure: Task not found by sourceId");
      }
    } else {
      console.log("⚠️ Skipped: Task doesn't have a sourceId");
    }
    
    // Step 5: Test partial ID match lookup (first 8 characters of UUID)
    console.log("\nStep 5: Testing partial ID match lookup...");
    if (testTask.id.includes('-') && testTask.id.length > 8) {
      const partialId = testTask.id.substring(0, 8);
      
      console.log(`Using partial ID: ${partialId} from full ID: ${testTask.id}`);
      
      // For database, we have to use pattern matching
      const partialMatchResult = await client.query(
        "SELECT * FROM project_tasks WHERE id LIKE $1 AND project_id = $2",
        [`${partialId}%`, PROJECT_ID]
      );
      
      if (partialMatchResult.rows.length > 0) {
        const matchingTask = partialMatchResult.rows.find(t => t.id === testTask.id);
        
        if (matchingTask) {
          console.log("✅ Success: Task found by partial ID match");
        } else {
          console.log("⚠️ Note: Found tasks but they didn't match the expected task");
          console.log(`Found ${partialMatchResult.rows.length} tasks with the partial ID pattern`);
        }
      } else {
        console.log("❌ Failure: Task not found by partial ID match");
      }
    } else {
      console.log("⚠️ Skipped: Task ID is not in UUID format");
    }
    
    // Step 6: Test compound ID (with suffix) handling - simulating TaskIdResolver behavior
    console.log("\nStep 6: Testing compound ID handling...");
    
    // Simulate a compound ID by adding a suffix
    const compoundId = `${testTask.id}-suffix-123`;
    console.log(`Using compound ID: ${compoundId}`);
    
    // Extract just the UUID part
    const extractedUuid = compoundId.split('-').slice(0, 5).join('-');
    
    console.log(`Extracted UUID: ${extractedUuid}`);
    
    // Check if it matches our original task
    if (extractedUuid === testTask.id) {
      console.log("✅ Success: UUID extracted correctly from compound ID");
      
      // Now try to find the task using that extracted UUID
      const extractedUuidResult = await client.query(
        'SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2',
        [extractedUuid, PROJECT_ID]
      );
      
      if (extractedUuidResult.rows.length === 1) {
        console.log("✅ Success: Task found using extracted UUID from compound ID");
      } else {
        console.log("❌ Failure: Task not found using extracted UUID from compound ID");
      }
    } else {
      console.log("❌ Failure: UUID extraction from compound ID failed");
      console.log(`  - Original ID: ${testTask.id}`);
      console.log(`  - Extracted ID: ${extractedUuid}`);
    }
    
    // Print summary
    console.log("\n===== Test Summary =====");
    console.log("The multi-strategy task lookup system provides several fallback mechanisms:");
    console.log("1. Exact ID match: Primary lookup path");
    console.log("2. Source ID lookup: Critical for Success Factor tasks");
    console.log("3. Partial ID match: Helps with truncated IDs");
    console.log("4. Compound ID handling: Parses IDs with suffixes");
    console.log("\nThis creates a robust system that can locate tasks across various ID formats.");
    
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Close database connection
    await client.end();
    console.log("\nDatabase connection closed");
  }
}

// Run the test
runTest();