/**
 * Deduplicate Success Factors script using the API
 * 
 * This script reduces the 32 factors in the database to 12 unique factors,
 * combining tasks from duplicates with the same title.
 */

import fetch from 'node-fetch';

async function apiRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'connect.sid=your_session_cookie_here' // Replace with actual cookie if needed
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const baseUrl = 'http://localhost:5000'; // Adjust if your server runs on a different port
  const url = `${baseUrl}${path}`;
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error ${method} ${path}:`, error.message);
    throw error;
  }
}

async function deduplicateFactors() {
  console.log('Starting Factor deduplication via API...');
  
  try {
    // Get the current factors first
    const existingFactors = await apiRequest('GET', '/api/admin/success-factors');
    console.log(`Found ${existingFactors.length} existing factors`);
    
    // Call the API endpoint to update canonical factors
    const result = await apiRequest('POST', '/api/admin/update-canonical-factors');
    
    console.log('Deduplication complete!');
    console.log('Result:', result);
    
    // Get the updated factors
    const updatedFactors = await apiRequest('GET', '/api/admin/success-factors');
    console.log(`Now have ${updatedFactors.length} factors after deduplication`);
    console.log('New factor titles:');
    updatedFactors.forEach(factor => {
      console.log(`- ${factor.title}`);
    });
    
    return true;
  } catch (error) {
    console.error('Deduplication failed:', error);
    return false;
  }
}

// Run the deduplication process
deduplicateFactors().then(success => {
  if (success) {
    console.log('Success factor deduplication via API completed successfully!');
    process.exit(0);
  } else {
    console.error('Success factor deduplication via API failed.');
    process.exit(1);
  }
});