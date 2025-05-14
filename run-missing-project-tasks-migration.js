/**
 * Script to create the project_tasks table if it doesn't exist
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createProjectTasksTable() {
  try {
    console.log('Starting migration to create project_tasks table...');
    
    // Check if table exists
    const tableCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
      );
    `);
    
    const tableExists = tableCheck.rows && tableCheck.rows[0] && tableCheck.rows[0].exists;
    
    if (tableExists) {
      console.log('project_tasks table already exists. Migration not needed.');
      return;
    }

    // Read migration SQL from file
    const sqlPath = path.join(__dirname, 'migrations', 'create_project_tasks_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    console.log('Executing migration SQL...');
    await db.execute(sql);
    console.log('Migration completed successfully!');
    
    // Verify table was created
    const verifyCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks'
      );
    `);
    
    const verifyExists = verifyCheck.rows && verifyCheck.rows[0] && verifyCheck.rows[0].exists;
    
    if (verifyExists) {
      console.log('Verified project_tasks table now exists.');
    } else {
      console.error('Failed to create project_tasks table. Migration ran without errors but table does not exist.');
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  }
}

// Self-invoking async function
(async function run() {
  try {
    await createProjectTasksTable();
    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();