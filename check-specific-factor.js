/**
 * Check and add specific Success Factor to project
 * 
 * This focused script checks if the specific Success Factor with ID
 * 2f565bf9-70c7-5c41-93e7-c6c4cde32312 exists in project bc55c1a2-0cdf-4108-aa9e-44b44baea3b8
 * and adds it if missing.
 */
import pkg from 'pg';
const { Client } = pkg;
import { v4 as uuidv4 } from 'uuid';

const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const factorId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  try {
    console.log(`Checking for Success Factor ${factorId} in project ${projectId}...`);
    
    // Check if the specific task exists
    const checkResult = await client.query(`
      SELECT * FROM project_tasks
      WHERE project_id = $1 AND source_id = $2
    `, [projectId, factorId]);
    
    if (checkResult.rows.length === 0) {
      console.log('NOT FOUND: Factor does not exist in project');
      
      // Insert the missing task
      console.log('Inserting missing task...');
      const newTaskId = uuidv4();
      
      const insertResult = await client.query(`
        INSERT INTO project_tasks
        (id, project_id, text, stage, origin, source_id, completed, status, created_at, updated_at)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        newTaskId,                  // id
        projectId,                  // project_id
        'Be Ready to Adapt',        // text (title of the factor)
        'identification',           // stage
        'factor',                   // origin 
        factorId,                   // source_id
        false,                      // completed
        'pending',                  // status
        new Date(),                 // created_at
        new Date()                  // updated_at
      ]);
      
      console.log('Successfully inserted task:');
      console.log(JSON.stringify(insertResult.rows[0], null, 2));
    } else {
      console.log('FOUND: Factor exists in project');
      console.log(JSON.stringify(checkResult.rows[0], null, 2));
    }
    
    // Test toggling the task via curl
    console.log('\nTesting task toggle via API...');
    const { exec } = require('child_process');
    exec(`curl -X PUT -H "Content-Type: application/json" -H "x-auth-override: true" -d '{"completed":true}' https://9b3ebbf7-9690-415a-a774-4c1b8f1719a3-00-jbynja68j24v.worf.replit.dev/api/projects/${projectId}/tasks/${factorId}`, 
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        console.log('\nAPI Response:');
        console.log(stdout);
      }
    );
    
    // Wait for the curl command to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});