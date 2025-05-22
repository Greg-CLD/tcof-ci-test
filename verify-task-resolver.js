/**
 * TaskIdResolver Verification Script
 * 
 * This script tests the TaskIdResolver service to ensure it correctly:
 * 1. Initializes with database connection
 * 2. Finds tasks by ID using multiple strategies
 * 3. Cleans and validates UUIDs properly
 */

// Import required modules
import pg from 'pg';
import * as uuid from 'uuid';

const { Pool } = pg;

// Create a database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper to log with timestamps
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Mock implementation of TaskIdResolver for testing
class TaskIdResolver {
  constructor(db) {
    if (!db) {
      throw new Error('TaskIdResolver requires database connection');
    }
    this.db = db;
    log('TaskIdResolver initialized with database connection');
  }

  async findTaskById(taskId, projectId) {
    if (!taskId || !projectId) {
      throw new Error('Task ID and Project ID are required');
    }

    log(`Looking up task ${taskId} for project ${projectId}`);

    // Strategy 1: Try exact match
    log('Strategy 1: Trying exact match');
    let query = `
      SELECT * FROM project_tasks 
      WHERE id::text = $1 AND project_id = $2
      LIMIT 1
    `;
    let result = await this.db.query(query, [taskId, projectId]);
    
    if (result.rows && result.rows.length > 0) {
      log(`Found task with exact ID match: ${taskId}`);
      return result.rows[0];
    }

    // Strategy 2: Try with clean UUID
    const cleanedId = TaskIdResolver.cleanUUID(taskId);
    if (cleanedId && cleanedId !== taskId) {
      log(`Strategy 2: Clean UUID lookup ${taskId} -> ${cleanedId}`);
      
      query = `
        SELECT * FROM project_tasks 
        WHERE id = $1 AND project_id = $2
        LIMIT 1
      `;
      result = await this.db.query(query, [cleanedId, projectId]);
      
      if (result.rows && result.rows.length > 0) {
        log(`Found task with clean UUID: ${cleanedId}`);
        return result.rows[0];
      }
    }

    // Strategy 3: Try to match by prefix
    log('Strategy 3: Trying prefix match');
    query = `
      SELECT * FROM project_tasks 
      WHERE (id::text LIKE $1 OR source_id::text LIKE $1)
      AND project_id = $2
      LIMIT 1
    `;
    result = await this.db.query(query, [`${cleanedId}%`, projectId]);
    
    if (result.rows && result.rows.length > 0) {
      log(`Found task with ID/sourceId prefix match: ${result.rows[0].id}`);
      return result.rows[0];
    }

    // Strategy 4: Look for Success Factor tasks by sourceId
    log('Strategy 4: Looking for Success Factor tasks by sourceId');
    query = `
      SELECT * FROM project_tasks 
      WHERE source_id::text = $1 
      AND project_id = $2
      AND (origin = 'factor' OR origin = 'success-factor')
      LIMIT 1
    `;
    result = await this.db.query(query, [cleanedId, projectId]);
    
    if (result.rows && result.rows.length > 0) {
      log(`Found Success Factor task by sourceId: ${result.rows[0].id}`);
      return result.rows[0];
    }

    log(`Task not found with any strategy: ${taskId}`);
    return null;
  }

  // Clean a UUID by extracting it from compound formats
  static cleanUUID(id) {
    if (!id) return id;
    
    // If it's already a valid UUID, return as is
    if (uuid.validate(id)) return id;
    
    // Try to extract a UUID
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = id.match(uuidPattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Try to extract a clean UUID by segments
    const segments = id.split('-');
    if (segments.length >= 5) {
      return segments.slice(0, 5).join('-');
    }
    
    return id;
  }

  // Instance method version
  cleanUUID(id) {
    return TaskIdResolver.cleanUUID(id);
  }
}

// Test function
async function testTaskIdResolver() {
  let client;
  
  try {
    log('Starting TaskIdResolver verification...');
    
    // Get a client from the pool
    client = await pool.connect();
    log('Database connection established');
    
    // Create a TaskIdResolver instance
    const resolver = new TaskIdResolver(client);
    log('Created TaskIdResolver with database connection');
    
    // Get a sample project and task IDs from database
    const projectResult = await client.query('SELECT id FROM projects LIMIT 1');
    if (!projectResult.rows || projectResult.rows.length === 0) {
      log('ERROR: No projects found in database');
      return;
    }
    
    const projectId = projectResult.rows[0].id;
    log(`Using project ID: ${projectId}`);
    
    // Get all tasks for this project
    const tasksResult = await client.query('SELECT * FROM project_tasks WHERE project_id = $1', [projectId]);
    log(`Found ${tasksResult.rows.length} tasks for project ${projectId}`);
    
    if (tasksResult.rows.length === 0) {
      log('WARNING: No tasks found for this project');
      return;
    }
    
    // Test with a regular task
    const regularTask = tasksResult.rows.find(t => t.origin !== 'factor' && t.origin !== 'success-factor');
    if (regularTask) {
      log('\n=== TEST 1: Find Regular Task by ID ===');
      const foundTask = await resolver.findTaskById(regularTask.id, projectId);
      log(`Test result: ${foundTask ? 'SUCCESS ✓' : 'FAILED ✗'}`);
      log(`Original ID: ${regularTask.id}`);
      log(`Found ID: ${foundTask ? foundTask.id : 'N/A'}`);
    }
    
    // Test with a Success Factor task if available
    const sfTask = tasksResult.rows.find(t => t.origin === 'factor' || t.origin === 'success-factor');
    if (sfTask) {
      log('\n=== TEST 2: Find Success Factor Task by ID ===');
      const foundTask = await resolver.findTaskById(sfTask.id, projectId);
      log(`Test result: ${foundTask ? 'SUCCESS ✓' : 'FAILED ✗'}`);
      log(`Original ID: ${sfTask.id}`);
      log(`Found ID: ${foundTask ? foundTask.id : 'N/A'}`);
      
      // Test finding by sourceId if available
      if (sfTask.source_id) {
        log('\n=== TEST 3: Find Success Factor Task by sourceId ===');
        const foundBySourceId = await resolver.findTaskById(sfTask.source_id, projectId);
        log(`Test result: ${foundBySourceId ? 'SUCCESS ✓' : 'FAILED ✗'}`);
        log(`Source ID: ${sfTask.source_id}`);
        log(`Found ID: ${foundBySourceId ? foundBySourceId.id : 'N/A'}`);
      }
    }
    
    // Test with a compound ID format
    if (sfTask) {
      log('\n=== TEST 4: Find Task with Compound ID ===');
      // Create a compound ID by adding a suffix
      const compoundId = `${sfTask.id}-compound-suffix`;
      const foundTask = await resolver.findTaskById(compoundId, projectId);
      log(`Test result: ${foundTask ? 'SUCCESS ✓' : 'FAILED ✗'}`);
      log(`Compound ID: ${compoundId}`);
      log(`Found ID: ${foundTask ? foundTask.id : 'N/A'}`);
    }
    
    log('\nTaskIdResolver verification complete');
    
  } catch (error) {
    log(`ERROR: ${error.message}`);
    console.error(error);
  } finally {
    if (client) {
      client.release();
      log('Database connection released');
    }
    
    // Close the pool
    await pool.end();
    log('Connection pool closed');
  }
}

// Run the test
testTaskIdResolver().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});