/**
 * Diagnostic for column case sensitivity issues between code and database
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pg;

async function main() {
  try {
    console.log('=== Database Schema vs Code Column Names Diagnostic ===');
    
    // Connect to the database
    console.log('Connecting to database...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    console.log('✅ Connected to database');
    
    // Get the database column names
    console.log('\nChecking project_tasks table schema...');
    const schemaResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      ORDER BY ordinal_position
    `);
    
    console.log('Table columns (actual DB schema):');
    const dbColumns = schemaResult.rows.map(col => col.column_name);
    dbColumns.forEach(col => {
      console.log(`- ${col}`);
    });
    
    // Try to find a Success Factor task
    console.log('\nTrying direct SQL query with snake_case column names...');
    const tasksResult = await client.query(`
      SELECT id, text, completed, origin, source_id, project_id 
      FROM project_tasks 
      WHERE origin = 'factor' OR origin = 'success-factor'
      LIMIT 5
    `);
    
    if (tasksResult.rows.length === 0) {
      console.log('❌ No Success Factor tasks found');
      await client.end();
      return;
    }
    
    // Display the tasks
    console.log(`Found ${tasksResult.rows.length} Success Factor tasks:`);
    tasksResult.rows.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id} | Origin: ${task.origin} | source_id: ${task.source_id}`);
    });
    
    // Try to update a task
    const taskToUpdate = tasksResult.rows[0];
    console.log(`\nSelected task for testing: ${taskToUpdate.id}`);
    console.log(`Initial state: completed=${taskToUpdate.completed}, origin=${taskToUpdate.origin}`);
    
    console.log('\nDirectly updating task in database with snake_case column names...');
    const newStatus = !taskToUpdate.completed;
    
    const updateResult = await client.query(`
      UPDATE project_tasks 
      SET completed = $1, 
          status = $2,
          updated_at = NOW()
      WHERE id = $3 AND project_id = $4
      RETURNING id, completed, status, updated_at
    `, [newStatus, newStatus ? 'Done' : 'To Do', taskToUpdate.id, taskToUpdate.project_id]);
    
    if (updateResult.rows.length === 0) {
      console.log('❌ Database update failed - no rows returned');
    } else {
      console.log('✅ Database update successful:');
      console.log(`Task ${updateResult.rows[0].id} updated to completed=${updateResult.rows[0].completed}`);
      console.log(`Updated at: ${updateResult.rows[0].updated_at}`);
    }
    
    // Now check if the update is actually persisted
    console.log('\nVerifying task state after direct update...');
    const verifyResult = await client.query(`
      SELECT id, text, completed, status, origin, updated_at
      FROM project_tasks
      WHERE id = $1
    `, [taskToUpdate.id]);
    
    if (verifyResult.rows.length === 0) {
      console.log('❌ Task not found after update!');
    } else {
      const updatedTask = verifyResult.rows[0];
      console.log('Task after update:');
      console.log(`ID: ${updatedTask.id}`);
      console.log(`Completed: ${updatedTask.completed}`);
      console.log(`Status: ${updatedTask.status}`);
      console.log(`Origin: ${updatedTask.origin}`);
      console.log(`Updated At: ${updatedTask.updated_at}`);
      
      if (updatedTask.completed === newStatus) {
        console.log('✅ Task completion status was correctly updated in the database');
      } else {
        console.log('❌ Task completion status was NOT updated correctly in the database');
      }
    }
    
    console.log('\nNow examining the code in server/routes.ts to see column name usage...');
    
    await client.end();
    console.log('\n=== Diagnostic Complete ===');
    
  } catch (error) {
    console.error('Error during diagnostic:', error);
  }
}

main();