/**
 * 3-GATE SUCCESS FACTOR VERIFICATION
 * 
 * This script implements the 3-gate verification process for Success Factor tasks:
 * 1. DATABASE INTEGRITY - Ensure all canonical Success Factors exist in project_tasks
 * 2. API SMOKE TEST - Verify both ID and sourceId toggle endpoints return 200
 * 3. PERSISTENCE VERIFICATION - Ensure state changes persist after refresh
 */
import pg from 'pg';
const { Client } = pg;
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_BASE_URL = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

// Helper for making API requests
async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-auth-override': 'true'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return {
      status: response.status,
      body: await response.json()
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: error.message }
    };
  }
}

// Main execution function
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    //==========================================================================
    // GATE 1: DATABASE INTEGRITY SCAN
    //==========================================================================
    console.log('\n========== GATE 1: DATABASE INTEGRITY SCAN ==========');
    
    // Get all canonical Success Factors
    const factorsResult = await client.query(`
      SELECT id AS factor_id, title AS factor_title
      FROM success_factors
      ORDER BY title
    `);
    
    const factors = factorsResult.rows;
    console.log(`Found ${factors.length} canonical Success Factors`);
    
    // Get all Success Factor tasks
    const tasksResult = await client.query(`
      SELECT 
        sf.id AS factor_id, 
        sf.title AS factor_title,
        sft.stage, 
        sft.text
      FROM 
        success_factors sf
      JOIN 
        success_factor_tasks sft ON sf.id = sft.factor_id
      ORDER BY 
        sf.title, sft.stage
    `);
    
    const canonicalTasks = tasksResult.rows;
    console.log(`Found ${canonicalTasks.length} canonical Success Factor tasks`);
    
    // Get all existing factor tasks for the project
    const projectTasksResult = await client.query(`
      SELECT 
        id, 
        project_id, 
        text, 
        stage, 
        origin, 
        source_id, 
        completed
      FROM 
        project_tasks
      WHERE 
        project_id = $1 AND
        origin = 'factor'
    `, [PROJECT_ID]);
    
    const existingTasks = projectTasksResult.rows;
    console.log(`Project has ${existingTasks.length} factor tasks`);
    
    // Check for missing tasks and build a report
    const missingTasks = [];
    const insertedTasks = [];
    
    for (const task of canonicalTasks) {
      // Normalize the stage (lowercase) for comparison
      const normalizedStage = task.stage.toLowerCase();
      
      // Check if this task exists in the project
      const matchingTask = existingTasks.find(t => 
        t.source_id === task.factor_id && 
        t.stage.toLowerCase() === normalizedStage &&
        t.text === task.text
      );
      
      // If task doesn't exist, add it to missing tasks
      if (!matchingTask) {
        missingTasks.push({
          factorId: task.factor_id,
          factorTitle: task.factor_title,
          stage: normalizedStage,
          text: task.text
        });
      }
    }
    
    // Insert missing tasks
    if (missingTasks.length > 0) {
      console.log(`\nAdding ${missingTasks.length} missing tasks to project...`);
      
      for (const task of missingTasks) {
        // Generate a new UUID for the task
        const newTaskId = uuidv4();
        
        // Insert the task
        await client.query(`
          INSERT INTO project_tasks
          (id, project_id, text, stage, origin, source_id, completed, status, created_at, updated_at)
          VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          newTaskId,              // id
          PROJECT_ID,             // project_id
          task.text,              // text
          task.stage,             // stage
          'factor',               // origin
          task.factorId,          // source_id
          false,                  // completed
          'pending',              // status
          new Date(),             // created_at
          new Date()              // updated_at
        ]);
        
        insertedTasks.push({
          id: newTaskId,
          factorId: task.factorId,
          factorTitle: task.factorTitle,
          stage: task.stage,
          text: task.text
        });
        
        console.log(`- Added task: "${task.text}" (${task.factorTitle}, ${task.stage})`);
      }
      
      // Re-fetch tasks to confirm additions
      const updatedTasksResult = await client.query(`
        SELECT 
          id, 
          project_id, 
          text, 
          stage, 
          origin, 
          source_id, 
          completed
        FROM 
          project_tasks
        WHERE 
          project_id = $1 AND
          origin = 'factor'
      `, [PROJECT_ID]);
      
      console.log(`Project now has ${updatedTasksResult.rows.length} factor tasks`);
      
      // Check if there are still missing tasks
      const stillMissing = [];
      for (const task of canonicalTasks) {
        const normalizedStage = task.stage.toLowerCase();
        
        const matchingTask = updatedTasksResult.rows.find(t => 
          t.source_id === task.factor_id && 
          t.stage.toLowerCase() === normalizedStage &&
          t.text === task.text
        );
        
        if (!matchingTask) {
          stillMissing.push({
            factorId: task.factor_id,
            factorTitle: task.factor_title,
            stage: normalizedStage,
            text: task.text
          });
        }
      }
      
      // Gate 1 report
      const gate1Summary = {
        totalCanonical: canonicalTasks.length,
        totalInProject: updatedTasksResult.rows.length,
        inserted: insertedTasks,
        stillMissing: stillMissing
      };
      
      console.log('\nGATE 1 SUMMARY:');
      console.log(JSON.stringify(gate1Summary, null, 2));
      
      // Fail if there are still missing tasks
      if (stillMissing.length > 0) {
        console.error('\n❌ GATE 1 FAILED: Some tasks are still missing from the project');
        return;
      }
      
      console.log('\n✅ GATE 1 PASSED: All canonical Success Factor tasks are in the project');
    } else {
      console.log('\n✅ GATE 1 PASSED: All canonical Success Factor tasks already exist in the project');
      
      // Gate 1 report
      const gate1Summary = {
        totalCanonical: canonicalTasks.length,
        totalInProject: existingTasks.length,
        inserted: [],
        stillMissing: []
      };
      
      console.log('\nGATE 1 SUMMARY:');
      console.log(JSON.stringify(gate1Summary, null, 2));
    }
    
    //==========================================================================
    // GATE 2: API SMOKE MATRIX
    //==========================================================================
    console.log('\n========== GATE 2: API SMOKE MATRIX ==========');
    
    // Get all factor tasks for the project
    const allProjectTasksResult = await client.query(`
      SELECT 
        id, 
        project_id, 
        text, 
        stage, 
        origin, 
        source_id, 
        completed
      FROM 
        project_tasks
      WHERE 
        project_id = $1 AND
        origin = 'factor'
      ORDER BY
        source_id, stage
    `, [PROJECT_ID]);
    
    const allProjectTasks = allProjectTasksResult.rows;
    console.log(`Testing ${allProjectTasks.length} Success Factor tasks`);
    
    // Test matrix for all tasks
    const smokeMatrix = [];
    let gate2Failed = false;
    
    for (let i = 0; i < allProjectTasks.length; i++) {
      const task = allProjectTasks[i];
      
      console.log(`\n[${i+1}/${allProjectTasks.length}] Testing task: "${task.text}"`);
      console.log(`- ID: ${task.id}`);
      console.log(`- Source ID: ${task.source_id}`);
      console.log(`- Current completed state: ${task.completed}`);
      
      // Result object for this task
      const taskResult = {
        id: task.id,
        source_id: task.source_id,
        text: task.text,
        stage: task.stage,
        putById: null,
        putBySource: null
      };
      
      // Test toggle by ID
      console.log('\na) Testing PUT by ID...');
      const toggleByIdResponse = await apiRequest(
        'PUT', 
        `/api/projects/${PROJECT_ID}/tasks/${task.id}`,
        { completed: !task.completed }
      );
      
      taskResult.putById = toggleByIdResponse.status;
      console.log(`- Status: ${toggleByIdResponse.status}`);
      
      if (toggleByIdResponse.status !== 200) {
        console.error(`❌ PUT by ID failed with status ${toggleByIdResponse.status}`);
        gate2Failed = true;
      } else {
        console.log('✅ PUT by ID succeeded');
      }
      
      // Test toggle by source_id
      console.log('\nb) Testing PUT by Source ID...');
      const toggleBySourceResponse = await apiRequest(
        'PUT', 
        `/api/projects/${PROJECT_ID}/tasks/${task.source_id}`,
        { completed: task.completed } // Toggle back to original state
      );
      
      taskResult.putBySource = toggleBySourceResponse.status;
      console.log(`- Status: ${toggleBySourceResponse.status}`);
      
      if (toggleBySourceResponse.status !== 200) {
        console.error(`❌ PUT by Source ID failed with status ${toggleBySourceResponse.status}`);
        gate2Failed = true;
      } else {
        console.log('✅ PUT by Source ID succeeded');
      }
      
      smokeMatrix.push(taskResult);
    }
    
    // Gate 2 report
    console.log('\nGATE 2 SUMMARY:');
    console.log(JSON.stringify(smokeMatrix, null, 2));
    
    if (gate2Failed) {
      console.error('\n❌ GATE 2 FAILED: Some API requests did not return 200');
      return;
    }
    
    console.log('\n✅ GATE 2 PASSED: All API requests returned 200');
    
    //==========================================================================
    // GATE 3: PERSISTENCE VERIFICATION
    //==========================================================================
    console.log('\n========== GATE 3: PERSISTENCE VERIFICATION ==========');
    
    // Get all tasks via API
    console.log('Getting all tasks via API...');
    const getTasksResponse = await apiRequest('GET', `/api/projects/${PROJECT_ID}/tasks`);
    
    if (getTasksResponse.status !== 200) {
      console.error(`❌ GET tasks failed with status ${getTasksResponse.status}`);
      console.log('\n❌ GATE 3 FAILED: Could not verify persistence');
      return;
    }
    
    const apiTasks = getTasksResponse.body;
    const factorApiTasks = apiTasks.filter(task => task.origin === 'factor');
    console.log(`Retrieved ${factorApiTasks.length} factor tasks from API`);
    
    // Get the expected state from database
    const dbTasksResult = await client.query(`
      SELECT 
        id, 
        source_id, 
        text,
        completed
      FROM 
        project_tasks
      WHERE 
        project_id = $1 AND
        origin = 'factor'
    `, [PROJECT_ID]);
    
    const dbTasks = dbTasksResult.rows;
    
    // Verification matrix
    const persistenceMatrix = [];
    let gate3Failed = false;
    
    for (const dbTask of dbTasks) {
      const apiTask = factorApiTasks.find(
        t => t.id === dbTask.id || t.sourceId === dbTask.source_id
      );
      
      if (!apiTask) {
        console.error(`❌ Task not found in API response: ${dbTask.id} / ${dbTask.source_id}`);
        gate3Failed = true;
        persistenceMatrix.push({
          id: dbTask.id,
          source_id: dbTask.source_id,
          text: dbTask.text,
          completedDB: dbTask.completed,
          completedAPI: null,
          match: false
        });
        continue;
      }
      
      const match = apiTask.completed === dbTask.completed;
      
      persistenceMatrix.push({
        id: dbTask.id,
        source_id: dbTask.source_id,
        text: dbTask.text,
        completedDB: dbTask.completed,
        completedAPI: apiTask.completed,
        match
      });
      
      if (!match) {
        console.error(`❌ Persistence mismatch for task: ${dbTask.text}`);
        console.error(`   DB: ${dbTask.completed}, API: ${apiTask.completed}`);
        gate3Failed = true;
      }
    }
    
    // Gate 3 report
    console.log('\nGATE 3 SUMMARY:');
    console.log(JSON.stringify(persistenceMatrix, null, 2));
    
    if (gate3Failed) {
      console.error('\n❌ GATE 3 FAILED: Some tasks failed persistence verification');
      return;
    }
    
    console.log('\n✅ GATE 3 PASSED: All tasks persist their state correctly');
    
    //==========================================================================
    // FINAL RESULT
    //==========================================================================
    console.log('\n\n===========================================================');
    console.log('ALL SUCCESS FACTOR TASKS PASS 3-GATE TEST ✅');
    console.log('===========================================================');
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});