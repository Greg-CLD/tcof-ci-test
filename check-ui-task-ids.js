/**
 * UI Task ID Analysis Script
 * 
 * This script retrieves all tasks for the current project from the API
 * and logs their IDs, sourceIds, and origins for comparison with database records.
 */

const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';

async function fetchWithAuth(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

async function analyzeTaskIds() {
  console.log(`\n=== UI Task Analysis for Project ${projectId} ===\n`);
  
  try {
    // Fetch all tasks for the current project
    const tasks = await fetchWithAuth(`/api/projects/${projectId}/tasks`);
    
    console.log(`Found ${tasks.length} total tasks in the UI`);
    
    // Filter for Success Factor tasks
    const successFactorTasks = tasks.filter(task => 
      task.origin === 'factor' || task.source === 'factor'
    );
    
    console.log(`\nFound ${successFactorTasks.length} Success Factor tasks in the UI:\n`);
    
    // Create a comparison table for Success Factor tasks
    console.table(successFactorTasks.map(task => ({
      id: task.id,
      sourceId: task.sourceId || '<empty>',
      text: task.text,
      completed: task.completed,
      origin: task.origin || '<empty>',
      source: task.source || '<empty>'
    })));
    
    // Log IDs for comparison with database
    console.log('\nSuccess Factor task IDs used in UI update requests:');
    successFactorTasks.forEach(task => {
      console.log(`Task ID: ${task.id}`);
    });
    
    // Find potential mismatches
    console.log('\nAnalyzing potential issues:');
    successFactorTasks.forEach(task => {
      if (!task.id) {
        console.error(`❌ CRITICAL: Task missing ID: ${JSON.stringify(task)}`);
      }
      if (!task.sourceId) {
        console.warn(`⚠️ WARNING: Success Factor task missing sourceId: ${task.id} - ${task.text}`);
      }
    });
    
  } catch (error) {
    console.error('Error analyzing task IDs:', error);
  }
}

// Run the analysis
analyzeTaskIds();