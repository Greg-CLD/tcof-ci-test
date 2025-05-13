const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Path to the Excel file
const excelFilePath = path.join(process.cwd(), 'attached_assets', 'Stage_1_4_Task_Breakdown Main.xlsx');

// Map of factor IDs to database IDs (adjust as needed based on your Excel data)
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
    const workbook = xlsx.readFile(excelFilePath);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const excelData = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Extracted ${excelData.length} rows from Excel`);
    
    // Dump first 2 rows to see the structure
    console.log('First 2 rows from Excel:');
    console.log(JSON.stringify(excelData.slice(0, 2), null, 2));
    
    // Extract tasks
    const tasks = [];
    
    // Process data - we'll adapt this based on the actual Excel structure we see
    for (const row of excelData) {
      // Log each row to see its structure
      console.log('Row:', JSON.stringify(row));
      
      // We'll need to determine the column names after seeing the actual data
      // For now, using placeholder names - we'll replace these after seeing the data
      const stage = row.Stage;
      const factorId = row.FactorID;
      const task = row.Task;
      
      if (stage && factorId && task) {
        const dbFactorId = factorIdMap[String(factorId)];
        const dbStage = stageMap[stage];
        
        if (dbFactorId && dbStage) {
          tasks.push({
            factorId: dbFactorId,
            stage: dbStage,
            task
          });
        } else {
          console.log(`Couldn't map row: factorId=${factorId}(${dbFactorId}), stage=${stage}(${dbStage})`);
        }
      } else {
        console.log('Row missing required fields');
      }
    }
    
    // Here we'll stop to examine the output before proceeding to database update
    console.log(`Processed ${tasks.length} valid tasks`);
    
    if (tasks.length > 0) {
      console.log('First few tasks:');
      tasks.slice(0, 5).forEach(task => console.log(task));
      
      // Get all column names to help debug
      const allKeys = new Set();
      excelData.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });
      console.log('All column names in Excel:', Array.from(allKeys));
      
      // Don't update the database until we've fixed the mapping
      console.log('Ready to update database. Comment out this return statement after confirming mapping is correct.');
      return;
      
      // Update the database
      // await updateDatabase(tasks);
    }
    
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