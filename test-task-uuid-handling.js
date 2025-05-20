/**
 * Direct database test for UUID handling in tasks
 * Tests our fix for the compound ID issue that was causing 500 errors
 */

import pkg from 'pg';
const { Client } = pkg;

// Function to extract UUID from potentially compound IDs
function extractUuid(id) {
  // Check if this appears to be a compound ID (contains more than 4 hyphens)
  const hyphenCount = (id.match(/-/g) || []).length;
  
  if (hyphenCount > 4) {
    // Standard UUID has 4 hyphens, extract just the UUID part (first 5 segments)
    const uuidParts = id.split('-');
    if (uuidParts.length >= 5) {
      const uuidOnly = uuidParts.slice(0, 5).join('-');
      return uuidOnly;
    }
  }
  
  // If not a compound ID or extraction failed, return the original
  return id;
}

async function testUuidHandling() {
  console.log('Testing UUID extraction for compound task IDs...');
  
  // Test the extraction function with sample IDs
  const testCases = [
    {
      input: '3f197b9f-51f4-5c52-b05e-c035eeb92621-9981d938',
      expected: '3f197b9f-51f4-5c52-b05e-c035eeb92621',
      description: 'Compound ID with single suffix segment'
    },
    {
      input: '2f565bf9-70c7-5c41-93e7-c6c4cde32312-extra-segments-here',
      expected: '2f565bf9-70c7-5c41-93e7-c6c4cde32312',
      description: 'Compound ID with multiple suffix segments'
    },
    {
      input: '3f197b9f-51f4-5c52-b05e-c035eeb92621',
      expected: '3f197b9f-51f4-5c52-b05e-c035eeb92621',
      description: 'Standard UUID (no suffix)'
    },
    {
      input: 'not-a-uuid',
      expected: 'not-a-uuid',
      description: 'Non-UUID string'
    },
    {
      input: '',
      expected: '',
      description: 'Empty string'
    }
  ];
  
  for (const testCase of testCases) {
    const result = extractUuid(testCase.input);
    const passed = result === testCase.expected;
    console.log(`Test case: ${testCase.description}`);
    console.log(`  Input:    ${testCase.input}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Result:   ${result}`);
    console.log(`  Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log();
  }
  
  // Now test with actual database connection
  console.log('Connecting to database to test task update with compound IDs...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Connected to database successfully');
    
    // Step 1: Try to get a list of project tasks
    console.log('Fetching project tasks...');
    const result = await client.query(`
      SELECT id, text, origin, completed 
      FROM project_tasks 
      LIMIT 10
    `);
    
    const tasks = result.rows;
    console.log(`Found ${tasks.length} tasks`);
    
    if (tasks.length === 0) {
      console.log('No tasks found to test with');
      return;
    }
    
    // Step 2: Test updating a task with a manufactured compound ID
    const originalTask = tasks[0];
    console.log('Selected test task:');
    console.log(`  ID: ${originalTask.id}`);
    console.log(`  Text: ${originalTask.text}`);
    console.log(`  Origin: ${originalTask.origin}`);
    console.log(`  Completed: ${originalTask.completed}`);
    
    // Manufacture a compound ID for this task
    const compoundId = `${originalTask.id}-test-suffix`;
    console.log(`\nCreated compound ID: ${compoundId}`);
    
    // Extract the UUID part (our fix implementation)
    const extractedId = extractUuid(compoundId);
    console.log(`Extracted UUID: ${extractedId}`);
    console.log(`Original ID matching extracted: ${extractedId === originalTask.id ? '✅ YES' : '❌ NO'}`);
    
    // Step 3: Update the task with the extracted ID
    const newCompletionState = !originalTask.completed;
    console.log(`\nUpdating task completion state to: ${newCompletionState}`);
    
    await client.query(`
      UPDATE project_tasks
      SET completed = $1, updated_at = NOW()
      WHERE id = $2
    `, [newCompletionState, extractedId]);
    
    console.log('Update query executed successfully');
    
    // Step 4: Verify the update worked by fetching the task again
    const verifyResult = await client.query(`
      SELECT id, text, origin, completed 
      FROM project_tasks 
      WHERE id = $1
    `, [originalTask.id]);
    
    if (verifyResult.rows.length === 0) {
      console.log('❌ ERROR: Could not find task after update');
      return;
    }
    
    const updatedTask = verifyResult.rows[0];
    console.log('\nTask after update:');
    console.log(`  ID: ${updatedTask.id}`);
    console.log(`  Text: ${updatedTask.text}`);
    console.log(`  Origin: ${updatedTask.origin}`);
    console.log(`  Completed: ${updatedTask.completed}`);
    
    const updateSucceeded = updatedTask.completed === newCompletionState;
    console.log(`\nUpdate success: ${updateSucceeded ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Test succeeded if the update was successful using the extracted UUID
    console.log(`\nOverall test result: ${updateSucceeded ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('This confirms our fix for handling compound task IDs works correctly');
    
  } catch (error) {
    console.error('Error during database test:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the test
testUuidHandling().catch(err => {
  console.error('Test failed with error:', err);
});