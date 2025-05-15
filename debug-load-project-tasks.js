/**
 * Debug script to trace the loading of project tasks through the API
 * This script will:
 * 1. Make a direct GET request to the tasks API endpoint
 * 2. Log the response
 */

import fetch from 'node-fetch';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

// Test credentials
const TEST_USER = 'greg@confluity.co.uk';
const TEST_PASSWORD = 'password';

async function debugLoadProjectTasks() {
  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');

    // Get a project ID from command line or use a default
    const projectId = process.argv[2];
    
    if (!projectId) {
      console.error('Please provide a project ID as command line argument');
      process.exit(1);
    }
    
    console.log(`Debugging task loading for project ID: ${projectId}`);
    
    // Step 1: Verify the project exists directly in the database
    const projectResult = await client.query(
      'SELECT * FROM projects WHERE id = $1::uuid',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      console.error(`Project with ID ${projectId} not found in database`);
      process.exit(1);
    }
    
    console.log(`Found project in database: ${JSON.stringify(projectResult.rows[0], null, 2)}`);
    
    // Step 2: Check for tasks directly in the database
    const tasksResult = await client.query(
      'SELECT * FROM project_tasks WHERE project_id = $1::uuid',
      [projectId]
    );
    
    console.log(`Found ${tasksResult.rows.length} tasks for project ${projectId} in database`);
    
    if (tasksResult.rows.length > 0) {
      console.log('Sample task from database:', JSON.stringify(tasksResult.rows[0], null, 2));
    }
    
    // Step 3: Get an auth token using password authentication
    console.log('Logging in to get auth token...');
    let apiBaseUrl = 'http://localhost:3000'; // Adjust based on your configuration
    
    // Try to get API base URL from environment variables
    if (process.env.REPLIT_DOMAINS) {
      apiBaseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
    }
    
    console.log(`Using API base URL: ${apiBaseUrl}`);
    
    // Get auth session cookie
    const loginResponse = await fetch(`${apiBaseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: TEST_USER,
        password: TEST_PASSWORD,
      }),
      redirect: 'follow',
    });
    
    if (!loginResponse.ok) {
      console.error(`Login failed with status: ${loginResponse.status}`);
      console.error(await loginResponse.text());
      process.exit(1);
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);
    
    // Get the cookies from the response to use for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Received cookies:', cookies);
    
    // Step 4: Call the task API with authentication
    console.log(`Fetching tasks for project ${projectId} via API...`);
    const taskApiResponse = await fetch(`${apiBaseUrl}/api/projects/${projectId}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    });
    
    if (!taskApiResponse.ok) {
      console.error(`Task API request failed with status: ${taskApiResponse.status}`);
      console.error(await taskApiResponse.text());
    } else {
      const taskApiData = await taskApiResponse.json();
      console.log(`API returned ${taskApiData.length} tasks:`, JSON.stringify(taskApiData, null, 2));
    }
    
    // Step 5: Let's add a task via the API and see if it sticks
    console.log('Creating a new task via API...');
    const newTaskName = `API Debug Test Task ${Date.now()}`;
    
    const createTaskResponse = await fetch(`${apiBaseUrl}/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        text: newTaskName,
        stage: 'identification',
        origin: 'custom',
        sourceId: 'api-debug-test',
      }),
    });
    
    if (!createTaskResponse.ok) {
      console.error(`Create task request failed with status: ${createTaskResponse.status}`);
      console.error(await createTaskResponse.text());
    } else {
      const newTask = await createTaskResponse.json();
      console.log('New task created via API:', JSON.stringify(newTask, null, 2));
      
      // Step 6: Verify the task was added to the database
      const verifyTaskResult = await client.query(
        'SELECT * FROM project_tasks WHERE id = $1',
        [newTask.id]
      );
      
      if (verifyTaskResult.rows.length === 0) {
        console.error(`Task with ID ${newTask.id} not found in database after API creation`);
      } else {
        console.log('Verified task exists in database after API creation:');
        console.log(JSON.stringify(verifyTaskResult.rows[0], null, 2));
      }
      
      // Step 7: Verify we can get the task back via API
      console.log('Fetching tasks again to verify the new task appears...');
      const verifyApiResponse = await fetch(`${apiBaseUrl}/api/projects/${projectId}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
        },
      });
      
      if (!verifyApiResponse.ok) {
        console.error(`Verify task API request failed with status: ${verifyApiResponse.status}`);
        console.error(await verifyApiResponse.text());
      } else {
        const verifyApiData = await verifyApiResponse.json();
        console.log(`API now returns ${verifyApiData.length} tasks`);
        
        // Find our newly created task in the API response
        const foundNewTask = verifyApiData.find(task => task.id === newTask.id);
        if (foundNewTask) {
          console.log('Successfully found newly created task in API response');
        } else {
          console.error('Could not find newly created task in API response!');
          console.log('API response:', JSON.stringify(verifyApiData, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('Error in debug load project tasks:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the debug function
debugLoadProjectTasks();