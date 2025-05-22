/**
 * Test specific Success Factor task for project bc55c1a2-0cdf-4108-aa9e-44b44baea3b8
 * 
 * This script directly tests the existence of the specific Success Factor task
 * with ID 2f565bf9-70c7-5c41-93e7-c6c4cde32312 and attempts to toggle it.
 */
import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
const FACTOR_ID = '2f565bf9-70c7-5c41-93e7-c6c4cde32312';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  try {
    // Query for the specific task
    console.log(`Checking for Success Factor ${FACTOR_ID} in project ${PROJECT_ID}...`);
    const result = await client.query(`
      SELECT * FROM project_tasks
      WHERE project_id = $1 AND source_id = $2
    `, [PROJECT_ID, FACTOR_ID]);

    // Log the result
    if (result.rows.length === 0) {
      console.log('NOT FOUND - Success Factor task does not exist in project');
    } else {
      console.log('FOUND - Success Factor task exists in project:');
      console.log(JSON.stringify(result.rows[0], null, 2));

      // Test toggling the task
      console.log('\nToggling task completion status...');
      const currentCompleted = result.rows[0].completed || false;
      const newCompleted = !currentCompleted;
      
      const updateResult = await client.query(`
        UPDATE project_tasks
        SET completed = $1, updated_at = $2
        WHERE project_id = $3 AND source_id = $4
        RETURNING *
      `, [newCompleted, new Date(), PROJECT_ID, FACTOR_ID]);
      
      console.log(`Task toggled from ${currentCompleted} to ${newCompleted}:`);
      console.log(JSON.stringify(updateResult.rows[0], null, 2));
    }
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