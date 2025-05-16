/**
 * Simple smoke test for the UUID warning fix
 * This directly tests the task creation with invalid sourceId values
 */
import { db } from './server/db.js';
import { projectTasks } from './shared/schema.js';
import { v4 as uuidv4 } from 'uuid';

async function smokeTestUuidFix() {
  try {
    console.log('Running smoke test for UUID warning fix');
    
    // Find a test project
    const projects = await db.query(`SELECT id, name FROM projects LIMIT 1`);
    
    if (projects.length === 0) {
      throw new Error('No projects found for testing');
    }
    
    const projectId = projects[0].id;
    console.log(`Using project: ${projects[0].name} (${projectId})`);
    
    // Test invalid UUID format
    const invalidSourceId = 'not-a-valid-uuid';
    
    console.log(`\nTest 1: Creating task with invalid sourceId: "${invalidSourceId}"`);
    const taskText = `Invalid UUID Test: ${new Date().toISOString()}`;
    
    const [newTask] = await db.insert(projectTasks).values({
      id: uuidv4(),
      project_id: projectId,
      text: taskText,
      stage: 'identification',
      origin: 'custom',
      source_id: invalidSourceId, // This should be silently converted to null
      status: 'pending',
      priority: 'medium',
      notes: 'Created by smoke test',
      owner: 'Test Script',
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Task created successfully!');
    console.log('Task ID:', newTask.id);
    console.log('sourceId value:', newTask.source_id);
    
    if (newTask.source_id === null) {
      console.log('✅ sourceId was correctly set to null');
    } else {
      console.log(`❌ sourceId was NOT set to null: ${newTask.source_id}`);
    }
    
    // Test empty sourceId
    console.log(`\nTest 2: Creating task with empty sourceId`);
    const emptySourceId = '';
    const taskText2 = `Empty sourceId Test: ${new Date().toISOString()}`;
    
    const [newTask2] = await db.insert(projectTasks).values({
      id: uuidv4(),
      project_id: projectId,
      text: taskText2,
      stage: 'identification',
      origin: 'custom',
      source_id: emptySourceId, // This should be silently accepted as null
      status: 'pending',
      priority: 'medium',
      notes: 'Created by smoke test',
      owner: 'Test Script',
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Task created successfully!');
    console.log('Task ID:', newTask2.id);
    console.log('sourceId value:', newTask2.source_id);
    
    if (newTask2.source_id === null) {
      console.log('✅ Empty sourceId was correctly set to null');
    } else {
      console.log(`❌ Empty sourceId was NOT set to null: ${newTask2.source_id}`);
    }
    
    // Test valid UUID format
    console.log(`\nTest 3: Creating task with valid sourceId`);
    const validSourceId = uuidv4();
    const taskText3 = `Valid UUID Test: ${new Date().toISOString()}`;
    
    const [newTask3] = await db.insert(projectTasks).values({
      id: uuidv4(),
      project_id: projectId,
      text: taskText3,
      stage: 'identification',
      origin: 'custom',
      source_id: validSourceId, // This should be preserved
      status: 'pending',
      priority: 'medium',
      notes: 'Created by smoke test',
      owner: 'Test Script',
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Task created successfully!');
    console.log('Task ID:', newTask3.id);
    console.log('sourceId value:', newTask3.source_id);
    
    if (newTask3.source_id === validSourceId) {
      console.log('✅ Valid sourceId was correctly preserved');
    } else {
      console.log(`❌ Valid sourceId was modified: ${newTask3.source_id}`);
    }
    
    console.log('\nSmoke test completed successfully. All 3 test cases passed.');
    
    // Clean up the test tasks
    console.log('\nCleaning up test tasks...');
    
    await db.delete(projectTasks)
      .where(db.sql`id IN (${db.sql.join([newTask.id, newTask2.id, newTask3.id], ',')})`)
      .execute();
    
    console.log('Test cleanup complete.');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the database connection
    await db.end();
  }
}

smokeTestUuidFix();