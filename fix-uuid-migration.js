/**
 * Focused script to complete the UUID migration
 * This script:
 * 1. Drops dependent views first
 * 2. Completes the data type conversion to UUID
 * 3. Restores the views with updated types
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixUuidMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting UUID migration fix...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Step 1: Drop dependent views again (in case they were restored incorrectly)
    console.log('Dropping dependent views...');
    await client.query('DROP VIEW IF EXISTS v_success_factors_full');
    
    // Step 2: Verify column types
    const { rows: columnTypes } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'success_factors' AND column_name = 'id'
    `);
    
    if (columnTypes.length > 0) {
      console.log(`Current type of success_factors.id: ${columnTypes[0].data_type}`);
      
      // Only alter if needed
      if (columnTypes[0].data_type !== 'uuid') {
        console.log('Altering success_factors.id to UUID...');
        await client.query(`
          ALTER TABLE success_factors
          ALTER COLUMN id TYPE UUID USING id::UUID
        `);
      }
    }
    
    // Step 3: Verify project_tasks.source_id
    const { rows: taskColumnTypes } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'project_tasks' AND column_name = 'source_id'
    `);
    
    if (taskColumnTypes.length > 0) {
      console.log(`Current type of project_tasks.source_id: ${taskColumnTypes[0].data_type}`);
      console.log(`Nullable: ${taskColumnTypes[0].is_nullable}`);
      
      // Only alter if needed
      if (taskColumnTypes[0].data_type !== 'uuid') {
        console.log('Altering project_tasks.source_id to UUID...');
        
        // Handle NULL values first if they exist
        await client.query(`
          UPDATE project_tasks
          SET source_id = gen_random_uuid()::TEXT
          WHERE source_id IS NULL OR source_id = ''
        `);
        
        await client.query(`
          ALTER TABLE project_tasks
          ALTER COLUMN source_id TYPE UUID USING source_id::UUID
        `);
        
        // Set NOT NULL constraint if necessary
        if (taskColumnTypes[0].is_nullable === 'YES') {
          await client.query(`
            ALTER TABLE project_tasks
            ALTER COLUMN source_id SET NOT NULL
          `);
        }
      }
    }
    
    // Step 4: Recreate the view with proper UUID types
    console.log('Recreating views...');
    await client.query(`
      CREATE OR REPLACE VIEW v_success_factors_full AS
      SELECT 
        sf.id::UUID AS id,
        sf.title,
        sf.description,
        sf.user_rank,
        sf.canonical,
        COUNT(sft.id) AS task_count
      FROM 
        success_factors sf
      LEFT JOIN 
        success_factor_tasks sft ON sf.id = sft.factor_id
      GROUP BY 
        sf.id, sf.title, sf.description, sf.user_rank, sf.canonical
      ORDER BY 
        sf.user_rank, sf.title
    `);
    
    // Step 5: Verify all success_factor_tasks references are of UUID type
    const { rows: taskRefTypes } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'success_factor_tasks' AND column_name = 'factor_id'
    `);
    
    if (taskRefTypes.length > 0) {
      console.log(`Current type of success_factor_tasks.factor_id: ${taskRefTypes[0].data_type}`);
      
      if (taskRefTypes[0].data_type !== 'uuid') {
        console.log('Altering success_factor_tasks.factor_id to UUID...');
        await client.query(`
          ALTER TABLE success_factor_tasks
          ALTER COLUMN factor_id TYPE UUID USING factor_id::UUID
        `);
      }
    }
    
    // Step 6: Same for success_factor_ratings
    const { rows: ratingRefTypes } = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'success_factor_ratings' AND column_name = 'factor_id'
    `);
    
    if (ratingRefTypes.length > 0) {
      console.log(`Current type of success_factor_ratings.factor_id: ${ratingRefTypes[0].data_type}`);
      
      if (ratingRefTypes[0].data_type !== 'uuid') {
        console.log('Altering success_factor_ratings.factor_id to UUID...');
        await client.query(`
          ALTER TABLE success_factor_ratings
          ALTER COLUMN factor_id TYPE UUID USING factor_id::UUID
        `);
      }
    }
    
    // Step 7: Ensure foreign key constraints are in place
    console.log('Checking and recreating foreign key constraints...');
    
    // Get current constraints
    const { rows: constraints } = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'success_factor_tasks' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    if (constraints.length === 0) {
      console.log('Adding missing foreign key constraint to success_factor_tasks...');
      await client.query(`
        ALTER TABLE success_factor_tasks 
        ADD CONSTRAINT fk_success_factor 
        FOREIGN KEY (factor_id) REFERENCES success_factors (id) ON DELETE CASCADE
      `);
    }
    
    const { rows: ratingConstraints } = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'success_factor_ratings' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    if (ratingConstraints.length === 0) {
      console.log('Adding missing foreign key constraint to success_factor_ratings...');
      await client.query(`
        ALTER TABLE success_factor_ratings
        ADD CONSTRAINT success_factor_ratings_factor_id_fkey
        FOREIGN KEY (factor_id) REFERENCES success_factors (id) ON DELETE CASCADE
      `);
    }
    
    // Step 8: Verify all data is properly converted
    console.log('Verifying the migration...');
    
    // Verify success_factors
    const { rows: sfCount } = await client.query(`
      SELECT COUNT(*) FROM success_factors
    `);
    console.log(`Success factors count: ${sfCount[0].count}`);
    
    // Verify UUIDs are valid
    const { rows: invalidUuids } = await client.query(`
      SELECT COUNT(*) FROM success_factors 
      WHERE id::TEXT !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    `);
    console.log(`Invalid UUIDs found in success_factors: ${invalidUuids[0].count} (should be 0)`);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('UUID migration fix completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('UUID migration fix failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration fix
fixUuidMigration()
  .then(() => {
    console.log('Migration fix script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration fix failed:', err);
    process.exit(1);
  });