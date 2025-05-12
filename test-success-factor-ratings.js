/**
 * Test script to verify success factor ratings functionality
 * This script uses SQL queries to check the database schema
 */

import { Client } from 'pg';

async function testSuccessFactorRatings() {
  // Create a new PostgreSQL client
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('🧪 Starting success factor ratings test');
    
    // Connect to the database
    await client.connect();
    console.log('✅ Connected to database');
    
    // Step 1: Check if the table exists
    console.log('🔍 Checking if success_factor_ratings table exists...');
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'success_factor_ratings'
      ) as exists
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.error('❌ Table success_factor_ratings does not exist!');
      return;
    }
    
    console.log('✅ Table success_factor_ratings exists');
    
    // Step 2: Check table schema
    console.log('🔍 Checking table schema...');
    const schemaResults = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'success_factor_ratings'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table schema:');
    schemaResults.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Step 3: Get the project_id column type specifically
    const projectIdTypeResult = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'success_factor_ratings' AND column_name = 'project_id'
    `);
    
    if (projectIdTypeResult.rows.length > 0) {
      const dataType = projectIdTypeResult.rows[0].data_type;
      console.log(`✅ project_id column type: ${dataType}`);
      
      // Check if our schema.ts definition matches the actual type
      if (dataType === 'integer') {
        console.log('✅ Schema definition matches database (integer)');
      } else {
        console.error(`❌ Schema type mismatch! Database uses ${dataType} but schema.ts defines it as integer`);
      }
    } else {
      console.error('❌ project_id column not found in success_factor_ratings table!');
    }
    
    // Check projects table too
    const projectsTableCheck = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'id'
    `);
    
    if (projectsTableCheck.rows.length > 0) {
      const projectIdType = projectsTableCheck.rows[0].data_type;
      console.log(`✅ projects.id column type: ${projectIdType}`);
    }
    
    console.log('🎉 Schema verification complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Database connection closed');
  }
}

testSuccessFactorRatings();