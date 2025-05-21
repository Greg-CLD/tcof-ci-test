/**
 * Comprehensive Task Update Capture Script
 * 
 * This script captures all details for a task update request:
 * 1. Creates a success factor task
 * 2. Makes a PUT request to update it
 * 3. Captures full request/response details
 * 4. Gets tasks after update to show persistence
 */

const fetch = require('node-fetch');
const { Pool } = require('pg');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const TASK_ID_TO_UPDATE = '2f565bf9-70c7-5c41-93e7-c6c4cde32312-success-factor';

// Connect to DB for direct checks
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper for DB queries
async function query(sql, params = []) {
  console.log('\n🔍 Executing SQL:', sql, params);
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// API helpers
async function apiRequest(method, endpoint, body = null) {
  console.log(`\n🌐 Making ${method} request to ${endpoint}`);
  if (body) console.log('📦 Request body:', JSON.stringify(body, null, 2));
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `tcof.sid=${process.env.REPLIT_SESSION_ID}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`http://localhost:5000${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    console.log('⚡ Response status:', response.status);
    console.log('📋 Content-Type:', contentType);
    
    // Log all response headers
    console.log('📋 Response headers:');
    response.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });
    
    // Get raw response text first to examine
    const rawText = await response.text();
    console.log('📃 Raw response body:', rawText);
    
    // Try to parse as JSON if appropriate
    let data = rawText;
    if (contentType && contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawText);
        console.log('📊 Parsed JSON response:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('⚠️ Response claims to be JSON but failed to parse:', e.message);
      }
    }
    
    return {
      status: response.status,
      contentType,
      rawText,
      data,
      headers: Object.fromEntries([...response.headers.entries()])
    };
  } catch (error) {
    console.error('❌ API request error:', error);
    throw error;
  }
}

async function captureTaskUpdate() {
  console.log('🧪 STARTING TASK UPDATE CAPTURE...');
  
  try {
    // 1. First check database directly to see the current task state
    const tasks = await query(`
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND source_id LIKE $2
    `, [PROJECT_ID, TASK_ID_TO_UPDATE.split('-')[0] + '%']);
    
    console.log('\n📊 Current task state in database:', JSON.stringify(tasks, null, 2));
    
    // 2. Make PUT request to update the task
    console.log('\n🔄 Updating task completion status...');
    const updateResult = await apiRequest(
      'PUT',
      `/api/projects/${PROJECT_ID}/tasks/${TASK_ID_TO_UPDATE}`,
      { completed: true }
    );
    
    // 3. Verify task state has been updated with a GET request
    console.log('\n✅ Verifying task state after update...');
    const getResult = await apiRequest(
      'GET',
      `/api/projects/${PROJECT_ID}/tasks`
    );
    
    // 4. Check database again to confirm persistence
    const updatedTasks = await query(`
      SELECT * FROM project_tasks 
      WHERE project_id = $1 AND source_id LIKE $2
    `, [PROJECT_ID, TASK_ID_TO_UPDATE.split('-')[0] + '%']);
    
    console.log('\n📊 Updated task state in database:', JSON.stringify(updatedTasks, null, 2));
    
    // 5. Print summary
    console.log('\n✨ TASK UPDATE CAPTURE COMPLETE ✨');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test
captureTaskUpdate();
