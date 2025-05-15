/**
 * Script to execute the project ID UUID migration
 * This script will execute each phase of the migration with verification
 * It's designed to be run in stages with proper error handling
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Connection details from DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Create a readline interface for user prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for confirmation before proceeding
function confirm(message) {
  return new Promise(resolve => {
    rl.question(`${message} (yes/no): `, answer => {
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Execute SQL file
async function executeSqlFile(client, filename) {
  console.log(`Executing SQL file: ${filename}`);
  const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8');
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`Successfully executed: ${filename}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error executing ${filename}:`, err);
    return false;
  }
}

// Verify database schema
async function verifySchema(client, phase) {
  console.log(`Verifying database schema after Phase ${phase}`);
  
  try {
    // Get column types for projects table
    const schemaQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
      ORDER BY ordinal_position
    `;
    
    const schemaResult = await client.query(schemaQuery);
    console.log('Projects table schema:');
    console.table(schemaResult.rows);
    
    // Verify data integrity
    if (phase === 1) {
      // After Phase 1, both id and uuid_id should exist
      const verifyQuery = `
        SELECT COUNT(*) AS count, 
               COUNT(id) AS id_count,
               COUNT(uuid_id) AS uuid_count
        FROM projects
      `;
      const verifyResult = await client.query(verifyQuery);
      console.log('Data verification after Phase 1:');
      console.table(verifyResult.rows);
      
      return verifyResult.rows[0].count === verifyResult.rows[0].uuid_count;
    } 
    else if (phase === 2) {
      // After Phase 2, primary key should be UUID
      const verifyQuery = `
        SELECT COUNT(*) AS count,
               COUNT(id) AS uuid_count,
               COUNT(legacy_id) AS legacy_count
        FROM projects
      `;
      const verifyResult = await client.query(verifyQuery);
      console.log('Data verification after Phase 2:');
      console.table(verifyResult.rows);
      
      // Verify foreign key references
      const refQuery = `
        SELECT 
          'Plans' AS table_name,
          COUNT(*) AS count,
          SUM(CASE WHEN p.id = pl.project_id THEN 1 ELSE 0 END) AS valid_refs
        FROM projects p
        JOIN plans pl ON p.id = pl.project_id
        
        UNION ALL
        
        SELECT 
          'Project Tasks' AS table_name,
          COUNT(*) AS count,
          SUM(CASE WHEN p.id = pt.project_id THEN 1 ELSE 0 END) AS valid_refs
        FROM projects p
        JOIN project_tasks pt ON p.id = pt.project_id
      `;
      
      const refResult = await client.query(refQuery);
      console.log('Foreign key verification after Phase 2:');
      console.table(refResult.rows);
      
      return verifyResult.rows[0].count === verifyResult.rows[0].uuid_count;
    }
    
    return true;
  } catch (err) {
    console.error(`Error verifying schema after Phase ${phase}:`, err);
    return false;
  }
}

// Main migration function
async function executeMigration(client, phase) {
  console.log(`\n=== STARTING PHASE ${phase} MIGRATION ===\n`);
  
  // Determine file names based on phase
  const migrationFile = `phase${phase}_production.sql`;
  const rollbackFile = `phase${phase}_production_rollback.sql`;
  
  // Execute migration
  const migrationSuccess = await executeSqlFile(client, migrationFile);
  if (!migrationSuccess) {
    console.error(`Phase ${phase} migration failed. Rolling back.`);
    await executeSqlFile(client, rollbackFile);
    return false;
  }
  
  // Verify schema
  const verificationSuccess = await verifySchema(client, phase);
  if (!verificationSuccess) {
    console.error(`Phase ${phase} verification failed. Consider rolling back.`);
    const shouldRollback = await confirm('Do you want to roll back this migration?');
    
    if (shouldRollback) {
      await executeSqlFile(client, rollbackFile);
      return false;
    }
  }
  
  console.log(`\n=== PHASE ${phase} MIGRATION COMPLETED SUCCESSFULLY ===\n`);
  return true;
}

// Main execution function
async function main() {
  console.log('=== PROJECT ID UUID MIGRATION UTILITY ===');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const phase = args[0] ? parseInt(args[0], 10) : 0;
  
  if (!phase || phase < 1 || phase > 3) {
    console.error('Please specify a valid migration phase (1, 2, or 3)');
    console.log('Usage: node execute_migration.js <phase>');
    process.exit(1);
  }
  
  // Connect to database
  const client = new Client({ connectionString: dbUrl });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Ask for confirmation
    const phaseDescriptions = {
      1: 'ADD UUID COLUMNS (non-destructive, minimal downtime)',
      2: 'SCHEMA TRANSFORMATION (requires downtime)',
      3: 'CLEANUP LEGACY COLUMNS (optional, perform after verification)'
    };
    
    console.log(`\nPHASE ${phase}: ${phaseDescriptions[phase]}`);
    const confirmation = await confirm(`Are you sure you want to execute Phase ${phase}?`);
    
    if (!confirmation) {
      console.log('Migration aborted by user');
      process.exit(0);
    }
    
    // Execute the requested phase
    const success = await executeMigration(client, phase);
    
    if (success) {
      if (phase < 3) {
        console.log(`\nPhase ${phase} completed. You can now proceed to Phase ${phase + 1}.`);
      } else {
        console.log('\nMigration process completed successfully.');
      }
    } else {
      console.log('\nMigration was not successful. Please check the logs and try again.');
    }
  } 
  catch (err) {
    console.error('Error during migration:', err);
  } 
  finally {
    rl.close();
    await client.end();
  }
}

// Run the script
main().catch(console.error);
