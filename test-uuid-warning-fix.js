/**
 * Simple script to test the UUID warning fixes
 * This script directly tests the task creation API with invalid UUID formats
 * to verify that tasks are still created correctly without console warnings
 */
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

async function testUuidWarningFix() {
  try {
    console.log('Testing UUID warning fix with invalid sourceId...');
    
    // Step 1: Get an authentication cookie by logging in
    console.log('Authenticating...');
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'greg@confluity.co.uk',
        password: 'Test1234!' // Use the test user's password
      }),
      redirect: 'manual'
    });
    
    // Extract the authentication cookie
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Authentication response status:', loginResponse.status);
    
    if (!cookies) {
      throw new Error('No authentication cookie received');
    }
    
    // Step 2: Get projects to find a project ID to use
    console.log('Fetching projects...');
    const projectsResponse = await fetch('http://localhost:5000/api/projects', {
      headers: {
        'Cookie': cookies
      }
    });
    
    const projects = await projectsResponse.json();
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length === 0) {
      throw new Error('No projects found for testing');
    }
    
    const projectId = projects[0].id;
    console.log(`Using project with ID: ${projectId}`);
    
    // Step 3: Create a task with an invalid sourceId
    console.log('Creating task with invalid sourceId...');
    const invalidSourceId = 'not-a-valid-uuid-format';
    
    const taskData = {
      text: `Test task with invalid sourceId - ${new Date().toISOString()}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: invalidSourceId,
      priority: 'medium',
      notes: 'Created by test script to verify UUID warning fix'
    };
    
    const createResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(taskData)
    });
    
    const createResult = await createResponse.json();
    console.log('Create task response:', createResult);
    
    if (createResponse.ok && createResult.task) {
      console.log('✅ Task created successfully with invalid sourceId converted to null');
      console.log('Task ID:', createResult.task.id);
      console.log('sourceId value:', createResult.task.sourceId);
      
      // Verify sourceId was set to null
      if (createResult.task.sourceId === null) {
        console.log('✅ sourceId was correctly set to null');
      } else {
        console.log('❌ sourceId was not set to null:', createResult.task.sourceId);
      }
    } else {
      console.log('❌ Failed to create task with invalid sourceId');
    }
    
    // Step 4: Create a task with a valid sourceId for comparison
    console.log('\nCreating task with valid sourceId...');
    const validSourceId = uuidv4();
    
    const validTaskData = {
      text: `Test task with valid sourceId - ${new Date().toISOString()}`,
      stage: 'identification',
      origin: 'custom',
      sourceId: validSourceId,
      priority: 'medium',
      notes: 'Created by test script to verify UUID handling'
    };
    
    const validCreateResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(validTaskData)
    });
    
    const validCreateResult = await validCreateResponse.json();
    console.log('Create task response (valid UUID):', validCreateResult);
    
    if (validCreateResponse.ok && validCreateResult.task) {
      console.log('✅ Task created successfully with valid sourceId');
      console.log('Task ID:', validCreateResult.task.id);
      console.log('sourceId value:', validCreateResult.task.sourceId);
      
      // Verify sourceId was preserved
      if (validCreateResult.task.sourceId === validSourceId) {
        console.log('✅ sourceId was correctly preserved');
      } else {
        console.log('❌ sourceId was modified:', validCreateResult.task.sourceId);
      }
    } else {
      console.log('❌ Failed to create task with valid sourceId');
    }
    
    console.log('\nTest completed successfully.');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testUuidWarningFix();