/**
 * Script to run the authentication system migration
 * - Converts user IDs from integer to text
 * - Converts project IDs from serial to UUID
 * - Updates related foreign key references
 */
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuthMigration() {
  console.log('Starting authentication system migration...');
  
  // Setup database connection
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set!');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  try {
    // Output the migration SQL to a file
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const migrationSql = `
    -- Alter projects table to use UUID instead of serial
    ALTER TABLE projects 
    ALTER COLUMN id TYPE uuid USING uuid_generate_v4();
    
    -- Alter success_factor_ratings table to use UUID for project_id references
    ALTER TABLE success_factor_ratings 
    ALTER COLUMN project_id TYPE uuid USING uuid_generate_v4();
    
    -- Alter plans table to use UUID for project_id references
    ALTER TABLE plans 
    ALTER COLUMN project_id TYPE uuid USING uuid_generate_v4();
    
    -- Update other foreign key constraints if needed
    `;
    
    const migrationFilePath = path.join(migrationsDir, 'auth_migration.sql');
    fs.writeFileSync(migrationFilePath, migrationSql);
    
    console.log('Migration SQL file created at', migrationFilePath);
    console.log('Migration SQL:');
    console.log(migrationSql);
    
    // Executing SQL directly
    console.log('Executing migration SQL...');
    await pool.query(`
      -- Make sure uuid-ossp extension is available
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Alter projects table to use UUID instead of serial
      ALTER TABLE IF EXISTS projects 
      ALTER COLUMN id TYPE uuid USING uuid_generate_v4();
      
      -- Alter success_factor_ratings table to use UUID for project_id references
      ALTER TABLE IF EXISTS success_factor_ratings 
      ALTER COLUMN project_id TYPE uuid USING uuid_generate_v4();
      
      -- Alter plans table to use UUID for project_id references
      ALTER TABLE IF EXISTS plans 
      ALTER COLUMN project_id TYPE uuid USING uuid_generate_v4();
    `);
    
    console.log('Authentication system migration completed successfully.');
  } catch (error) {
    console.error('Error during authentication system migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAuthMigration();