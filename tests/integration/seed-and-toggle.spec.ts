/**
 * Integration tests to expose regressions in Success Factor task seeding and toggling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';
import pg from 'pg';

// Configuration
const API_BASE = 'http://localhost:5000';
const DB_URL = process.env.DATABASE_URL;

// Helper functions
async function apiRequest(method: string, endpoint: string, body: any = null, cookie: string = null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  
  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  let responseData = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  }
  
  return {
    status: response.status,
    headers: response.headers,
    data: responseData
  };
}

async function query(sql: string, params: any[] = []) {
  const client = new pg.Client(DB_URL);
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

describe('Success Factor Task Seeding and Toggling', () => {
  let projectId: string;
  let authCookie: string;
  
  beforeAll(async () => {
    // Login to get auth cookie
    const loginResponse = await apiRequest('POST', '/api/auth/login', {
      username: 'greg@confluity.co.uk',
      password: 'Password123!'
    });
    
    expect(loginResponse.status).toBe(200);
    authCookie = loginResponse.headers.get('set-cookie');
    
    // Create a new test project
    const createResponse = await apiRequest('POST', '/api/projects', {
      name: `Test Project ${Date.now()}`,
      organisationId: '867fe8f2-ae5f-451c-872a-0d1582b47c6d'
    }, authCookie);
    
    expect(createResponse.status).toBe(201);
    projectId = createResponse.data.id;
    console.log(`Created test project: ${projectId}`);
  });
  
  it('seeds unique Success-Factor tasks', async () => {
    // Call GET /tasks?ensure=true to trigger Success Factor seeding
    const response = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks?ensure=true`,
      null,
      authCookie
    );
    
    expect(response.status).toBe(200);
    
    // Check for task ID uniqueness
    const tasks = response.data;
    const taskIds = tasks.map((task: any) => task.id);
    const uniqueTaskIds = new Set(taskIds);
    
    console.log(`Found ${tasks.length} tasks, ${uniqueTaskIds.size} unique IDs`);
    console.log(`Success Factor tasks: ${tasks.filter((t: any) => t.origin === 'factor').length}`);
    
    // EXPECTED FAILURE: Should have duplicate tasks - test passes if uniqueTaskIds.size < taskIds.length
    if (uniqueTaskIds.size < taskIds.length) {
      // Find duplicate IDs
      const idCounts: Record<string, number> = {};
      taskIds.forEach((id: string) => {
        idCounts[id] = (idCounts[id] || 0) + 1;
      });
      
      const duplicates = Object.entries(idCounts)
        .filter(([_, count]) => count > 1)
        .map(([id, count]) => ({
          id,
          count,
          tasks: tasks.filter((t: any) => t.id === id)
        }));
      
      console.log(`Found ${duplicates.length} duplicate task IDs:`);
      duplicates.forEach(({ id, count, tasks }) => {
        console.log(`ID ${id} appears ${count} times:`);
        tasks.forEach((task: any) => {
          console.log(`- ${task.text} (origin: ${task.origin}, sourceId: ${task.sourceId})`);
        });
      });
    }
    
    // We expect this test to fail because there should be duplicates
    expect(uniqueTaskIds.size).toBe(taskIds.length); 
    
    // We specifically expect exactly 32 canonical Success Factor tasks
    const factorTasks = tasks.filter((t: any) => t.origin === 'factor');
    expect(factorTasks.length).toBe(32);
    
    // Query the database directly to check for duplicates
    const dbTasks = await query(
      "SELECT id, text, origin, source_id FROM project_tasks WHERE project_id = $1 AND origin = 'factor'",
      [projectId]
    );
    
    console.log(`Found ${dbTasks.length} factor tasks in the database`);
  });
  
  it('can toggle a Success-Factor task and persist', async () => {
    // Get all tasks
    const tasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks`,
      null,
      authCookie
    );
    
    expect(tasksResponse.status).toBe(200);
    
    // Find a Success Factor task
    const factorTask = tasksResponse.data.find((task: any) => task.origin === 'factor');
    expect(factorTask).toBeDefined();
    
    console.log(`Selected factor task: ${factorTask.id}, initial state: completed=${factorTask.completed}`);
    
    // Toggle the task state
    const toggleResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${factorTask.id}`,
      {
        completed: !factorTask.completed,
        status: !factorTask.completed ? 'Done' : 'To Do'
      },
      authCookie
    );
    
    console.log(`Toggle response status: ${toggleResponse.status}`);
    
    // EXPECTED FAILURE: Should be 400 Bad Request
    // SUCCESS = test fails because the server returns 400
    expect(toggleResponse.status).toBe(200);
    
    if (toggleResponse.status !== 200) {
      console.log('Error response:', toggleResponse.data);
    }
    
    // Verify the task state change was persisted
    const updatedTasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks`,
      null,
      authCookie
    );
    
    expect(updatedTasksResponse.status).toBe(200);
    
    const updatedTask = updatedTasksResponse.data.find((task: any) => task.id === factorTask.id);
    expect(updatedTask).toBeDefined();
    
    // EXPECTED FAILURE: If toggle worked, state should have changed
    // SUCCESS = test fails because state didn't change
    expect(updatedTask.completed).toBe(!factorTask.completed);
  });
  
  it('can toggle a non-factor task and persist', async () => {
    // Create a custom task
    const customTask = {
      text: `Test Custom Task ${Date.now()}`,
      stage: 'identification', 
      origin: 'custom',
      completed: false,
      status: 'To Do'
    };
    
    const createResponse = await apiRequest(
      'POST',
      `/api/projects/${projectId}/tasks`,
      customTask,
      authCookie
    );
    
    expect(createResponse.status).toBe(201);
    const createdTask = createResponse.data;
    console.log(`Created custom task: ${createdTask.id}`);
    
    // Toggle the custom task
    const toggleResponse = await apiRequest(
      'PUT',
      `/api/projects/${projectId}/tasks/${createdTask.id}`,
      {
        completed: true,
        status: 'Done'
      },
      authCookie
    );
    
    console.log(`Custom task toggle response status: ${toggleResponse.status}`);
    
    // This SHOULD work (control test)
    expect(toggleResponse.status).toBe(200);
    
    // Verify the task state change was persisted
    const updatedTasksResponse = await apiRequest(
      'GET',
      `/api/projects/${projectId}/tasks`,
      null,
      authCookie
    );
    
    expect(updatedTasksResponse.status).toBe(200);
    
    const updatedTask = updatedTasksResponse.data.find((task: any) => task.id === createdTask.id);
    expect(updatedTask).toBeDefined();
    expect(updatedTask.completed).toBe(true);
    expect(updatedTask.status).toBe('Done');
  });
});