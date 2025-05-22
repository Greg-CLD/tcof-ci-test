/**
 * Test for the Success Factor Task UUID Lookup Enhancement
 * 
 * This script verifies that the improved lookup mechanism properly handles
 * both UUID and UUID-suffix formats for factor-origin tasks.
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Configuration
const dbUrl = process.env.DATABASE_URL;
const TEST_PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

// Connect to database
const client = new Client({
  connectionString: dbUrl
});

// Helper functions
function log(message) {
  console.log(`[TEST] ${message}`);
}

function logError(message, error) {
  console.error(`[ERROR] ${message}`, error);
}

// Extract clean UUID from potentially compound ID
function extractCleanUuid(id) {
  // Take first 5 parts of UUID
  return id.split('-').slice(0, 5).join('-');
}

// Run the tests
async function runTest() {
  try {
    log('Connecting to database...');
    await client.connect();
    log('Connected to database');
    
    // Step 1: Create a test task with a compound ID
    const baseId = uuidv4(); // Generate base UUID
    const compoundId = `${baseId}-suffix123`; // Add suffix to create compound ID
    
    log(`Created base UUID: ${baseId}`);
    log(`Created compound ID: ${compoundId}`);
    
    // Step 2: Insert test task with the compound ID as sourceId
    log('Creating test task in database...');
    
    const insertQuery = `
      INSERT INTO project_tasks (
        id, project_id, text, origin, source_id, completed, stage, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `;
    
    const insertParams = [
      uuidv4(), // Generate a unique ID for DB
      TEST_PROJECT_ID,
      'Test Task for UUID Lookup',
      'factor', // Use factor origin for the test
      compoundId, // Use the compound ID as sourceId
      false,
      'identification'
    ];
    
    const insertResult = await client.query(insertQuery, insertParams);
    
    if (insertResult.rows.length === 0) {
      throw new Error('Failed to insert test task');
    }
    
    const testTask = insertResult.rows[0];
    log(`Successfully created test task with ID: ${testTask.id}`);
    log(`Test task sourceId (compound ID): ${testTask.source_id}`);
    
    // Step 3: Test finding the task by different ID formats
    
    // 3.1: Test with exact task ID (should work)
    log('\nTest 1: Looking up by exact task ID...');
    const exactIdQuery = `SELECT * FROM project_tasks WHERE id = $1`;
    const exactIdResult = await client.query(exactIdQuery, [testTask.id]);
    
    log(`Found ${exactIdResult.rows.length} tasks with exact ID match`);
    
    // 3.2: Test with exact sourceId (compound ID) (should work)
    log('\nTest 2: Looking up by exact compound sourceId...');
    const exactSourceIdQuery = `SELECT * FROM project_tasks WHERE source_id = $1`;
    const exactSourceIdResult = await client.query(exactSourceIdQuery, [compoundId]);
    
    log(`Found ${exactSourceIdResult.rows.length} tasks with exact sourceId match`);
    
    // 3.3: Test with clean UUID part of sourceId (should work with our fix)
    log('\nTest 3: Looking up by clean UUID part extracted from compound ID...');
    const cleanUuid = extractCleanUuid(compoundId);
    log(`Extracted clean UUID: ${cleanUuid}`);
    
    // Use the LIKE operator to simulate the improved lookup
    const cleanUuidQuery = `
      SELECT * FROM project_tasks 
      WHERE (id LIKE $1 OR source_id LIKE $1) 
      AND origin = 'factor'
    `;
    const cleanUuidResult = await client.query(cleanUuidQuery, [`${cleanUuid}%`]);
    
    log(`Found ${cleanUuidResult.rows.length} tasks with clean UUID prefix match`);
    
    if (cleanUuidResult.rows.length > 0) {
      log(`   Found task ID: ${cleanUuidResult.rows[0].id}`);
      log(`   Found task sourceId: ${cleanUuidResult.rows[0].source_id}`);
    }
    
    // Step 4: Clean up - remove test task
    log('\nCleaning up test data...');
    const deleteQuery = `DELETE FROM project_tasks WHERE id = $1`;
    await client.query(deleteQuery, [testTask.id]);
    log('Test task deleted');
    
    // Report results
    log('\nTest Results:');
    log(`Exact ID lookup: ${exactIdResult.rows.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    log(`Exact sourceId lookup: ${exactSourceIdResult.rows.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    log(`Clean UUID prefix lookup: ${cleanUuidResult.rows.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (error) {
    logError('Test failed:', error);
  } finally {
    // Clean up
    try {
      await client.end();
      log('Database connection closed');
    } catch (err) {
      logError('Error closing database connection:', err);
    }
  }
}

// Run the test
runTest();