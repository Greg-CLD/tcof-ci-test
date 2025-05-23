/**
 * Root Cause Analysis Script for Success Factor Task Persistence
 * 
 * This script:
 * 1. Creates a new test project
 * 2. Seeds Success Factor tasks
 * 3. Toggles a task
 * 4. Verifies DB state changes
 * 5. Checks for duplicate tasks
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pg;

async function runRootCauseAnalysis() {
  console.log('=== Root Cause Analysis: Success Factor Task Persistence ===\n');
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Step 1: Create a new test project
    console.log('Step 1: Creating a new test project...');
    const projectName = 'RCA Test Project ' + Date.now();
    const projectId = uuidv4();
    const userId = 3; // Using existing user ID
    
    const insertProjectQuery = `
      INSERT INTO projects (id, name, user_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name;
    `;
    
    const projectResult = await client.query(insertProjectQuery, [projectId, projectName, userId]);
    const project = projectResult.rows[0];
    console.log(`✅ Created new project: ${project.name} (${project.id})\n`);
    
    // Step 2: Seed Success Factor tasks
    console.log('Step 2: Seeding Success Factor tasks...');
    
    // Directly insert Success Factor tasks through API call
    const apiUrl = `http://localhost:5000/api/projects/${projectId}/tasks/ensure-success-factors`;
    console.log(`API URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`✅ Success Factor tasks seeded successfully. Tasks created: ${responseData.count || 'unknown'}\n`);
      } else {
        console.error(`❌ Failed to seed Success Factor tasks: ${response.status} ${response.statusText}`);
        console.error(await response.text());
        // If API fails, use direct database insertion
        console.log('Falling back to direct database query to verify tasks...');
      }
    } catch (apiError) {
      console.error(`❌ API error seeding Success Factor tasks: ${apiError.message}`);
      // Continue with verification using database queries
    }
    
    // Verify seeded tasks
    const taskQuery = `
      SELECT COUNT(*) FROM project_tasks WHERE project_id = $1;
    `;
    const taskResult = await client.query(taskQuery, [projectId]);
    console.log(`Total tasks in project: ${taskResult.rows[0].count}\n`);
    
    if (parseInt(taskResult.rows[0].count) === 0) {
      console.error('❌ No tasks were created for the project. Aborting analysis.');
      return;
    }
    
    // Get one Success Factor task to toggle
    const getTaskQuery = `
      SELECT id, text, completed, origin, source_id, stage
      FROM project_tasks 
      WHERE project_id = $1 AND (origin = 'factor' OR origin = 'success-factor')
      LIMIT 1;
    `;
    
    const taskToToggleResult = await client.query(getTaskQuery, [projectId]);
    
    if (taskToToggleResult.rows.length === 0) {
      console.error('❌ No Success Factor tasks found in the project. Aborting analysis.');
      return;
    }
    
    const taskToToggle = taskToToggleResult.rows[0];
    console.log('Selected task for toggle test:');
    console.log(`- ID: ${taskToToggle.id}`);
    console.log(`- Text: ${taskToToggle.text}`);
    console.log(`- Completed: ${taskToToggle.completed}`);
    console.log(`- Origin: ${taskToToggle.origin}`);
    console.log(`- Source ID: ${taskToToggle.source_id}`);
    console.log(`- Stage: ${taskToToggle.stage}\n`);
    
    // Step 3: Toggle a Success Factor task
    console.log('Step 3: Toggling Success Factor task...');
    const newCompletionState = !taskToToggle.completed;
    console.log(`Toggling task ${taskToToggle.id} from ${taskToToggle.completed} to ${newCompletionState}`);
    
    try {
      const toggleUrl = `http://localhost:5000/api/projects/${projectId}/tasks/${taskToToggle.id}`;
      console.log(`PUT ${toggleUrl}`);
      
      const toggleResponse = await fetch(toggleUrl, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ completed: newCompletionState })
      });
      
      console.log(`Response status: ${toggleResponse.status} ${toggleResponse.statusText}`);
      
      if (toggleResponse.ok) {
        const toggleData = await toggleResponse.json();
        console.log('Toggle response:');
        console.log(JSON.stringify(toggleData, null, 2));
        console.log(`✅ Task toggle API call successful\n`);
      } else {
        console.error(`❌ Failed to toggle task: ${toggleResponse.status} ${toggleResponse.statusText}`);
        console.error(await toggleResponse.text());
      }
    } catch (toggleError) {
      console.error(`❌ Error toggling task: ${toggleError.message}`);
    }
    
    // Step 4: Verify DB state with direct SQL
    console.log('Step 4: Verifying task state in database...');
    const verifyQuery = `
      SELECT id, text, completed, origin, source_id, updated_at
      FROM project_tasks
      WHERE id = $1;
    `;
    
    const verifyResult = await client.query(verifyQuery, [taskToToggle.id]);
    
    if (verifyResult.rows.length === 0) {
      console.error(`❌ Task ${taskToToggle.id} not found in database after toggle!`);
    } else {
      const dbTask = verifyResult.rows[0];
      console.log('Database state after toggle:');
      console.log(`- ID: ${dbTask.id}`);
      console.log(`- Completed: ${dbTask.completed}`);
      console.log(`- Updated At: ${dbTask.updated_at}`);
      
      if (dbTask.completed === newCompletionState) {
        console.log(`✅ Task completion state updated successfully in database\n`);
      } else {
        console.error(`❌ Task completion state NOT updated in database. Expected: ${newCompletionState}, Got: ${dbTask.completed}\n`);
      }
    }
    
    // Step 5: Check for duplicate tasks
    console.log('Step 5: Checking for duplicate tasks...');
    const duplicateQuery = `
      SELECT source_id, stage, COUNT(*) as count
      FROM project_tasks
      WHERE project_id = $1 AND source_id IS NOT NULL
      GROUP BY source_id, stage
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `;
    
    const duplicateResult = await client.query(duplicateQuery, [projectId]);
    console.log(`SQL Query: ${duplicateQuery.replace(/\s+/g, ' ').trim()}`);
    console.log(`SQL Parameters: [${projectId}]`);
    
    if (duplicateResult.rows.length === 0) {
      console.log('✅ No duplicate tasks found\n');
    } else {
      console.error(`❌ Found ${duplicateResult.rows.length} sets of duplicate tasks:`);
      duplicateResult.rows.forEach((row, i) => {
        console.log(`${i+1}. source_id=${row.source_id}, stage=${row.stage}, count=${row.count}`);
      });
      console.log('');
      
      // Get details of duplicates for the first case
      if (duplicateResult.rows.length > 0) {
        const firstDuplicate = duplicateResult.rows[0];
        console.log(`Detailed view of duplicate set for source_id=${firstDuplicate.source_id}, stage=${firstDuplicate.stage}:`);
        
        const duplicateDetailsQuery = `
          SELECT id, text, completed, origin, source_id, stage, created_at, updated_at
          FROM project_tasks
          WHERE project_id = $1 AND source_id = $2 AND stage = $3
          ORDER BY created_at;
        `;
        
        const duplicateDetails = await client.query(duplicateDetailsQuery, [
          projectId, firstDuplicate.source_id, firstDuplicate.stage
        ]);
        
        duplicateDetails.rows.forEach((task, i) => {
          console.log(`Duplicate ${i+1}:`);
          console.log(`- ID: ${task.id}`);
          console.log(`- Text: ${task.text}`);
          console.log(`- Completed: ${task.completed}`);
          console.log(`- Created At: ${task.created_at}`);
          console.log(`- Updated At: ${task.updated_at}`);
          console.log('');
        });
      }
    }
    
    console.log('Root Cause Analysis Complete!');
    
  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await client.end();
  }
}

runRootCauseAnalysis();