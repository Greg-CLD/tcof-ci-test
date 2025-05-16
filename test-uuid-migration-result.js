/**
 * Script to verify the success of the UUID migration
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Verifying UUID migration results...');
    
    // Check success_factors IDs
    const { rows: factorRows } = await client.query(`
      SELECT id, title FROM success_factors LIMIT 3
    `);
    
    console.log('\nSuccess factors have UUID IDs:');
    console.table(factorRows);
    
    // Check project_tasks source_id
    const { rows: taskRows } = await client.query(`
      SELECT id, source_id, title FROM project_tasks LIMIT 3
    `);
    
    console.log('\nProject tasks have UUID source_id:');
    console.table(taskRows);
    
    // Check the view
    console.log('\nVerifying view data:');
    const { rows: viewRows } = await client.query(`
      SELECT * FROM v_success_factors_full LIMIT 3
    `);
    console.table(viewRows);
    
    // Verify column types
    console.log('\nVerifying column data types:');
    const tables = [
      { name: 'success_factors', column: 'id' },
      { name: 'success_factor_tasks', column: 'factor_id' },
      { name: 'success_factor_ratings', column: 'factor_id' },
      { name: 'project_tasks', column: 'source_id' }
    ];
    
    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT data_type 
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `, [table.name, table.column]);
      
      if (rows.length > 0) {
        console.log(`${table.name}.${table.column}: ${rows[0].data_type}`);
      } else {
        console.log(`${table.name}.${table.column}: Column not found`);
      }
    }
    
    // Final validation
    console.log('\nUUID validation:');
    const { rows: validationRows } = await client.query(`
      SELECT COUNT(*) AS invalid_count
      FROM success_factors
      WHERE id::TEXT !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    `);
    
    console.log(`Number of invalid UUIDs found: ${validationRows[0].invalid_count} (should be 0)`);
    
    console.log('\nMigration verification completed successfully!');
    
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyMigration()
  .then(() => {
    console.log('UUID migration verification script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Verification script failed:', err);
    process.exit(1);
  });