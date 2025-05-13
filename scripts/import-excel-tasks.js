/**
 * Script to import Excel task data from converted JSON file to database
 */
import { promises as fs } from 'fs';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const { Client } = pg;

// Path to the JSON file (converted from Excel)
const jsonFilePath = path.join(process.cwd(), 'temp', 'excel_data.json');

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

async function processJsonAndUpdateDB() {
  try {
    console.log(`Reading JSON file from: ${jsonFilePath}`);
    
    // Read the JSON file
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    // Get the sheet data (first sheet)
    const sheetName = Object.keys(jsonData)[0];
    console.log(`Processing sheet: ${sheetName}`);
    
    const sheetData = jsonData[sheetName];
    
    // The first row contains headers
    const headers = sheetData[0];
    console.log('Headers:', headers);
    
    // Process the data rows (skipping header)
    const tasks = [];
    
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      
      // Using the column indexes based on the headers
      const stage = row[0]; // Stage column
      const factorId = row[1]; // SF ID column
      const task = row[3]; // Task column
      
      if (stage && factorId && task) {
        const dbFactorId = factorIdMap[factorId];
        const dbStage = stageMap[stage];
        
        if (dbFactorId && dbStage) {
          tasks.push({
            factorId: dbFactorId,
            stage: dbStage,
            task
          });
        } else {
          console.log(`Mapping issue: factorId=${factorId}(${dbFactorId}), stage=${stage}(${dbStage})`);
        }
      } else {
        console.log(`Skipping row with missing data: ${JSON.stringify(row)}`);
      }
    }
    
    console.log(`Processed ${tasks.length} valid tasks`);
    
    if (tasks.length > 0) {
      console.log('First few tasks:');
      tasks.slice(0, 5).forEach(task => console.log(task));
      
      // Update the database
      await updateDatabase(tasks);
    } else {
      console.log('No valid tasks found');
    }
    
  } catch (error) {
    console.error('Error processing JSON file:', error);
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
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      console.log('Backup directory already exists');
    }
    
    const backupResult = await client.query(
      "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM success_factor_tasks ORDER BY factor_id, stage, \"order\") t"
    );
    
    const backupData = backupResult.rows[0].json_agg;
    const backupPath = path.join(backupDir, `tasks_excel_update_${timestamp}.json`);
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
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
processJsonAndUpdateDB();