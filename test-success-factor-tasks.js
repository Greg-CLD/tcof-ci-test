/**
 * Integration test for success factor tasks persistence
 * This script tests the POST and GET operations for tasks in the admin success factors API
 */

import fetch from 'node-fetch';

async function testSuccessFactorTaskPersistence() {
  try {
    console.log('Starting success factor task persistence test...');
    
    // Constants for the test
    const FACTOR_ID = 'sf-1'; // We'll test with the first success factor
    const STAGE = 'Identification';
    const TEST_TASK_TEXT = `Test task created at ${new Date().toISOString()}`;
    
    // Step 1: Get the current factor data
    console.log(`Step 1: Fetching current data for factor ${FACTOR_ID}...`);
    const getResponse = await fetch(`http://localhost:5000/api/admin/success-factors/${FACTOR_ID}`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get factor: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const factor = await getResponse.json();
    console.log(`Retrieved factor: ${factor.id} - ${factor.title}`);
    console.log(`Current tasks in ${STAGE}: ${JSON.stringify(factor.tasks[STAGE])}`);
    
    // Count current tasks in this stage
    const initialTaskCount = Array.isArray(factor.tasks[STAGE]) ? factor.tasks[STAGE].length : 0;
    console.log(`Initial task count for ${STAGE}: ${initialTaskCount}`);
    
    // Step 2: Add a new task
    console.log(`Step 2: Adding new test task to ${FACTOR_ID} in ${STAGE} stage...`);
    
    // Prepare updated factor with new task
    const updatedTasks = {
      ...factor.tasks,
      [STAGE]: Array.isArray(factor.tasks[STAGE]) 
        ? [...factor.tasks[STAGE], TEST_TASK_TEXT] 
        : [TEST_TASK_TEXT]
    };
    
    const updatedFactor = {
      ...factor,
      tasks: updatedTasks
    };
    
    // Send the update
    const updateResponse = await fetch(`http://localhost:5000/api/admin/success-factors/${FACTOR_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedFactor)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update factor: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log('Update successful:', updateResult.message || 'No message');
    
    // Step 3: Immediately fetch the factor again to verify persistence
    console.log(`Step 3: Immediately fetching factor ${FACTOR_ID} again to verify persistence...`);
    const verifyResponse = await fetch(`http://localhost:5000/api/admin/success-factors/${FACTOR_ID}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify factor: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifiedFactor = await verifyResponse.json();
    console.log(`Retrieved updated factor: ${verifiedFactor.id} - ${verifiedFactor.title}`);
    console.log(`Updated tasks in ${STAGE}: ${JSON.stringify(verifiedFactor.tasks[STAGE])}`);
    
    // Count tasks after update
    const updatedTaskCount = Array.isArray(verifiedFactor.tasks[STAGE]) ? verifiedFactor.tasks[STAGE].length : 0;
    console.log(`Updated task count for ${STAGE}: ${updatedTaskCount}`);
    
    // Step 4: Verify the test task is present
    const hasTestTask = Array.isArray(verifiedFactor.tasks[STAGE]) && 
                        verifiedFactor.tasks[STAGE].includes(TEST_TASK_TEXT);
    
    if (hasTestTask) {
      console.log(`✅ TEST PASSED: Task "${TEST_TASK_TEXT}" was successfully added and persisted.`);
    } else {
      console.error(`❌ TEST FAILED: Task "${TEST_TASK_TEXT}" was not found in the updated factor.`);
      console.error('Tasks found:', verifiedFactor.tasks[STAGE]);
    }
    
    // Additional verification: task count should have increased by 1
    if (updatedTaskCount === initialTaskCount + 1) {
      console.log(`✅ VERIFICATION PASSED: Task count increased from ${initialTaskCount} to ${updatedTaskCount}.`);
    } else {
      console.error(`❌ VERIFICATION FAILED: Expected task count ${initialTaskCount + 1}, but got ${updatedTaskCount}.`);
    }
    
    console.log('Test complete!');
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Export the test function
export default testSuccessFactorTaskPersistence;

// Run the test immediately if this script is executed directly
if (process.argv[1].includes('test-success-factor-tasks.js')) {
  testSuccessFactorTaskPersistence();
}