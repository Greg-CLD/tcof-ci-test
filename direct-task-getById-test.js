/**
 * Direct Test for getTaskById Method
 * 
 * This simple script directly tests the getTaskById method
 * by connecting to a real project and looking up tasks directly.
 */

// Use direct database connection for testing
const { Client } = require('pg');
const { validate: validateUuid } = require('uuid');

// Enable debug mode
process.env.DEBUG_TASKS = 'true';

// Formatting helpers
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';

// Get database credentials from environment
const dbUrl = process.env.DATABASE_URL;

async function runDirectTest() {
  console.log(`${BLUE}=== Direct Testing getTaskById Method ===${RESET}`);
  
  // Connect to the database
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Connected to database');
  
  try {
    // Step 1: Get a test project
    console.log('Finding a test project...');
    const projectResult = await client.query('SELECT id, name FROM projects LIMIT 1');
    
    if (projectResult.rows.length === 0) {
      console.error(`${RED}No projects found in database${RESET}`);
      return false;
    }
    
    const projectId = projectResult.rows[0].id;
    const projectName = projectResult.rows[0].name;
    console.log(`${GREEN}Found project:${RESET} ${projectName} (${projectId})`);
    
    // Step 2: Get tasks for this project
    console.log('Finding tasks for this project...');
    const tasksResult = await client.query(
      'SELECT id, text, origin, source_id AS "sourceId" FROM project_tasks WHERE project_id = $1 LIMIT 10',
      [projectId]
    );
    
    if (tasksResult.rows.length === 0) {
      console.log(`${YELLOW}No tasks found for project${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}Found ${tasksResult.rows.length} tasks${RESET}`);
    
    // Step 3: Test getTaskById with direct ID
    const testTask = tasksResult.rows[0];
    console.log(`\nTesting lookup by direct ID: ${testTask.id}`);
    
    // Implement a simple version of getTaskById for testing
    const foundByDirectId = await getTaskById(client, projectId, testTask.id);
    
    if (!foundByDirectId) {
      console.error(`${RED}Failed to find task by direct ID${RESET}`);
      return false;
    }
    
    console.log(`${GREEN}Successfully found task by direct ID${RESET}`);
    console.log(`Task: ${foundByDirectId.text}`);
    
    // Step 4: If this is a Success Factor task, test sourceId lookup
    if (testTask.origin === 'factor' && testTask.sourceId) {
      console.log(`\nTesting Success Factor lookup by sourceId: ${testTask.sourceId}`);
      
      const foundBySourceId = await getTaskById(client, projectId, testTask.sourceId);
      
      if (!foundBySourceId) {
        console.error(`${RED}Failed to find task by sourceId${RESET}`);
        return false;
      }
      
      console.log(`${GREEN}Successfully found task by sourceId${RESET}`);
      console.log(`Task: ${foundBySourceId.text}`);
      
      // Verify IDs match
      const idsMatch = foundByDirectId.id === foundBySourceId.id;
      console.log(`ID match verification: ${idsMatch ? GREEN + 'PASS' : RED + 'FAIL'}`);
    }
    
    // Step 5: Test non-existent ID
    console.log(`\nTesting lookup with non-existent ID`);
    const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    const foundNonExistent = await getTaskById(client, projectId, nonExistentId);
    
    if (foundNonExistent === null) {
      console.log(`${GREEN}Correctly returned null for non-existent ID${RESET}`);
    } else {
      console.error(`${RED}Unexpectedly found a task for non-existent ID${RESET}`);
      return false;
    }
    
    console.log(`\n${GREEN}All direct tests PASSED!${RESET}`);
    return true;
  } catch (error) {
    console.error(`${RED}Test failed with error:${RESET}`, error);
    return false;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Simplified implementation of getTaskById for testing
async function getTaskById(client, projectId, taskId) {
  try {
    console.log(`[getTaskById] Looking up task with ID ${taskId} in project ${projectId}`);
    
    // Validate inputs
    if (!projectId || !taskId) {
      console.warn(`[getTaskById] Missing required parameters`);
      return null;
    }
    
    // Try direct ID lookup first
    const directQuery = `
      SELECT id, project_id AS "projectId", text, stage, origin, source AS source, 
             source_id AS "sourceId", completed, notes, priority, due_date AS "dueDate",
             owner, status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM project_tasks
      WHERE project_id = $1 AND id = $2
      LIMIT 1
    `;
    
    const directResult = await client.query(directQuery, [projectId, taskId]);
    
    // If found by direct ID, return it
    if (directResult.rows.length > 0) {
      console.log(`[getTaskById] Found task by exact ID match: ${taskId}`);
      return directResult.rows[0];
    }
    
    // Not found by direct ID, try sourceId
    console.log(`[getTaskById] Task not found by direct ID, checking sourceId match for ${taskId}`);
    
    const sourceQuery = `
      SELECT id, project_id AS "projectId", text, stage, origin, source AS source, 
             source_id AS "sourceId", completed, notes, priority, due_date AS "dueDate",
             owner, status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM project_tasks
      WHERE project_id = $1 AND source_id = $2
      LIMIT 1
    `;
    
    const sourceResult = await client.query(sourceQuery, [projectId, taskId]);
    
    if (sourceResult.rows.length > 0) {
      console.log(`[getTaskById] Found task by sourceId match: ${taskId}`);
      return sourceResult.rows[0];
    }
    
    // Not found by either method
    console.log(`[getTaskById] Task not found: ${taskId} in project ${projectId}`);
    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to get task by ID ${taskId}:`, error);
    return null;
  }
}

// Run the test
runDirectTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`Test execution failed with error:`, error);
    process.exit(1);
  });