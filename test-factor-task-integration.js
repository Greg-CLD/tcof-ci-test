#!/usr/bin/env node

/**
 * Simple integration test for the success factor task persistence
 */

import fetch from 'node-fetch';

async function testFactorTaskPersistence() {
  try {
    console.log('=== SUCCESS FACTOR TASK PERSISTENCE TEST ===');
    
    // 1. Get initial factor data
    const factorId = 'sf-1';
    const stage = 'Identification';
    console.log(`Testing task persistence for factor ${factorId}, stage ${stage}`);
    
    console.log('\n1. Getting initial factor data...');
    const initialResponse = await fetch(`http://localhost:5000/api/admin/success-factors/${factorId}`);
    
    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch factor: ${initialResponse.status} ${initialResponse.statusText}`);
    }
    
    const initialFactor = await initialResponse.json();
    console.log(`Factor title: ${initialFactor.title}`);
    console.log(`Initial ${stage} tasks: ${JSON.stringify(initialFactor.tasks[stage])}`);
    const initialTaskCount = initialFactor.tasks[stage]?.length || 0;
    console.log(`Initial task count: ${initialTaskCount}`);
    
    // 2. Create a new task
    const newTaskText = `Test task created at ${new Date().toISOString()}`;
    console.log(`\n2. Adding new task: "${newTaskText}"...`);
    
    // Clone the factor and add the new task
    const updatedFactor = JSON.parse(JSON.stringify(initialFactor));
    if (!updatedFactor.tasks[stage]) {
      updatedFactor.tasks[stage] = [];
    }
    updatedFactor.tasks[stage].push(newTaskText);
    
    // Send the update
    const updateResponse = await fetch(`http://localhost:5000/api/admin/success-factors/${factorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedFactor)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update factor: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
    }
    
    const updateResult = await updateResponse.json();
    console.log('Update successful:', updateResult.message || 'Successfully saved factor');
    
    // 3. Verify the update by fetching the factor again
    console.log('\n3. Verifying persistence...');
    const verifyResponse = await fetch(`http://localhost:5000/api/admin/success-factors/${factorId}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify factor: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifiedFactor = await verifyResponse.json();
    console.log(`Verified ${stage} tasks: ${JSON.stringify(verifiedFactor.tasks[stage])}`);
    const finalTaskCount = verifiedFactor.tasks[stage]?.length || 0;
    console.log(`Final task count: ${finalTaskCount}`);
    
    // Check if the task was added
    const taskFound = verifiedFactor.tasks[stage]?.includes(newTaskText);
    if (taskFound) {
      console.log(`\n✅ TEST PASSED: New task "${newTaskText}" was successfully persisted.`);
    } else {
      console.log(`\n❌ TEST FAILED: New task "${newTaskText}" was not found in the updated factor.`);
      console.log('Tasks found:', verifiedFactor.tasks[stage]);
    }
    
    // Check if the count increased
    if (finalTaskCount === initialTaskCount + 1) {
      console.log(`✅ COUNT CHECK PASSED: Task count increased from ${initialTaskCount} to ${finalTaskCount}.`);
    } else {
      console.log(`❌ COUNT CHECK FAILED: Expected ${initialTaskCount + 1} tasks, but found ${finalTaskCount}.`);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
  }
}

// Run the test
testFactorTaskPersistence();