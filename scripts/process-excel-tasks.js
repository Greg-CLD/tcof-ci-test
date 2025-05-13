/**
 * Script to read tasks from Excel file and update the database
 */
import pkg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
const { Client } = pkg;

// Path to the Excel file
const excelFilePath = path.join(process.cwd(), 'attached_assets', 'Stage_1_4_Task_Breakdown Main.xlsx');

// Map of factor IDs to database IDs
const factorIdMap = {
  '1.1': 'sf-1',
  '1.2': 'sf-2',
  '1.3': 'sf-3',
  '1.4': 'sf-4',
  '2.1': 'sf-5',
  '2.2': 'sf-6',
  '3.1': 'sf-7',
  '3.2': 'sf-8',
  '3.3': 'sf-9',
  '4.1': 'sf-10',
  '4.2': 'sf-11',
  '4.3': 'sf-12'
};

// Stage mapping from "Stage X" format to our database enum
const stageMap = {
  'Stage 1': 'Identification',
  'Stage 2': 'Definition',
  'Stage 3': 'Delivery',
  'Stage 4': 'Closure'
};

async function processExcelAndUpdateDB() {
  // Check if the file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error(`Excel file not found at: ${excelFilePath}`);
    console.log('Files in attached_assets directory:');
    const files = fs.readdirSync(path.join(process.cwd(), 'attached_assets'));
    console.log(files);
    return;
  }

  console.log(`Reading Excel file from: ${excelFilePath}`);
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(excelFilePath);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Extracted ${excelData.length} rows from Excel`);
    
    // Extract tasks with mapping
    const tasks = [];
    
    // Process data - this will need to be adjusted based on actual Excel structure
    for (const row of excelData) {
      // Check for required fields (adjust field names based on your Excel structure)
      const stage = row.Stage;
      const factorId = row.FactorID;
      const task = row.Task;
      
      if (!stage || !factorId || !task) {
        console.log('Skipping row with missing data:', row);
        continue;
      }
      
      const dbFactorId = factorIdMap[factorId];
      const dbStage = stageMap[stage];
      
      if (!dbFactorId) {
        console.log(`Unknown factor ID: ${factorId}`);
        continue;
      }
      
      if (!dbStage) {
        console.log(`Unknown stage: ${stage}`);
        continue;
      }
      
      tasks.push({
        factorId: dbFactorId,
        stage: dbStage,
        task
      });
    }
    
    console.log(`Processed ${tasks.length} valid tasks`);
    
    // Display the first few tasks for verification
    console.log('Sample tasks:');
    tasks.slice(0, 5).forEach(task => console.log(task));
    
    // Update the database
    await updateDatabase(tasks);
    
  } catch (error) {
    console.error('Error processing Excel file:', error);
  }
}

async function updateDatabase(tasks) {
  // Create a database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');
    
    // Make a backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const backupResult = await client.query(
      "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM success_factor_tasks ORDER BY factor_id, stage, \"order\") t"
    );
    
    const backupData = backupResult.rows[0].json_agg;
    const backupPath = path.join(backupDir, `tasks_excel_update_${timestamp}.json`);
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Backup created at: ${backupPath}`);

    // Delete all existing tasks
    console.log('Deleting all existing tasks...');
    const deleteResult = await client.query('DELETE FROM success_factor_tasks');
    console.log(`Deleted ${deleteResult.rowCount} existing tasks`);

    // Group tasks by factor and stage for proper ordering
    const groupedTasks = {};
    tasks.forEach(task => {
      if (!groupedTasks[task.factorId]) {
        groupedTasks[task.factorId] = {};
      }
      
      if (!groupedTasks[task.factorId][task.stage]) {
        groupedTasks[task.factorId][task.stage] = [];
      }

      groupedTasks[task.factorId][task.stage].push(task.task);
    });

    // Insert tasks with proper ordering
    let insertedCount = 0;
    for (const factorId of Object.keys(groupedTasks)) {
      for (const stage of Object.keys(groupedTasks[factorId])) {
        const taskTexts = groupedTasks[factorId][stage];
        
        for (let i = 0; i < taskTexts.length; i++) {
          const taskText = taskTexts[i];
          const order = i;
          
          await client.query(
            'INSERT INTO success_factor_tasks (id, factor_id, stage, text, "order") VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), factorId, stage, taskText, order]
          );
          
          insertedCount++;
        }
      }
    }

    console.log(`Inserted ${insertedCount} new tasks`);

    // Verify count and stages
    const countResult = await client.query('SELECT COUNT(*) FROM success_factor_tasks');
    console.log(`Total tasks in database: ${countResult.rows[0].count}`);

    const stagesResult = await client.query('SELECT DISTINCT stage FROM success_factor_tasks ORDER BY stage');
    console.log('Available stages:');
    stagesResult.rows.forEach(row => {
      console.log(`- ${row.stage}`);
    });

    // Get a sample row for sf-1 in "Identification" stage
    const sampleResult = await client.query(
      'SELECT * FROM success_factor_tasks WHERE factor_id = $1 AND stage = $2 ORDER BY "order" LIMIT 1',
      ['sf-1', 'Identification']
    );

    if (sampleResult.rows.length > 0) {
      console.log('\nSample row for sf-1 in "Identification" stage:');
      console.log(sampleResult.rows[0]);
    } else {
      console.log('\nNo sample row found for sf-1 in "Identification" stage');
    }

  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    // Close the database connection
    await client.end();
    console.log('Disconnected from database');
  }
}

// Run the process
processExcelAndUpdateDB();