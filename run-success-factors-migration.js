/**
 * Script to create the success_factors and success_factor_tasks tables
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createSuccessFactorsTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    console.log('Connected to database');
    
    // Create stage enum type
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'success_factor_stage') THEN
          CREATE TYPE success_factor_stage AS ENUM ('Identification', 'Definition', 'Delivery', 'Closure');
        END IF;
      END$$;
    `);
    
    console.log('Created success_factor_stage enum if it did not exist');
    
    // Create success_factors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_factors (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    
    console.log('Created success_factors table');
    
    // Create success_factor_tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS success_factor_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        factor_id VARCHAR(36) NOT NULL,
        stage success_factor_stage NOT NULL,
        text TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT fk_success_factor FOREIGN KEY (factor_id) REFERENCES success_factors(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Created success_factor_tasks table');
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Error running migration:', err);
    throw err;
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

async function runMigration() {
  try {
    await createSuccessFactorsTables();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();