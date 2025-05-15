/**
 * Script to force PostgreSQL error by sending an empty string for date field
 */
import pg from 'pg';
const { Pool } = pg;
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

async function forceTaskError() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connected to database');
    
    const projectId = 'bc55c1a2-0cdf-4108-aa9e-44b44baea3b8';
    
    // Query to check if project exists
    const projectQuery = 'SELECT * FROM projects WHERE id = $1';
    const projectResult = await pool.query(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      console.error(`Project with ID ${projectId} not found`);
      return;
    }
    
    console.log(`Found project: ${JSON.stringify(projectResult.rows[0])}`);
    
    // Generate unique task ID
    const taskId = uuidv4();
    
    // Force PostgreSQL error by using empty string for due_date
    const insertQuery = `
      INSERT INTO project_tasks (
        id, project_id, title, stage, status, due_date, 
        created_at, updated_at, sort_order, completed, 
        text, origin, source_id, notes, priority, owner
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 
        $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `;
    
    const now = new Date();
    // DELIBERATELY using empty string for due_date to force error
    const insertValues = [
      taskId,                          // id
      projectId,                       // project_id
      'Error Test Task',               // title
      'identification',                // stage
      'pending',                       // status
      '',                             // due_date - ERROR!
      now,                             // created_at
      now,                             // updated_at
      0,                               // sort_order
      false,                           // completed
      'Force Error Test Task',         // text
      'custom',                        // origin
      'error-test',                    // source_id
      'Created by error test script',  // notes
      'medium',                        // priority
      'Debug System'                   // owner
    ];
    
    try {
      const result = await pool.query(insertQuery, insertValues);
      console.log('Task inserted successfully (unexpected):', result.rows[0]);
    } catch (error) {
      console.error('EXPECTED DATABASE ERROR:');
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error detail:', error.detail);
      console.error('Error hint:', error.hint);
      console.error('Error position:', error.position);
      console.error('Error table:', error.table);
      console.error('Error column:', error.column);
      console.error('Error dataType:', error.dataType);
      console.error('Error schema:', error.schema);
      console.error('Stack trace:', error.stack);
    }
    
    // Now let's print the task table schema with constraints
    const schemaQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM
        information_schema.columns
      WHERE
        table_name = 'project_tasks'
      ORDER BY
        ordinal_position;
    `;
    
    const constraintQuery = `
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints tc
      JOIN
        information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN
        information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE
        tc.table_name = 'project_tasks'
      ORDER BY
        tc.constraint_type, tc.constraint_name;
    `;
    
    // Get schema details
    const schemaResult = await pool.query(schemaQuery);
    console.log('\nDETAILED PROJECT TASKS TABLE SCHEMA:');
    console.table(schemaResult.rows);
    
    // Get constraint details
    const constraintResult = await pool.query(constraintQuery);
    console.log('\nPROJECT TASKS TABLE CONSTRAINTS:');
    console.table(constraintResult.rows);
    
    // Check for UUID generation in tasks table
    const checkUuidCreation = `
      SELECT pg_get_expr(d.adbin, d.adrelid) as default_expr
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef d ON (a.attrelid = d.adrelid AND a.attnum = d.adnum)
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'project_tasks' 
        AND a.attname = 'id'
        AND n.nspname = current_schema();
    `;
    
    const uuidResult = await pool.query(checkUuidCreation);
    console.log('\nUUID GENERATION DETAILS FOR TASK ID:');
    console.table(uuidResult.rows);
    
    // Verify projectId exists and is valid
    const projectIdCheckQuery = `
      SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1) as exists
    `;
    const projectIdResult = await pool.query(projectIdCheckQuery, [projectId]);
    console.log(`\nPROJECT ID EXISTS CHECK: ${projectIdResult.rows[0].exists}`);
    
    // Check projectId format 
    const projectIdFormatQuery = `
      SELECT
        id,
        char_length(id) AS length,
        id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AS is_uuid_format
      FROM
        projects
      WHERE
        id = $1
    `;
    const projectIdFormatResult = await pool.query(projectIdFormatQuery, [projectId]);
    console.log('\nPROJECT ID FORMAT CHECK:');
    console.table(projectIdFormatResult.rows);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    pool.end();
    console.log('Database connection closed');
  }
}

forceTaskError();