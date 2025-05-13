/**
 * Test script to verify the success factors database implementation
 */
import pkg from 'pg';
const { Client } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFactorQueries() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // List all success factors
    const { rows: factors } = await client.query('SELECT * FROM success_factors');
    console.log(`Found ${factors.length} success factors in the database`);
    
    // Pick one factor to show
    if (factors.length > 0) {
      const { id, title, description } = factors[0];
      console.log('\nExample factor:');
      console.log(`ID: ${id}`);
      console.log(`Title: ${title}`);
      console.log(`Description: ${description}`);
      
      // Get tasks for this factor
      const { rows: tasks } = await client.query(
        'SELECT stage, text, "order" FROM success_factor_tasks WHERE factor_id = $1 ORDER BY stage, "order"',
        [id]
      );
      
      console.log('\nTasks:');
      const tasksByStage = {};
      tasks.forEach(task => {
        if (!tasksByStage[task.stage]) {
          tasksByStage[task.stage] = [];
        }
        tasksByStage[task.stage].push(task.text);
      });
      
      for (const [stage, stageTasks] of Object.entries(tasksByStage)) {
        console.log(`\n${stage} Stage:`);
        stageTasks.forEach((task, i) => {
          console.log(`  ${i+1}. ${task}`);
        });
      }
    }
    
    // Example of using this in the factorsDb implementation
    console.log('\nExample of how this data would be transformed for API:');
    if (factors.length > 0) {
      const factor = factors[0];
      
      // Get tasks for this factor
      const { rows: tasks } = await client.query(
        'SELECT stage, text, "order" FROM success_factor_tasks WHERE factor_id = $1 ORDER BY stage, "order"',
        [factor.id]
      );
      
      // Group tasks by stage
      const stagedTasks = {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
      
      tasks.forEach(task => {
        if (stagedTasks[task.stage]) {
          stagedTasks[task.stage].push(task.text);
        }
      });
      
      // Create the formatted output
      const formattedFactor = {
        id: factor.id,
        title: factor.title,
        description: factor.description || '',
        tasks: stagedTasks
      };
      
      console.log(JSON.stringify(formattedFactor, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing factor queries:', error);
  } finally {
    await client.end();
    console.log('\nDisconnected from database');
  }
}

testFactorQueries();