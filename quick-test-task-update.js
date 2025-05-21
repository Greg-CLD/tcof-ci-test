/**
 * Quick test for the improved task update functionality.
 * This script simulates the two key scenarios:
 * 1. Updating a task using its full ID
 * 2. Updating a task using only the extracted UUID part
 */

import fetch from 'node-fetch';

async function testTaskUpdate() {
  console.log('=== Testing Enhanced Task Update Functionality ===');
  
  // Step 1: Find a project and a task with success factor origin
  const projectsResponse = await fetch('http://localhost:3000/api/projects');
  const projects = await projectsResponse.json();
  
  if (!projects.length) {
    console.error('No projects found to test with');
    return;
  }
  
  const projectId = projects[0].id;
  console.log(`Using project ID: ${projectId}`);
  
  // Get tasks for this project
  const tasksResponse = await fetch(`http://localhost:3000/api/projects/${projectId}/tasks`);
  const tasks = await tasksResponse.json();
  
  // Look for a success factor task
  const successFactorTask = tasks.find(task => 
    task.origin === 'success-factor' || task.origin === 'factor'
  );
  
  if (!successFactorTask) {
    console.log('No success factor task found. Please create one in the UI first.');
    return;
  }
  
  console.log(`Found success factor task: ${successFactorTask.id}`);
  console.log(`Current completion state: ${successFactorTask.completed}`);
  
  // Extract just the UUID part (first 5 segments) for testing
  const uuidPart = successFactorTask.id.split('-').slice(0, 5).join('-');
  console.log(`Extracted UUID part: ${uuidPart}`);
  
  // Test updating using the extracted UUID
  if (uuidPart !== successFactorTask.id) {
    console.log('\nTrying update with UUID part only...');
    
    const updateResponse = await fetch(
      `http://localhost:3000/api/projects/${projectId}/tasks/${uuidPart}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          completed: !successFactorTask.completed,
          origin: 'success-factor' // Ensure we send the origin for the improved task lookup
        })
      }
    );
    
    // Check if update was successful
    if (updateResponse.ok) {
      const updatedTask = await updateResponse.json();
      console.log('Success! Task was updated using only the UUID part');
      console.log(`New completion state: ${updatedTask.completed}`);
    } else {
      console.error('Failed to update task with UUID part');
      console.error('Response status:', updateResponse.status);
      try {
        const errorText = await updateResponse.text();
        console.error('Error response:', errorText);
      } catch (e) {
        console.error('Could not read error response');
      }
    }
  } else {
    console.log('This task does not have a compound ID, cannot test UUID part lookup');
  }
  
  console.log('\n=== Test Complete ===');
}

testTaskUpdate().catch(error => {
  console.error('Test failed with error:', error);
});