/**
 * Script to create the project_tasks table in your database
 * Run this with: node create-project-tasks-table.js
 */
import pg from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a new PostgreSQL client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createProjectTasksTable() {
  const client = await pool.connect();
  
  try {
    console.log('Checking if project_tasks table exists...');
    
    // Check if the table exists
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (tableExists) {
      console.log('project_tasks table already exists, checking columns...');
      
      // Get the columns of the existing table
      const columnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks';
      `);
      
      console.log('Existing columns:', columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
      
      // Check for project_id column data type - key part we need to fix
      const projectIdColumn = columnsResult.rows.find(row => row.column_name === 'project_id');
      
      if (projectIdColumn && projectIdColumn.data_type === 'integer') {
        console.log('Updating project_id column type from integer to UUID...');
        
        // Start a transaction
        await client.query('BEGIN');
        
        try {
          // Create a backup of existing data
          console.log('Creating backup of existing tasks...');
          await client.query(`
            CREATE TABLE IF NOT EXISTS project_tasks_backup AS 
            SELECT * FROM project_tasks;
          `);
          
          // Alter the table to change column type
          // Note: This is a data-destructive operation
          console.log('Altering project_id column type...');
          await client.query(`
            ALTER TABLE project_tasks 
            ALTER COLUMN project_id TYPE UUID USING project_id::text::uuid;
          `);
          
          // Commit the transaction
          await client.query('COMMIT');
          console.log('Successfully updated project_id column to UUID type');
        } catch (error) {
          // Rollback on error
          await client.query('ROLLBACK');
          console.error('Error updating project_id column:', error);
          
          // Check if we need to restore from backup
          const hasBackup = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'project_tasks_backup'
            );
          `);
          
          if (hasBackup.rows[0].exists) {
            console.log('Restoring from backup...');
            await client.query(`
              DROP TABLE IF EXISTS project_tasks;
              ALTER TABLE project_tasks_backup RENAME TO project_tasks;
            `);
            console.log('Restored from backup');
          }
        }
      } else if (projectIdColumn) {
        console.log(`project_id column exists with type ${projectIdColumn.data_type}, no change needed`);
      } else {
        console.log('project_id column not found - unusual situation!');
      }
    } else {
      console.log('project_tasks table does not exist, creating it...');
      
      // Read the SQL from the migrations file
      const sqlPath = path.join(__dirname, 'migrations', 'create_project_tasks_table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      // Execute the SQL to create the table
      await client.query(sql);
      console.log('Successfully created project_tasks table');
    }
    
    // Verify table exists and has expected structure
    console.log('Verifying table structure...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Final table structure:', 
      finalColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
      
  } catch (error) {
    console.error('Error creating/updating project_tasks table:', error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration
createProjectTasksTable()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });