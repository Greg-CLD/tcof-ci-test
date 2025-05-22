/**
 * Comprehensive Task Update Capture Script
 * 
 * This script captures all details for a task update request:
 * 1. Creates a success factor task
 * 2. Makes a PUT request to update it
 * 3. Captures full request/response details
 * 4. Gets tasks after update to show persistence
 */

const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const DOMAIN = '9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev';
const SESSION_COOKIE = 'tcof.sid=s%3AGzFWGtM2karVuxzsRH2nGEjg_yuVt-C1.%2FXHiyUHSC0FiiFyOJiAc4fUO55WsxaMuzanEgZpGHDw';

// Database connection for direct task verification
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper functions
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// API request helper
async function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: DOMAIN,
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': SESSION_COOKIE,
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    console.log(`\n🌐 ${method} ${endpoint}`);
    if (body) {
      console.log(`📦 Request payload: ${JSON.stringify(body, null, 2)}`);
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`📡 Response status: ${res.statusCode}`);
      console.log(`🔖 Response headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : {};
          console.log(`📄 Response body: ${data.length > 1000 ? data.substring(0, 1000) + "..." : data}`);
          resolve({ status: res.statusCode, headers: res.headers, data: responseData });
        } catch (error) {
          console.log(`🔴 Raw response (not JSON): ${data}`);
          console.error(`❌ Error parsing response: ${error.message}`);
          resolve({ status: res.statusCode, headers: res.headers, data: null, rawData: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`🚨 Request error: ${error.message}`);
      reject(error);
    });
    
    if (body) {
      const jsonBody = JSON.stringify(body);
      req.write(jsonBody);
    }
    
    req.end();
  });
}

async function captureTaskUpdate() {
  try {
    console.log('🔍 STARTING SUCCESS FACTOR TASK UPDATE CAPTURE 🔍');
    
    // 1. Get all tasks before update
    console.log('\n===== EVIDENCE 2: GET ALL TASKS (BEFORE) =====');
    const tasksEndpoint = `/api/projects/${PROJECT_ID}/tasks`;
    const beforeResponse = await apiRequest('GET', tasksEndpoint);
    
    // Filter for Success Factor tasks
    const sfTasks = beforeResponse.data.filter(task => 
      task.origin === 'factor' || task.source === 'factor'
    );
    
    console.log(`\n📊 Found ${sfTasks.length} Success Factor tasks out of ${beforeResponse.data.length} total tasks`);
    
    // 2. Select a task to update
    if (sfTasks.length === 0) {
      console.error('❌ No Success Factor tasks found to update');
      return;
    }
    
    const taskToUpdate = sfTasks[0];
    console.log('\n===== TASK SELECTED FOR UPDATE =====');
    console.log(JSON.stringify(taskToUpdate, null, 2));
    
    // 3. Capture task ID mapping information
    console.log('\n===== EVIDENCE 4: TASK MAPPING FOR UI =====');
    const mapping = sfTasks.slice(0, 5).map(task => ({
      id: task.id,
      sourceId: task.sourceId || '<empty>',
      text: task.text.substring(0, 30) + (task.text.length > 30 ? '...' : ''),
      completed: task.completed,
      origin: task.origin || '<empty>',
      source: task.source || '<empty>',
      updateIdUsed: (task.origin === 'factor' && task.sourceId) ? 'sourceId' : 'id'
    }));
    
    console.log(JSON.stringify(mapping, null, 2));
    
    // 4. Update the task (toggle completion)
    console.log('\n===== EVIDENCE 1: PUT REQUEST TO UPDATE TASK =====');
    const updateData = {
      completed: !taskToUpdate.completed,
      status: !taskToUpdate.completed ? 'Done' : 'To Do',
      origin: taskToUpdate.origin || 'factor',
      sourceId: taskToUpdate.sourceId || ''
    };
    
    // Determine which ID to use in the update URL
    const updateId = taskToUpdate.id;
    const updateEndpoint = `/api/projects/${PROJECT_ID}/tasks/${updateId}`;
    
    console.log(`Using task ID "${updateId}" in PUT request URL`);
    const updateResponse = await apiRequest('PUT', updateEndpoint, updateData);
    
    // 5. Get all tasks after update
    console.log('\n===== EVIDENCE 2: GET ALL TASKS (AFTER) =====');
    const afterResponse = await apiRequest('GET', tasksEndpoint);
    
    // 6. Find the updated task to confirm changes
    const updatedTask = afterResponse.data.find(t => t.id === taskToUpdate.id);
    
    if (updatedTask) {
      console.log('\n===== TASK AFTER UPDATE =====');
      console.log(JSON.stringify(updatedTask, null, 2));
      
      console.log('\n✅ UPDATE VERIFICATION:');
      console.log(`Before: completed=${taskToUpdate.completed}`);
      console.log(`After: completed=${updatedTask.completed}`);
      console.log(`Update persisted: ${updatedTask.completed !== taskToUpdate.completed ? 'YES ✓' : 'NO ✗'}`);
    } else {
      console.log('\n❌ TASK NOT FOUND AFTER UPDATE');
    }
    
    // 7. Direct database verification
    console.log('\n===== EVIDENCE 3: DIRECT DATABASE VERIFICATION =====');
    const dbTasks = await query(`
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND id = $2
    `, [PROJECT_ID, taskToUpdate.id]);
    
    if (dbTasks.length > 0) {
      console.log(`Task found in database: ${JSON.stringify(dbTasks[0], null, 2)}`);
    } else {
      console.log(`Task not found in database with ID: ${taskToUpdate.id}`);
      
      // Try looking up by sourceId if available
      if (taskToUpdate.sourceId) {
        const sourceIdTasks = await query(`
          SELECT * FROM project_tasks 
          WHERE project_id = $1 AND source_id = $2
        `, [PROJECT_ID, taskToUpdate.sourceId]);
        
        if (sourceIdTasks.length > 0) {
          console.log(`Task found in database by sourceId: ${JSON.stringify(sourceIdTasks[0], null, 2)}`);
        } else {
          console.log(`Task not found in database by sourceId: ${taskToUpdate.sourceId}`);
        }
      }
    }
    
    console.log('\n🏁 EVIDENCE COLLECTION COMPLETE 🏁');
    
  } catch (error) {
    console.error(`\n❌ ERROR CAPTURING TASK UPDATE: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Close database pool
    await pool.end();
  }
}

// Run the evidence collection
captureTaskUpdate();