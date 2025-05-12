/**
 * Script to run migration for personal heuristics
 */

import pkg from 'pg';
const { Pool } = pkg;

// Use DATABASE_URL from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createPersonalHeuristicsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create personal_heuristics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS personal_heuristics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        favourite BOOLEAN DEFAULT FALSE,
        project_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    console.log('Successfully created personal_heuristics table');
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating personal_heuristics table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await createPersonalHeuristicsTable();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

run();