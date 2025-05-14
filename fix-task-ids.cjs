/**
 * Script to fix invalid task IDs in the database
 * Specifically handles task IDs that don't conform to UUID format
 */
const pg = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a new PostgreSQL client
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// UUID validation function
function isValidUUID(uuid) {
  const regexExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexExp.test(uuid);
}

// Generate a deterministic UUID based on a source ID
function generateDeterministicUUID(sourceId) {
  // Using a simple approach to generate a UUID-like string
  const base = '10000000-1000-4000-8000-100000000000';
  const combined = sourceId.replace(/[^a-zA-Z0-9]/g, '');
  
  // Pad the combined string or truncate if too long
  const paddedCombined = combined.padEnd(32, '0').substring(0, 32);
  
  // Insert the letters into the base UUID format
  return [
    paddedCombined.substring(0, 8),
    paddedCombined.substring(8, 12),
    paddedCombined.substring(12, 16),
    paddedCombined.substring(16, 20),
    paddedCombined.substring(20, 32)
  ].join('-');
}

async function fixTaskIds() {
  const client = await pool.connect();
  
  try {
    console.log('Starting task ID fix process...');
    
    // Check count of non-UUID task IDs in project_tasks
    const checkSql = `
      SELECT id FROM project_tasks
      WHERE id IS NOT NULL AND id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
    `;
    
    const { rows } = await client.query(checkSql);
    console.log(`Found ${rows.length} invalid task IDs`);
    
    // If we have invalid IDs, create a mapping and update them
    if (rows.length > 0) {
      // Start a transaction
      await client.query('BEGIN');
      
      // Create a mapping between old and new IDs
      const idMapping = {};
      for (const row of rows) {
        const oldId = row.id;
        const newId = generateDeterministicUUID(oldId);
        idMapping[oldId] = newId;
        
        console.log(`Mapping ${oldId} → ${newId}`);
      }
      
      // Update each task with a new UUID
      for (const [oldId, newId] of Object.entries(idMapping)) {
        const updateSql = `
          UPDATE project_tasks
          SET id = $1
          WHERE id = $2
          RETURNING id;
        `;
        
        const updateResult = await client.query(updateSql, [newId, oldId]);
        console.log(`Updated task ${oldId} to ${newId}: ${updateResult.rowCount} rows affected`);
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log('Task ID updates committed successfully');
    } else {
      console.log('No invalid task IDs found, no updates needed');
    }
    
    // Also fix sourceId column to match new UUID format where needed
    console.log('Checking sourceId columns...');
    const checkSourceIdSql = `
      SELECT id, source_id FROM project_tasks
      WHERE source_id IS NOT NULL AND source_id != '';
    `;
    
    const sourceIdRows = await client.query(checkSourceIdSql);
    console.log(`Found ${sourceIdRows.rows.length} tasks with sourceId values`);
    
    if (sourceIdRows.rows.length > 0) {
      // Start a transaction
      await client.query('BEGIN');
      
      let updatedCount = 0;
      for (const row of sourceIdRows.rows) {
        const sourceId = row.source_id;
        
        // If the sourceId looks like a success factor ID (e.g., "sf-1-abc123")
        // but is not a UUID, convert it
        if (sourceId && sourceId.startsWith('sf-') && !isValidUUID(sourceId)) {
          const newSourceId = generateDeterministicUUID(sourceId);
          
          const updateSourceIdSql = `
            UPDATE project_tasks
            SET source_id = $1
            WHERE id = $2;
          `;
          
          await client.query(updateSourceIdSql, [newSourceId, row.id]);
          updatedCount++;
          console.log(`Updated sourceId ${sourceId} → ${newSourceId} for task ${row.id}`);
        }
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      console.log(`Updated ${updatedCount} sourceId values to UUID format`);
    }
    
    console.log('Verifying database structure after fixes...');
    const checkProjectTasksTableSql = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'project_tasks'
      ORDER BY ordinal_position;
    `;
    
    const tableStructure = await client.query(checkProjectTasksTableSql);
    console.log('Current project_tasks table structure:');
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
    
    console.log('Fix process completed successfully');
    
  } catch (error) {
    // Rollback any ongoing transaction
    await client.query('ROLLBACK');
    console.error('Error fixing task IDs:', error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the fix
fixTaskIds()
  .then(() => {
    console.log('Task ID fix script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Task ID fix script failed:', error);
    process.exit(1);
  });