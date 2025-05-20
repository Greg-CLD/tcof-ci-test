
const fetch = require('node-fetch');

async function testTaskCompletion() {
  console.log('Testing SuccessFactor task completion logging...');
  
  const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
  const taskId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

  try {
    // Toggle task completion
    const response = await fetch(`http://0.0.0.0:5000/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        completed: true
      })
    });

    console.log('Response status:', response.status);
    console.log('Response:', await response.json());
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testTaskCompletion();
