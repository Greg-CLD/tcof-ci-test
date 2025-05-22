/**
 * Success Factor Task Verification Script
 * 
 * This script:
 * 1. Enumerates all canonical Success Factor tasks
 * 2. Checks if each is present in the specified project
 * 3. Adds any missing tasks
 * 4. Tests toggling each task and verifies persistence
 */
import pg from 'pg';
const { Client } = pg;
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const API_BASE_URL = 'https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';

// Helper for making API requests
async function makeRequest(method, endpoint, body = null) {
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
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return {
    status: response.status,
    body: await response.json()
  };
}

// Main execution function
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');
  
  try {
    // Step 1: Get all canonical Success Factors
    console.log('Fetching all canonical Success Factors...');
    const factorsResult = await client.query(`
      SELECT id, title FROM success_factors
    `);
    
    const factors = factorsResult.rows;
    console.log(`Found ${factors.length} Success Factors`);
    
    // Step 2: Get all Success Factor tasks
    console.log('Fetching all Success Factor tasks...');
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
        sf.title, sft.stage, sft.order
    `);
    
    const canonicalTasks = tasksResult.rows;
    console.log(`Found ${canonicalTasks.length} canonical Success Factor tasks`);
    
    // Step 3: Get all existing tasks for the project
    console.log(`Getting existing tasks for project ${PROJECT_ID}...`);
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
        project_id = $1
    `, [PROJECT_ID]);
    
    const existingTasks = projectTasksResult.rows;
    console.log(`Project has ${existingTasks.length} tasks, of which ${existingTasks.filter(t => t.origin === 'factor').length} are factor tasks`);
    
    // Step 4: Identify and add missing tasks
    console.log('Checking for missing tasks...');
    const missingTasks = [];
    const allFactorTasks = [];
    
    for (const task of canonicalTasks) {
      // Normalize the stage (lowercase)
      const stage = task.stage.toLowerCase();
      
      // Check if this task exists in the project
      const matchingTask = existingTasks.find(t => 
        t.source_id === task.factor_id && 
        t.stage === stage &&
        t.text === task.text
      );
      
      // Create an object to track this task
      const taskInfo = {
        factorTitle: task.factor_title,
        stage,
        source_id: task.factor_id,
        text: task.text,
        dbId: matchingTask ? matchingTask.id : null,
        exists: !!matchingTask,
        toggleTestResult: null,
        persistedAfterRefresh: null
      };
      
      allFactorTasks.push(taskInfo);
      
      // If task doesn't exist, add it to missing tasks
      if (!matchingTask) {
        missingTasks.push(taskInfo);
        console.log(`Missing task: "${task.text}" (${task.factor_title}, ${stage})`);
      }
    }
    
    // Step 5: Insert missing tasks
    if (missingTasks.length > 0) {
      console.log(`Adding ${missingTasks.length} missing tasks to project...`);
      
      for (const task of missingTasks) {
        // Generate a new UUID for the task
        const newTaskId = uuidv4();
        
        // Insert the task
        await client.query(`
          INSERT INTO project_tasks
          (id, project_id, text, stage, origin, source_id, completed, status, created_at, updated_at)
          VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          newTaskId,            // id
          PROJECT_ID,           // project_id
          task.text,            // text
          task.stage,           // stage
          'factor',             // origin
          task.source_id,       // source_id
          false,                // completed
          'pending',            // status
          new Date(),           // created_at
          new Date()            // updated_at
        ]);
        
        // Update our tracking object
        task.dbId = newTaskId;
        task.exists = true;
        
        console.log(`Added task: "${task.text}" with ID ${newTaskId}`);
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
    } else {
      console.log('No missing tasks found!');
    }
    
    // Step 6: Test toggling each Success Factor task
    console.log('\nTesting task toggle functionality for all Success Factor tasks...');
    let allSuccessful = true;
    
    for (const task of allFactorTasks) {
      if (!task.exists || !task.dbId) {
        task.toggleTestResult = 'SKIPPED - Task does not exist';
        task.persistedAfterRefresh = false;
        allSuccessful = false;
        continue;
      }
      
      // Check initial state
      let initialTaskResult = await client.query(`
        SELECT completed FROM project_tasks WHERE id = $1
      `, [task.dbId]);
      
      if (initialTaskResult.rows.length === 0) {
        task.toggleTestResult = 'FAILED - Task not found in database';
        task.persistedAfterRefresh = false;
        allSuccessful = false;
        continue;
      }
      
      const initialState = initialTaskResult.rows[0].completed;
      const newState = !initialState;
      
      console.log(`Testing task "${task.text}" (${task.factorTitle}, ${task.stage})`);
      console.log(`- Current state: completed = ${initialState}`);
      console.log(`- Toggling to: completed = ${newState}`);
      
      // Try toggling via direct ID
      try {
        // First try by dbId
        console.log(`- Testing toggle by dbId (${task.dbId})...`);
        const toggleResponse = await makeRequest(
          'PUT', 
          `/api/projects/${PROJECT_ID}/tasks/${task.dbId}`,
          { completed: newState }
        );
        
        // Check response
        if (toggleResponse.status === 200 && toggleResponse.body.success) {
          console.log(`  ✅ Toggle by dbId successful`);
          
          // Verify in database
          const verifyResult = await client.query(`
            SELECT completed FROM project_tasks WHERE id = $1
          `, [task.dbId]);
          
          if (verifyResult.rows[0].completed === newState) {
            console.log(`  ✅ Database update confirmed`);
            task.toggleTestResult = 'SUCCESS - Toggle by dbId worked';
          } else {
            console.log(`  ❌ Database update failed`);
            task.toggleTestResult = 'FAILED - Toggle succeeded but database not updated';
            allSuccessful = false;
          }
        } else {
          console.log(`  ❌ Toggle by dbId failed: ${toggleResponse.status}`);
          console.log(toggleResponse.body);
          task.toggleTestResult = `FAILED - Toggle by dbId returned ${toggleResponse.status}`;
          allSuccessful = false;
        }
      } catch (error) {
        console.error(`  ❌ Error toggling by dbId: ${error.message}`);
        task.toggleTestResult = `ERROR - ${error.message}`;
        allSuccessful = false;
      }
      
      // Now try toggling by sourceId
      try {
        // Check current state (might have changed in previous test)
        const currentState = (await client.query(`
          SELECT completed FROM project_tasks WHERE id = $1
        `, [task.dbId])).rows[0].completed;
        
        console.log(`- Testing toggle by sourceId (${task.source_id})...`);
        const toggleResponse = await makeRequest(
          'PUT', 
          `/api/projects/${PROJECT_ID}/tasks/${task.source_id}`,
          { completed: !currentState }
        );
        
        // Check response
        if (toggleResponse.status === 200 && toggleResponse.body.success) {
          console.log(`  ✅ Toggle by sourceId successful`);
          
          // Verify in database
          const verifyResult = await client.query(`
            SELECT completed FROM project_tasks WHERE id = $1
          `, [task.dbId]);
          
          if (verifyResult.rows[0].completed !== currentState) {
            console.log(`  ✅ Database update confirmed`);
            task.persistedAfterRefresh = true;
          } else {
            console.log(`  ❌ Database update failed`);
            task.persistedAfterRefresh = false;
            allSuccessful = false;
          }
        } else {
          console.log(`  ❌ Toggle by sourceId failed: ${toggleResponse.status}`);
          console.log(toggleResponse.body);
          task.persistedAfterRefresh = false;
          allSuccessful = false;
        }
      } catch (error) {
        console.error(`  ❌ Error toggling by sourceId: ${error.message}`);
        task.persistedAfterRefresh = false;
        allSuccessful = false;
      }
    }
    
    // Step 7: Summarize results
    console.log('\n====== VERIFICATION RESULTS ======');
    if (allSuccessful) {
      console.log('ALL SUCCESS FACTOR TASKS CAN BE TOGGLED AND CHANGES PERSIST');
    } else {
      console.log('Some tasks failed verification:');
      const failedTasks = allFactorTasks.filter(t => 
        t.toggleTestResult?.startsWith('FAILED') || 
        t.toggleTestResult?.startsWith('ERROR') ||
        t.persistedAfterRefresh === false
      );
      
      for (const task of failedTasks) {
        console.log(`- "${task.text}" (${task.factorTitle}, ${task.stage})`);
        console.log(`  Toggle test: ${task.toggleTestResult}`);
        console.log(`  Persistence: ${task.persistedAfterRefresh ? 'Yes' : 'No'}`);
      }
    }
    
    // Output detailed results as JSON
    console.log('\n====== DETAILED RESULTS ======');
    console.log(JSON.stringify(allFactorTasks, null, 2));
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});