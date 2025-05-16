/**
 * Script to fix the v_success_factors_full view after UUID migration
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixView() {
  const client = await pool.connect();
  
  try {
    console.log('Starting view fix...');
    
    // Step 1: Drop the view if it exists
    await client.query('DROP VIEW IF EXISTS v_success_factors_full');
    console.log('Dropped existing view');
    
    // Step 2: Get the success_factors table columns
    const { rows: columns } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'success_factors'
      ORDER BY ordinal_position
    `);
    
    console.log('Success factors columns:');
    columns.forEach(col => console.log(`- ${col.column_name}`));
    
    // Step 3: Recreate the view with the correct columns
    // We'll dynamically build the query based on the actual columns
    const includeColumns = ['id', 'title', 'description', 'canonical'];
    const viewColumns = columns
      .map(col => col.column_name)
      .filter(col => includeColumns.includes(col))
      .map(col => `sf.${col}`)
      .join(', ');
    
    const query = `
      CREATE OR REPLACE VIEW v_success_factors_full AS
      SELECT 
        ${viewColumns},
        COUNT(sft.id) AS task_count
      FROM 
        success_factors sf
      LEFT JOIN 
        success_factor_tasks sft ON sf.id = sft.factor_id
      GROUP BY 
        ${viewColumns}
      ORDER BY 
        sf.title
    `;
    
    console.log('Creating view with query:');
    console.log(query);
    
    await client.query(query);
    console.log('View v_success_factors_full recreated successfully');
    
    // Step 4: Verify UUID types
    console.log('Verifying UUID types...');
    const tables = [
      { name: 'success_factors', column: 'id' },
      { name: 'success_factor_tasks', column: 'factor_id' },
      { name: 'success_factor_ratings', column: 'factor_id' },
      { name: 'project_tasks', column: 'source_id' }
    ];
    
    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT data_type, is_nullable 
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `, [table.name, table.column]);
      
      if (rows.length > 0) {
        console.log(`${table.name}.${table.column}: ${rows[0].data_type} (nullable: ${rows[0].is_nullable})`);
      } else {
        console.log(`${table.name}.${table.column}: Column not found`);
      }
    }
    
    // Step 5: Verify UUID data integrity
    const { rows: invalidUuids } = await client.query(`
      SELECT COUNT(*) FROM success_factors 
      WHERE id::TEXT !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    `);
    console.log(`Invalid UUIDs in success_factors: ${invalidUuids[0].count} (should be 0)`);
    
    console.log('View fix completed successfully!');
    
  } catch (error) {
    console.error('View fix failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the view fix
fixView()
  .then(() => {
    console.log('View fix script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('View fix failed:', err);
    process.exit(1);
  });