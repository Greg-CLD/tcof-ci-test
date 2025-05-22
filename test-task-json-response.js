/**
 * Test Script for Task JSON Response Fix
 * 
 * This script verifies that the task update endpoint always returns 
 * proper JSON responses with the correct Content-Type header.
 */
import fetch from 'node-fetch';
import fs from 'fs';

async function getCookieFromCurrentSession() {
  try {
    const cookie = fs.readFileSync('./current-session.txt', 'utf8').trim();
    return cookie;
  } catch (err) {
    console.error('No session cookie found in current-session.txt');
    return '';
  }
}

async function testTaskUpdate() {
  console.log('🔍 Testing task update JSON response...');
  
  // Get authentication cookie
  const cookie = await getCookieFromCurrentSession();
  if (!cookie) {
    console.error('❌ Cannot proceed without a session cookie');
    return;
  }
  
  console.log('✅ Found session cookie');
  
  try {
    // Step 1: Get a test project
    const projectsResponse = await fetch('http://localhost:5000/api/projects', {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!projectsResponse.ok) {
      console.error('❌ Failed to fetch projects:', projectsResponse.status);
      return;
    }
    
    const projects = await projectsResponse.json();
    if (!projects || !projects.length) {
      console.error('❌ No projects found');
      return;
    }
    
    const testProject = projects[0];
    console.log(`✅ Using test project: ${testProject.id} (${testProject.name})`);
    
    // Step 2: Get tasks for this project
    const tasksResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/tasks`, {
      headers: {
        'Cookie': cookie
      }
    });
    
    if (!tasksResponse.ok) {
      console.error('❌ Failed to fetch tasks:', tasksResponse.status);
      return;
    }
    
    const tasks = await tasksResponse.json();
    if (!tasks || !tasks.length) {
      console.error('❌ No tasks found for project');
      return;
    }
    
    // Find a Success Factor task if possible
    let testTask = tasks.find(t => t.origin === 'success-factor' || t.origin === 'factor');
    if (!testTask) {
      console.log('ℹ️ No Success Factor task found, using first available task');
      testTask = tasks[0];
    }
    
    console.log(`✅ Using task: ${testTask.id}`);
    console.log(`   - Text: ${testTask.text}`);
    console.log(`   - Origin: ${testTask.origin || 'N/A'}`);
    console.log(`   - Completed: ${testTask.completed}`);
    console.log(`   - Source ID: ${testTask.sourceId || 'N/A'}`);
    
    // Step 3: Create update payload - toggle completion status
    const update = {
      completed: !testTask.completed
    };
    
    console.log(`📝 Sending update: completed = ${update.completed}`);
    
    // Step 4: Send PUT request to update task
    const updateResponse = await fetch(`http://localhost:5000/api/projects/${testProject.id}/tasks/${testTask.id}`, {
      method: 'PUT',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(update)
    });
    
    console.log('📊 Response status:', updateResponse.status);
    console.log('📊 Content-Type:', updateResponse.headers.get('content-type'));
    
    if (updateResponse.headers.get('content-type')?.includes('application/json')) {
      console.log('✅ Received JSON Content-Type header');
    } else {
      console.error('❌ Wrong Content-Type header:', updateResponse.headers.get('content-type'));
    }
    
    try {
      // Try to parse as JSON
      const responseData = await updateResponse.json();
      console.log('✅ Successfully parsed response as JSON');
      console.log('📋 Response data:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError.message);
      
      // Check for HTML response
      const responseText = await updateResponse.text();
      if (responseText.includes('<!DOCTYPE html>')) {
        console.error('❌ ERROR: Received HTML instead of JSON!');
        console.error('❌ First 100 characters of response:', responseText.substring(0, 100));
      } else {
        console.error('❌ Raw response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testTaskUpdate();
