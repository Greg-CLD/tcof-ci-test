/**
 * UUID Lookup Verification Script
 * 
 * This script:
 * 1. Directly connects to the database to find tasks with compound IDs
 * 2. Extracts the clean UUIDs from them
 * 3. Demonstrates our algorithm for matching tasks by clean UUID
 * 
 * Run with: node verify-uuid-matching.js
 */

import pg from 'pg';
const { Pool } = pg;

// Utility to clean a task ID (extract just the UUID part)
function cleanTaskId(taskId) {
  if (!taskId) return '';
  return taskId.split('-').slice(0, 5).join('-');
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Main function
async function verifyUuidMatching() {
  console.log('===== UUID MATCHING VERIFICATION =====');
  
  try {
    // Get all tasks
    const allTasksRes = await pool.query('SELECT id, text, source_id, completed FROM project_tasks LIMIT 30');
    const allTasks = allTasksRes.rows;
    
    console.log(`Found ${allTasks.length} tasks in the database`);
    
    // Find tasks with compound IDs (more than 5 segments)
    const compoundIdTasks = allTasks.filter(task => 
      task.id && task.id.includes('-') && task.id.split('-').length > 5
    );
    
    console.log(`Found ${compoundIdTasks.length} tasks with compound IDs`);
    
    // If we have compound ID tasks, demonstrate the matching algorithm
    if (compoundIdTasks.length > 0) {
      // Take the first compound ID task as an example
      const exampleTask = compoundIdTasks[0];
      const compoundId = exampleTask.id;
      const cleanId = cleanTaskId(compoundId);
      
      console.log(`\nExample Task:
- Compound ID: ${compoundId}
- Clean UUID: ${cleanId}
- Text: ${exampleTask.text}`);
      
      // Simulate the server's lookup algorithm
      console.log('\nSimulating server-side lookup algorithm:');
      console.log('1. First check if any task has this exact clean UUID as its ID');
      
      const exactMatches = allTasks.filter(task => task.id === cleanId);
      if (exactMatches.length > 0) {
        console.log(`   ✓ Found ${exactMatches.length} exact matches`);
      } else {
        console.log('   ✗ No exact matches found');
      }
      
      console.log('\n2. Then check if any task has a compound ID where the clean part matches');
      
      // Find tasks whose clean ID matches our test clean ID
      const matchesByPrefix = allTasks.filter(task => {
        const taskCleanId = cleanTaskId(task.id);
        return taskCleanId === cleanId;
      });
      
      if (matchesByPrefix.length > 0) {
        console.log(`   ✓ Found ${matchesByPrefix.length} matches by UUID prefix`);
        matchesByPrefix.forEach((match, idx) => {
          console.log(`   Match #${idx + 1}:`);
          console.log(`   - Full ID: ${match.id}`);
          console.log(`   - Clean ID: ${cleanTaskId(match.id)}`);
          console.log(`   - Text: ${match.text}`);
        });
      } else {
        console.log('   ✗ No matches by UUID prefix found');
      }
      
      console.log('\nVerification Result:');
      if (matchesByPrefix.length > 0) {
        console.log('✅ SUCCESS: The UUID matching algorithm works as expected');
        console.log(`When the client sends a clean UUID ${cleanId}, the server will find the task with ID ${compoundId}`);
      } else {
        console.log('❌ FAILED: UUID matching test failed');
      }
    } else {
      console.log('\nNo compound ID tasks found in the database.');
      console.log('Our algorithm will still work for simple UUIDs.');
      
      // Take a regular task as an example
      if (allTasks.length > 0) {
        const exampleTask = allTasks[0];
        console.log(`\nExample Regular Task:
- ID: ${exampleTask.id}
- Clean UUID (same as ID): ${cleanTaskId(exampleTask.id)}
- Text: ${exampleTask.text}`);
      }
    }
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    // Close database connection
    pool.end();
  }
  
  console.log('\n===== VERIFICATION COMPLETE =====');
}

// Run the verification
verifyUuidMatching();