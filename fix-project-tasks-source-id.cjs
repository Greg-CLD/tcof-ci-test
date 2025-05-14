/**
 * Script to fix the source_id vs sourceId issues in the project_tasks table
 */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find all occurrences of source_id in projectsDb.ts and replace with sourceId
const filePath = path.join(__dirname, 'server', 'projectsDb.ts');

// Read the file content
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }
  
  // Replace all occurrences of projectTasksTable.source_id with projectTasksTable.sourceId
  let updatedContent = data.replace(/projectTasksTable\.source_id/g, 'projectTasksTable.sourceId');
  
  // Replace any source_id in task field names
  updatedContent = updatedContent.replace(/source_id:/g, 'sourceId:');
  updatedContent = updatedContent.replace(/"source_id":/g, '"sourceId":');
  
  // Write the updated content back to the file
  fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to the file:', err);
      return;
    }
    
    console.log('Successfully fixed source_id references in', filePath);
    
    // Also update the sourceId in the actual database column
    console.log('Checking database column names...');
    
    // Run a PostgreSQL query to check if source_id column exists and rename it if needed
    const dbQuery = `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='project_tasks' AND column_name='source_id'
        ) THEN
          ALTER TABLE project_tasks RENAME COLUMN source_id TO "sourceId";
          RAISE NOTICE 'Renamed source_id column to sourceId';
        ELSE
          RAISE NOTICE 'Column sourceId already exists or source_id does not exist';
        END IF;
      END
      $$;
    `;
    
    // Create a temporary SQL file with the query
    const sqlFilePath = path.join(__dirname, 'temp_rename_column.sql');
    fs.writeFileSync(sqlFilePath, dbQuery);
    
    // Run the SQL using the DATABASE_URL environment variable
    const command = `PGPASSWORD=${process.env.PGPASSWORD} psql "${process.env.DATABASE_URL}" -f ${sqlFilePath}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing SQL:', error);
        return;
      }
      
      console.log('SQL execution output:', stdout);
      
      if (stderr) {
        console.error('SQL execution errors:', stderr);
      }
      
      // Clean up the temporary SQL file
      fs.unlinkSync(sqlFilePath);
      
      console.log('Column rename operation completed');
    });
  });
});