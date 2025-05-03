/**
 * Deduplicate Success Factors script using the API
 * 
 * This script reduces the 32 factors in the database to 12 unique factors,
 * combining tasks from duplicates with the same title.
 */
import fs from 'fs';
import path from 'path';
import http from 'http';

// Helper function to make API requests
async function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function deduplicateFactors() {
  console.log('Starting factor deduplication process using API...');
  
  try {
    // First, get all factors from the API
    console.log('Fetching factors from API...');
    const response = await apiRequest('GET', '/api/admin/tcof-tasks');
    
    if (response.status !== 200 || !response.data || !Array.isArray(response.data)) {
      throw new Error(`Failed to fetch factors from API: ${response.status}`);
    }
    
    const rawFactors = response.data;
    console.log(`Fetched ${rawFactors.length} factors from API`);
    
    // Deduplicate by factor title
    const dedupMap = {};
    
    rawFactors.forEach(item => {
      const key = item.title.trim();
      
      if (!dedupMap[key]) {
        // Create a base entry with empty task arrays
        dedupMap[key] = { 
          title: item.title, 
          id: item.id, 
          tasks: {
            Identification: [],
            Definition: [],
            Delivery: [],
            Closure: []
          }
        };
      }
      
      // Merge tasks from all stages
      ['Identification', 'Definition', 'Delivery', 'Closure'].forEach(stage => {
        const sourceTasks = item.tasks?.[stage] || [];
        
        sourceTasks.forEach(task => {
          // Only add unique tasks (avoid duplicates)
          if (!dedupMap[key].tasks[stage].includes(task)) {
            dedupMap[key].tasks[stage].push(task);
          }
        });
      });
    });

    // Convert map back to array
    const dedupFactors = Object.values(dedupMap);
    console.log(`Deduplicated to ${dedupFactors.length} unique factors`);
    
    if (dedupFactors.length !== 12) {
      console.warn(`Warning: Expected 12 unique factors, but found ${dedupFactors.length}`);
    }
    
    // Assign ids consistently if needed
    dedupFactors.forEach((factor, index) => {
      if (!factor.id || factor.id.includes("duplicate")) {
        factor.id = `sf-${index + 1}`;
      }
    });

    // Save to file for backup
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataDir, 'dedupFactors.json'), 
      JSON.stringify(dedupFactors, null, 2),
      'utf8'
    );
    
    // Save back to API
    console.log('Saving deduplicated factors back to API...');
    const saveResponse = await apiRequest('POST', '/api/admin/tcof-tasks', dedupFactors);
    
    if (saveResponse.status !== 200) {
      throw new Error(`Failed to save deduplicated factors: ${saveResponse.status}`);
    }
    
    console.log('✅ Deduplicated factors saved successfully!');
    return true;
  } catch (error) {
    console.error('Error deduplicating factors:', error);
    return false;
  }
}

// Run the deduplication function
deduplicateFactors().then(success => {
  if (success) {
    console.log('Factor deduplication complete!');
  } else {
    console.error('Factor deduplication failed.');
    process.exit(1);
  }
});