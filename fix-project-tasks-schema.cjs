/**
 * Script to fix the project_tasks table schema
 * This addresses the type mismatch between project_id and the projects table id
 */
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create a new PostgreSQL client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixProjectTasksSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Starting project_tasks schema fix...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if project_tasks table exists and its columns
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('project_tasks table does not exist, creating it with correct schema...');
      
      // Create the table with correct column types from scratch
      await client.query(`
        CREATE TABLE project_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          factor_id TEXT,
          stage TEXT,
          status TEXT DEFAULT 'pending',
          due_date TIMESTAMP,
          assigned_to TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          task_notes TEXT,
          task_type TEXT DEFAULT 'custom',
          text TEXT -- For compatibility with existing code
        );
        
        CREATE INDEX project_tasks_project_id_idx ON project_tasks(project_id);
        CREATE INDEX project_tasks_factor_id_idx ON project_tasks(factor_id);
        CREATE INDEX project_tasks_stage_idx ON project_tasks(stage);
        CREATE INDEX project_tasks_status_idx ON project_tasks(status);
      `);
      
      console.log('Successfully created project_tasks table with correct schema');
    } else {
      console.log('project_tasks table exists, checking columns...');
      
      // Get the columns of the existing table
      const columnsResult = await client.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks';
      `);
      
      const columns = columnsResult.rows;
      console.log('Existing columns:', columns.map(r => `${r.column_name} (${r.data_type})`).join(', '));
      
      // Check for project_id column data type
      const projectIdColumn = columns.find(row => row.column_name === 'project_id');
      
      // Check for foreign key constraints
      const constraintsResult = await client.query(`
        SELECT tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'project_tasks'
          AND tc.constraint_type = 'FOREIGN KEY';
      `);
      
      const constraints = constraintsResult.rows;
      console.log('Existing foreign key constraints:', constraints.map(c => c.constraint_name).join(', '));
      
      // Drop any existing foreign key constraints first
      for (const constraint of constraints) {
        console.log(`Dropping constraint ${constraint.constraint_name}...`);
        await client.query(`
          ALTER TABLE project_tasks
          DROP CONSTRAINT ${constraint.constraint_name};
        `);
      }
      
      // Now check if we need to alter the project_id column type
      if (projectIdColumn && (projectIdColumn.data_type === 'integer' || projectIdColumn.udt_name === 'int4')) {
        console.log('project_id column is integer type, recreating the table...');
        
        // Create a backup table
        await client.query(`
          CREATE TABLE project_tasks_backup AS
          SELECT * FROM project_tasks;
        `);
        console.log('Created backup table project_tasks_backup');
        
        // Get existing data from the table
        const dataResult = await client.query(`
          SELECT * FROM project_tasks;
        `);
        const existingData = dataResult.rows;
        console.log(`Found ${existingData.length} existing tasks`);
        
        // Drop the existing table
        await client.query(`
          DROP TABLE project_tasks;
        `);
        console.log('Dropped existing project_tasks table');
        
        // Recreate the table with correct types
        await client.query(`
          CREATE TABLE project_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL,
            title TEXT,
            description TEXT,
            factor_id TEXT,
            stage TEXT,
            status TEXT DEFAULT 'pending',
            due_date TIMESTAMP,
            assigned_to TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sort_order INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            task_notes TEXT,
            task_type TEXT DEFAULT 'custom',
            text TEXT,
            origin TEXT,
            source_id TEXT,
            notes TEXT,
            priority TEXT,
            owner TEXT
          );
          
          CREATE INDEX project_tasks_project_id_idx ON project_tasks(project_id);
          CREATE INDEX project_tasks_factor_id_idx ON project_tasks(factor_id);
          CREATE INDEX project_tasks_stage_idx ON project_tasks(stage);
          CREATE INDEX project_tasks_status_idx ON project_tasks(status);
        `);
        console.log('Recreated project_tasks table with correct schema');
        
        // Reinsert the data, converting integers to UUIDs where needed
        if (existingData.length > 0) {
          console.log('Attempting to restore task data...');
          
          for (const row of existingData) {
            try {
              // Try to convert the project_id from integer to UUID format
              // If it's already a UUID, this will still work
              let projectId;
              
              if (typeof row.project_id === 'number') {
                // For old integer IDs, we'll generate a deterministic UUID
                // based on the integer value to ensure consistency
                const uuidNamespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID namespace for URLs
                const intValue = row.project_id.toString();
                
                // This is a simple way to generate a UUID from an integer, but in production
                // you might want to use a proper UUID v5 generation library
                projectId = uuidNamespace.substring(0, 24) + intValue.padStart(12, '0');
              } else {
                // If it's already a string, use it directly
                projectId = row.project_id;
              }
              
              // Prepare the insert statement with all columns that might exist
              const insertSql = `
                INSERT INTO project_tasks (
                  id, project_id, text, title, description, factor_id, stage, 
                  origin, source_id, completed, notes, priority, due_date, 
                  owner, status, created_at, updated_at, sort_order, 
                  task_notes, task_type, assigned_to
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                  $14, $15, $16, $17, $18, $19, $20, $21
                )
              `;
              
              const params = [
                row.id || null,
                projectId,
                row.text || null,
                row.title || row.text || null, // Use text as title if no title exists
                row.description || null,
                row.factor_id || null,
                row.stage || null,
                row.origin || null,
                row.source_id || null,
                row.completed || false,
                row.notes || null,
                row.priority || null,
                row.due_date || null,
                row.owner || null,
                row.status || 'pending',
                row.created_at || new Date(),
                row.updated_at || new Date(),
                row.sort_order || 0,
                row.task_notes || null,
                row.task_type || 'custom',
                row.assigned_to || null
              ];
              
              await client.query(insertSql, params);
            } catch (error) {
              console.error(`Error restoring task ${row.id}:`, error.message);
            }
          }
          
          console.log('Data restoration completed');
        }
      } else if (projectIdColumn) {
        console.log(`project_id column already has correct type (${projectIdColumn.data_type}), no changes needed`);
        
        // Ensure we have all the needed columns
        const requiredColumns = [
          { name: 'text', type: 'TEXT' },
          { name: 'title', type: 'TEXT' },
          { name: 'description', type: 'TEXT' },
          { name: 'origin', type: 'TEXT' },
          { name: 'source_id', type: 'TEXT' },
          { name: 'task_notes', type: 'TEXT' },
          { name: 'task_type', type: 'TEXT', default: "'custom'" }
        ];
        
        for (const col of requiredColumns) {
          const exists = columns.some(c => c.column_name === col.name);
          if (!exists) {
            console.log(`Adding missing column: ${col.name}`);
            await client.query(`
              ALTER TABLE project_tasks 
              ADD COLUMN ${col.name} ${col.type} ${col.default ? `DEFAULT ${col.default}` : ''};
            `);
          }
        }
      } else {
        console.log('project_id column not found - unusual situation!');
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Successfully committed all schema changes');
    
    // Verify final table structure
    console.log('Verifying final table structure...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `);
    
    console.log('Final table structure:', 
      finalColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
      
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing project_tasks schema:', error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the fix
fixProjectTasksSchema()
  .then(() => {
    console.log('Schema fix script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Schema fix script failed:', error);
    process.exit(1);
  });