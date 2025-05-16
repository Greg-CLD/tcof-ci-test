#!/usr/bin/env node

/**
 * UUID Validation Smoke Test Script
 * 
 * Validates that UUIDs are properly implemented by checking:
 * 1. That we can access database using the debug endpoint
 * 2. That all task IDs are valid UUIDs
 * 
 * Usage: node assert-checklist.mjs
 */

import axios from 'axios';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Configure axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Main smoke test function
async function runSmokeTest() {
  try {
    console.log('Starting UUID migration validation test...');
    
    // Step 1: Directly access the debug endpoint to get all tasks
    let tasksResponse;
    try {
      console.log('Fetching tasks from debug endpoint...');
      tasksResponse = await api.get('/debug/project-tasks');
    } catch (error) {
      console.error('Error fetching tasks from debug endpoint:');
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response:', error.response.data);
      } else {
        console.error(error.message);
      }
      
      console.log('Trying alternative debug endpoint...');
      try {
        tasksResponse = await api.get('/debug/task-stats');
      } catch (innerError) {
        console.error('Error fetching task stats:');
        console.error(innerError.message);
        process.exit(1);
      }
    }
    
    // Extract tasks from the response
    const tasks = tasksResponse.data.tasks || [];
    console.log(`Found ${tasks.length} tasks in the database.`);
    
    if (tasks.length === 0) {
      console.log('No tasks found to validate. Checking database schema instead...');
      
      // If no tasks, check the schema definition
      try {
        const schemaResponse = await api.get('/__debug/schema/tasks');
        const columns = schemaResponse.data.schema || [];
        
        // Find ID column definition
        const idColumn = columns.find(col => col.column_name === 'id');
        if (idColumn) {
          console.log('Task ID column type:', idColumn.data_type);
          if (idColumn.data_type.includes('uuid')) {
            console.log('SUCCESS: Task ID column type is UUID.');
            process.exit(0);
          } else {
            console.error('ERROR: Task ID column type is not UUID:', idColumn.data_type);
            process.exit(1);
          }
        } else {
          console.error('ERROR: Could not find id column in schema');
          process.exit(1);
        }
      } catch (schemaError) {
        console.error('Error checking schema:');
        console.error(schemaError.message);
        process.exit(1);
      }
    }
    
    // Step 2: Validate UUIDs
    const invalidTasks = tasks.filter(task => !UUID_REGEX.test(task.id));
    
    if (invalidTasks.length > 0) {
      console.error(`Error: Found ${invalidTasks.length} tasks with invalid UUIDs`);
      console.error('First invalid task:', invalidTasks[0]);
      process.exit(1);
    }
    
    // Print success result
    const sampleTasks = tasks.slice(0, 3).map(task => ({
      id: task.id,
      text: task.text,
      stage: task.stage
    }));
    
    console.log('Sample task IDs (all valid UUIDs):');
    sampleTasks.forEach(task => {
      console.log(`- ${task.id} (${task.stage}): ${task.text}`);
    });
    
    console.log(`\nAll ${tasks.length} task IDs are valid UUIDs!`);
    console.log("\nSUCCESS: UUID migration is complete and effective.");
    process.exit(0);
  } catch (error) {
    console.error('Smoke test failed with unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runSmokeTest();