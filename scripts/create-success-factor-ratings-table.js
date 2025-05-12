/**
 * Script to create the success_factor_ratings table directly using postgres
 */
import pg from 'pg';
const { Pool } = pg;

// Get the connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Replit's Neon Postgres
});

async function createSuccessFactorRatingsTable() {
  console.log('Running migration: Create success_factor_ratings table');
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Create extension for UUID support
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create the success_factor_ratings table with UUID primary key
    // IMPORTANT: project_id is INTEGER to match projects.id which is INTEGER
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_factor_ratings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        factor_id VARCHAR(255) NOT NULL,
        resonance INTEGER NOT NULL CHECK (resonance >= 1 AND resonance <= 5),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, factor_id)
      )
    `);
    
    // Create index for faster lookups by project
    await client.query('CREATE INDEX IF NOT EXISTS idx_success_factor_ratings_project ON success_factor_ratings(project_id)');
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration successful: success_factor_ratings table created');
    return true;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error creating success_factor_ratings table:', error);
    return false;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

async function verifyTable() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'success_factor_ratings'
      )
    `);
    
    const tableExists = result.rows[0].exists;
    console.log(`Table verification: success_factor_ratings ${tableExists ? 'exists' : 'does not exist'}`);
    
    if (tableExists) {
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'success_factor_ratings'
      `);
      
      console.log('Table structure:');
      columns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    return tableExists;
  } catch (error) {
    console.error('Error verifying table:', error);
    return false;
  } finally {
    client.release();
  }
}

// Run the migration
async function main() {
  try {
    // Check if the table already exists
    const exists = await verifyTable();
    
    if (exists) {
      console.log('✅ Table already exists, no migration needed');
    } else {
      // Create the table
      const success = await createSuccessFactorRatingsTable();
      
      if (success) {
        console.log('✅ Migration completed successfully');
        // Verify the table was created
        await verifyTable();
      } else {
        console.error('❌ Migration failed');
        process.exit(1);
      }
    }
    
    // Close the pool
    await pool.end();
  } catch (error) {
    console.error('❌ Script failed with error:', error);
    process.exit(1);
  }
}

main();