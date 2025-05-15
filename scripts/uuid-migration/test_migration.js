/**
 * Test script for running the project ID migration on a test database
 * This script performs the following:
 * 1. Creates a test database from a production dump (if provided)
 * 2. Executes Phase 1 migration and logs results
 * 3. Executes Phase 2 migration and logs results
 * 4. Tests rollback functionality
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import pg from 'pg';

// Database connection configuration
const testDbConfig = {
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
};

// Script paths
const SCRIPT_DIR = path.join(process.cwd(), 'scripts', 'uuid-migration');
const PHASE1_MIGRATION = path.join(SCRIPT_DIR, 'phase1_migration.sql');
const PHASE1_ROLLBACK = path.join(SCRIPT_DIR, 'phase1_rollback.sql');
const PHASE2_MIGRATION = path.join(SCRIPT_DIR, 'phase2_migration.sql');
const PHASE2_ROLLBACK = path.join(SCRIPT_DIR, 'phase2_rollback.sql');
const LOG_FILE = path.join(SCRIPT_DIR, 'migration_test_log.txt');

// SQL queries for verification
const VERIFICATION_QUERIES = {
  checkSchema: `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name IN ('id', 'uuid_id')
  `,
  countProjects: `SELECT COUNT(*) FROM projects`,
  countRelatedTables: `
    SELECT 'project_tasks' AS table_name, COUNT(*) FROM project_tasks
    UNION ALL
    SELECT 'success_factor_ratings', COUNT(*) FROM success_factor_ratings
    UNION ALL
    SELECT 'personal_heuristics', COUNT(*) FROM personal_heuristics
    UNION ALL
    SELECT 'plans', COUNT(*) FROM plans
    UNION ALL
    SELECT 'outcome_progress', COUNT(*) FROM outcome_progress
  `,
  checkForeignKeys: `
    SELECT
      tc.table_name, kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY' AND (
      ccu.table_name = 'projects' OR 
      tc.table_name IN ('project_tasks', 'success_factor_ratings', 'personal_heuristics', 'plans', 'outcome_progress')
    )
  `,
};

// Helper functions
async function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry);
  await fs.appendFile(LOG_FILE, logEntry);
}

async function executeSqlFile(filePath, client) {
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    const startTime = Date.now();
    const result = await client.query(sql);
    const duration = Date.now() - startTime;
    return { success: true, duration, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runVerificationQuery(queryName, client) {
  try {
    const result = await client.query(VERIFICATION_QUERIES[queryName]);
    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runMigrationTest() {
  await logMessage('========== UUID MIGRATION TEST STARTED ==========');
  
  // Initialize log file
  await fs.writeFile(LOG_FILE, `UUID Migration Test Log - ${new Date().toISOString()}\n\n`);
  
  // Create database connection
  const client = new pg.Client(testDbConfig);
  
  try {
    await client.connect();
    await logMessage('Connected to test database');
    
    // Initial schema check and data snapshot
    await logMessage('Taking initial schema snapshot...');
    const initialSchema = await runVerificationQuery('checkSchema', client);
    await logMessage(`Initial schema: ${JSON.stringify(initialSchema.data, null, 2)}`);
    
    const initialCounts = await runVerificationQuery('countRelatedTables', client);
    await logMessage(`Initial record counts: ${JSON.stringify(initialCounts.data, null, 2)}`);
    
    // Execute Phase 1 Migration
    await logMessage('\n========== EXECUTING PHASE 1 MIGRATION ==========');
    const phase1Start = Date.now();
    const phase1Result = await executeSqlFile(PHASE1_MIGRATION, client);
    const phase1Duration = Date.now() - phase1Start;
    
    if (phase1Result.success) {
      await logMessage(`Phase 1 migration completed successfully in ${phase1Duration}ms`);
      
      // Verify Phase 1 results
      const phase1Schema = await runVerificationQuery('checkSchema', client);
      await logMessage(`Post-Phase 1 schema: ${JSON.stringify(phase1Schema.data, null, 2)}`);
      
      // Execute Phase 2 Migration
      await logMessage('\n========== EXECUTING PHASE 2 MIGRATION ==========');
      const phase2Start = Date.now();
      const phase2Result = await executeSqlFile(PHASE2_MIGRATION, client);
      const phase2Duration = Date.now() - phase2Start;
      
      if (phase2Result.success) {
        await logMessage(`Phase 2 migration completed successfully in ${phase2Duration}ms`);
        
        // Verify Phase 2 results
        const phase2Schema = await runVerificationQuery('checkSchema', client);
        await logMessage(`Post-Phase 2 schema: ${JSON.stringify(phase2Schema.data, null, 2)}`);
        
        const finalForeignKeys = await runVerificationQuery('checkForeignKeys', client);
        await logMessage(`Final foreign key relationships: ${JSON.stringify(finalForeignKeys.data, null, 2)}`);
        
        const finalCounts = await runVerificationQuery('countRelatedTables', client);
        await logMessage(`Final record counts: ${JSON.stringify(finalCounts.data, null, 2)}`);
        
        // Test the rollback scripts
        await logMessage('\n========== TESTING PHASE 2 ROLLBACK ==========');
        const rollback2Start = Date.now();
        const rollback2Result = await executeSqlFile(PHASE2_ROLLBACK, client);
        const rollback2Duration = Date.now() - rollback2Start;
        
        if (rollback2Result.success) {
          await logMessage(`Phase 2 rollback completed successfully in ${rollback2Duration}ms`);
          
          // Verify Phase 2 rollback results
          const rollback2Schema = await runVerificationQuery('checkSchema', client);
          await logMessage(`Post-Phase 2 rollback schema: ${JSON.stringify(rollback2Schema.data, null, 2)}`);
          
          await logMessage('\n========== TESTING PHASE 1 ROLLBACK ==========');
          const rollback1Start = Date.now();
          const rollback1Result = await executeSqlFile(PHASE1_ROLLBACK, client);
          const rollback1Duration = Date.now() - rollback1Start;
          
          if (rollback1Result.success) {
            await logMessage(`Phase 1 rollback completed successfully in ${rollback1Duration}ms`);
            
            // Verify Phase 1 rollback results
            const finalSchema = await runVerificationQuery('checkSchema', client);
            await logMessage(`Final schema after rollbacks: ${JSON.stringify(finalSchema.data, null, 2)}`);
            
            const finalCounts = await runVerificationQuery('countRelatedTables', client);
            await logMessage(`Final record counts after rollbacks: ${JSON.stringify(finalCounts.data, null, 2)}`);
            
            await logMessage('\n========== MIGRATION TEST SUMMARY ==========');
            await logMessage(`Phase 1 Migration time: ${phase1Duration}ms`);
            await logMessage(`Phase 2 Migration time: ${phase2Duration}ms`);
            await logMessage(`Total Migration time: ${phase1Duration + phase2Duration}ms`);
            await logMessage(`Phase 2 Rollback time: ${rollback2Duration}ms`);
            await logMessage(`Phase 1 Rollback time: ${rollback1Duration}ms`);
            await logMessage(`Total Rollback time: ${rollback1Duration + rollback2Duration}ms`);
            await logMessage('Migration test completed successfully');
          } else {
            await logMessage(`ERROR: Phase 1 rollback failed: ${rollback1Result.error}`);
          }
        } else {
          await logMessage(`ERROR: Phase 2 rollback failed: ${rollback2Result.error}`);
        }
      } else {
        await logMessage(`ERROR: Phase 2 migration failed: ${phase2Result.error}`);
      }
    } else {
      await logMessage(`ERROR: Phase 1 migration failed: ${phase1Result.error}`);
    }
  } catch (error) {
    await logMessage(`ERROR: Test failed with exception: ${error.message}`);
    console.error(error);
  } finally {
    await client.end();
    await logMessage('Database connection closed');
    await logMessage('========== UUID MIGRATION TEST COMPLETED ==========');
  }
}

// Run the test
runMigrationTest().catch(console.error);