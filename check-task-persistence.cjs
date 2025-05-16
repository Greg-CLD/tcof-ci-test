/**
 * Quick script to check task persistence directly in the database
 */
const pg = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set up database client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTaskPersistence() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // 1. Use an existing project
    const projectQuery = await client.query(`
      SELECT id, name FROM projects 
      WHERE id = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8'
    `);
    
    if (projectQuery.rows.length === 0) {
      console.log('Project not found. Checking for any project...');
      const anyProjectQuery = await client.query('SELECT id, name FROM projects LIMIT 1');
      
      if (anyProjectQuery.rows.length === 0) {
        console.error('No projects found in database!');
        return;
      }
      
      projectQuery.rows = anyProjectQuery.rows;
    }
    
    const project = projectQuery.rows[0];
    console.log(`Found project: ${project.name} (${project.id})`);
    
    // 2. Check existing tasks
    const existingTasksQuery = await client.query(`
      SELECT id, text, stage, origin, source_id 
      FROM project_tasks 
      WHERE project_id = $1
      LIMIT 5
    `, [project.id]);
    
    console.log(`Found ${existingTasksQuery.rowCount} existing tasks for this project`);
    if (existingTasksQuery.rowCount > 0) {
      console.log('Sample tasks:');
      console.table(existingTasksQuery.rows);
    }
    
    // 3. Create a test task
    const now = new Date().toISOString();
    const taskText = `Test task - ${now}`;
    
    console.log(`Creating new task with text: "${taskText}"`);
    
    const insertTaskQuery = await client.query(`
      INSERT INTO project_tasks (
        id, project_id, text, stage, origin, source_id, 
        status, created_at, priority
      ) VALUES (
        gen_random_uuid(), $1, $2, 'identification', 'custom', 
        gen_random_uuid(), 
        'pending', NOW(), 'medium'
      ) RETURNING id, text, stage, origin, source_id
    `, [project.id, taskText]);
    
    const newTask = insertTaskQuery.rows[0];
    console.log('Task created successfully:');
    console.table(newTask);
    
    // 4. Verify the task can be retrieved
    const verifyTaskQuery = await client.query(`
      SELECT id, text, stage, origin, source_id, created_at 
      FROM project_tasks 
      WHERE id = $1
    `, [newTask.id]);
    
    if (verifyTaskQuery.rowCount === 1) {
      console.log('Task successfully verified in database:');
      console.table(verifyTaskQuery.rows[0]);
    } else {
      console.error('Task verification failed! Task not found after creation.');
    }
    
    // 5. Update the task
    const updatedText = `${taskText} [UPDATED]`;
    console.log(`Updating task with new text: "${updatedText}"`);
    
    const updateTaskQuery = await client.query(`
      UPDATE project_tasks
      SET text = $1, status = 'in_progress'
      WHERE id = $2
      RETURNING id, text, stage, origin, status
    `, [updatedText, newTask.id]);
    
    if (updateTaskQuery.rowCount === 1) {
      console.log('Task update successful:');
      console.table(updateTaskQuery.rows[0]);
    } else {
      console.error('Task update failed!');
    }
    
    // 6. Verify the update
    const verifyUpdateQuery = await client.query(`
      SELECT id, text, stage, origin, status
      FROM project_tasks
      WHERE id = $1
    `, [newTask.id]);
    
    if (verifyUpdateQuery.rowCount === 1 && 
        verifyUpdateQuery.rows[0].text === updatedText &&
        verifyUpdateQuery.rows[0].status === 'in_progress') {
      console.log('Update verification successful:');
      console.table(verifyUpdateQuery.rows[0]);
    } else {
      console.error('Update verification failed! Changes not persisted correctly.');
    }
    
    // 7. Clean up - delete the test task
    await client.query('DELETE FROM project_tasks WHERE id = $1', [newTask.id]);
    console.log(`Test task ${newTask.id} deleted.`);
    
    console.log('Task persistence test completed successfully!');
    
  } catch (error) {
    console.error('Error in task persistence check:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
checkTaskPersistence();