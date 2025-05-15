/**
 * Script to fix the project_tasks table schema to align the old and new column structures
 * This script will:
 * 1. Check the existing schema
 * 2. Add missing columns if needed
 * 3. Copy data from old column names to new column names
 * 4. Make the 'text' column NOT NULL to match schema definition
 * 
 * Run with: node fix-project-tasks-schema.cjs
 */
const pg = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixProjectTasksSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Starting project_tasks schema fix...');
    
    // Begin a transaction
    await client.query('BEGIN');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('project_tasks table does not exist!');
      await client.query('ROLLBACK');
      return;
    }
    
    // Get current schema columns
    const schemaQuery = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Current schema:');
    console.table(schemaQuery.rows);
    
    // Check for old columns
    const hasTitle = schemaQuery.rows.some(col => col.column_name === 'title');
    const hasText = schemaQuery.rows.some(col => col.column_name === 'text');
    const hasTaskNotes = schemaQuery.rows.some(col => col.column_name === 'task_notes');
    const hasNotes = schemaQuery.rows.some(col => col.column_name === 'notes');
    
    // Add any missing columns required by the new schema
    if (!hasText) {
      console.log('Adding missing "text" column...');
      await client.query(`
        ALTER TABLE project_tasks 
        ADD COLUMN IF NOT EXISTS text TEXT;
      `);
    }
    
    if (!hasNotes) {
      console.log('Adding missing "notes" column...');
      await client.query(`
        ALTER TABLE project_tasks 
        ADD COLUMN IF NOT EXISTS notes TEXT;
      `);
    }
    
    // Migration steps for data
    if (hasTitle && hasText) {
      console.log('Copying data from title to text for rows where text is NULL...');
      await client.query(`
        UPDATE project_tasks 
        SET text = title 
        WHERE text IS NULL AND title IS NOT NULL;
      `);
      
      // Count updated rows
      const updatedCount = await client.query(`
        SELECT COUNT(*) FROM project_tasks 
        WHERE text IS NOT NULL AND title IS NOT NULL;
      `);
      
      console.log(`Updated ${updatedCount.rows[0].count} rows from title to text`);
    }
    
    if (hasTaskNotes && hasNotes) {
      console.log('Copying data from task_notes to notes for rows where notes is NULL...');
      await client.query(`
        UPDATE project_tasks 
        SET notes = task_notes 
        WHERE notes IS NULL AND task_notes IS NOT NULL;
      `);
      
      // Count updated rows
      const updatedCount = await client.query(`
        SELECT COUNT(*) FROM project_tasks 
        WHERE notes IS NOT NULL AND task_notes IS NOT NULL;
      `);
      
      console.log(`Updated ${updatedCount.rows[0].count} rows from task_notes to notes`);
    }
    
    // Set "text" to empty string when NULL to match schema NOT NULL constraint
    console.log('Setting NULL text values to empty string to match NOT NULL constraint...');
    await client.query(`
      UPDATE project_tasks 
      SET text = '' 
      WHERE text IS NULL;
    `);
    
    // Make text column NOT NULL to match schema
    console.log('Making text column NOT NULL to match schema definition...');
    await client.query(`
      ALTER TABLE project_tasks 
      ALTER COLUMN text SET NOT NULL;
    `);
    
    // Ensure stage column is not NULL
    console.log('Setting NULL stage values to "identification" to match NOT NULL constraint...');
    await client.query(`
      UPDATE project_tasks 
      SET stage = 'identification' 
      WHERE stage IS NULL;
    `);
    
    // Make stage column NOT NULL to match schema
    console.log('Making stage column NOT NULL to match schema definition...');
    await client.query(`
      ALTER TABLE project_tasks 
      ALTER COLUMN stage SET NOT NULL;
    `);
    
    // Ensure origin column is not NULL
    console.log('Setting NULL origin values to "custom" to match NOT NULL constraint...');
    await client.query(`
      UPDATE project_tasks 
      SET origin = 'custom' 
      WHERE origin IS NULL;
    `);
    
    // Make origin column NOT NULL to match schema
    console.log('Making origin column NOT NULL to match schema definition...');
    await client.query(`
      ALTER TABLE project_tasks 
      ALTER COLUMN origin SET NOT NULL;
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Verify the changes
    const afterSchema = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Schema after fixes:');
    console.table(afterSchema.rows);
    
    console.log('Schema fix completed successfully!');
    
    // Check for any task records with NULL values in required fields
    const nullCheck = await client.query(`
      SELECT COUNT(*) as null_count
      FROM project_tasks
      WHERE text IS NULL OR stage IS NULL OR origin IS NULL;
    `);
    
    if (nullCheck.rows[0].null_count > 0) {
      console.warn(`Warning: There are still ${nullCheck.rows[0].null_count} tasks with NULL values in required fields!`);
    } else {
      console.log('All tasks have required fields filled. Schema is now consistent with ORM definition.');
    }
    
  } catch (error) {
    // If any errors occur, roll back the transaction
    await client.query('ROLLBACK');
    console.error('Error fixing project_tasks schema:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Self-invoking async function
(async function() {
  try {
    await fixProjectTasksSchema();
    console.log('Schema fix script completed.');
    process.exit(0);
  } catch (error) {
    console.error('Schema fix script failed:', error);
    process.exit(1);
  }
})();