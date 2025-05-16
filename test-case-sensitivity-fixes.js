/**
 * Simple script to test case sensitivity fixes in the Checklist component
 */
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Client } = pg;

async function testCaseSensitivityFixes() {
  console.log('Testing case sensitivity fixes for stages...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Find test project
    const projectQuery = await client.query(`
      SELECT id, name FROM projects LIMIT 1
    `);
    
    if (projectQuery.rowCount === 0) {
      throw new Error('No projects found for testing');
    }
    
    const project = projectQuery.rows[0];
    console.log(`Using project: ${project.name} (${project.id})`);
    
    // Test creating tasks with different case variations of stage
    const stageVariations = [
      'identification',
      'Identification',
      'definition',
      'Definition',
      'delivery',
      'Delivery',
      'closure',
      'Closure'
    ];
    
    // Create a task for each stage variation
    for (const stage of stageVariations) {
      const taskText = `Case Sensitivity Test: ${stage} - ${new Date().toISOString()}`;
      
      try {
        const result = await client.query(`
          INSERT INTO project_tasks (
            id, project_id, text, stage, origin, source_id, 
            status, created_at, priority
          ) VALUES (
            $1, $2, $3, $4, 'custom', $5,
            'pending', NOW(), 'medium'
          ) RETURNING id, text, stage
        `, [uuidv4(), project.id, taskText, stage.toLowerCase(), uuidv4()]);
        
        console.log(`✅ Successfully created task with stage "${stage}":`);
        console.log(result.rows[0]);
      } catch (err) {
        console.error(`❌ Failed to create task with stage "${stage}":`, err.message);
      }
    }
    
    // Fetch all tasks we just created to verify case insensitivity in retrieval
    const tasksQuery = await client.query(`
      SELECT id, text, stage FROM project_tasks 
      WHERE text LIKE 'Case Sensitivity Test:%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`\nRetrieved ${tasksQuery.rowCount} test tasks:`);
    console.table(tasksQuery.rows);
    
    // Check what happens when we query with specific case variations
    for (const stage of ['identification', 'Identification']) {
      const stageTasksQuery = await client.query(`
        SELECT COUNT(*) FROM project_tasks 
        WHERE stage = $1 AND text LIKE 'Case Sensitivity Test:%'
      `, [stage]);
      
      console.log(`Tasks with stage "${stage}": ${stageTasksQuery.rows[0].count}`);
    }
    
    console.log('\nCase sensitivity test complete');
    
  } catch (err) {
    console.error('Error during case sensitivity test:', err);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

testCaseSensitivityFixes();