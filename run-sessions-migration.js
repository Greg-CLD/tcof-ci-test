/**
 * Script to create the sessions table for Replit Auth
 */
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

async function createSessionsTable() {
  console.log('Creating sessions table...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Check if the table already exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      );
    `);
    
    const tableExists = checkResult.rows[0].exists;
    
    if (tableExists) {
      console.log('Sessions table already exists.');
    } else {
      // Create the sessions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "sessions" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
        );
        CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
      `);
      
      console.log('Sessions table created successfully.');
    }
  } catch (error) {
    console.error('Error creating sessions table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createSessionsTable()
  .then(() => {
    console.log('Sessions migration completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Sessions migration failed:', error);
    process.exit(1);
  });