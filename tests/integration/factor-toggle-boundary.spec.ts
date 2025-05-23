import request from 'supertest';
import { app } from '../../server/app';
import { db } from '../../server/db';
import { projectTasks, projects } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

/**
 * Integration test for Success Factor task persistence with project boundaries
 * 
 * This test verifies that tasks with the same sourceId in different projects
 * are properly isolated and updates to a task in one project don't affect
 * tasks in other projects.
 */
describe('Success Factor Task Project Boundary', () => {
  let projectA: any = null;
  let projectB: any = null;
  let taskA: any = null;
  let taskB: any = null;
  const sharedSourceId = '2f565bf9-70c7-5c41-93e7-c6c4cde32312'; // Known Success Factor ID
  let authCookie: string;
  
  beforeAll(async () => {
    // Create auth session for API calls
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'greg@confluity.co.uk',
        password: 'Password123!' // Test account password
      });
    
    authCookie = loginResponse.headers['set-cookie'][0];
    
    // Create test projects
    const projectAId = uuidv4();
    const projectBId = uuidv4();
    
    await db.insert(projects).values({
      id: projectAId,
      userId: 3, // Test user ID
      name: 'Project A - Task Boundary Test',
      organisationId: 'ae92a764-de8c-4aad-ba82-45d686c46623',
      lastUpdated: new Date(),
      createdAt: new Date()
    });
    
    await db.insert(projects).values({
      id: projectBId,
      userId: 3, // Test user ID
      name: 'Project B - Task Boundary Test',
      organisationId: 'ae92a764-de8c-4aad-ba82-45d686c46623',
      lastUpdated: new Date(),
      createdAt: new Date()
    });
    
    // Get the projects from the database
    projectA = await db.query.projects.findFirst({
      where: eq(projects.id, projectAId)
    });
    
    projectB = await db.query.projects.findFirst({
      where: eq(projects.id, projectBId)
    });
    
    // Create identical Success Factor tasks in both projects with the same sourceId
    const taskAId = uuidv4();
    await db.insert(projectTasks).values({
      id: taskAId,
      projectId: projectA.id,
      text: 'Be Ready to Adapt - Task A',
      stage: 'identification',
      origin: 'factor',
      sourceId: sharedSourceId, // Same sourceId in both projects
      completed: false,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const taskBId = uuidv4();
    await db.insert(projectTasks).values({
      id: taskBId,
      projectId: projectB.id,
      text: 'Be Ready to Adapt - Task B',
      stage: 'identification', 
      origin: 'factor',
      sourceId: sharedSourceId, // Same sourceId in both projects
      completed: false,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Get the tasks from the database
    taskA = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskAId)
    });
    
    taskB = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskBId)
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    if (projectA) {
      await db.delete(projectTasks).where(eq(projectTasks.projectId, projectA.id));
      await db.delete(projects).where(eq(projects.id, projectA.id));
    }
    
    if (projectB) {
      await db.delete(projectTasks).where(eq(projectTasks.projectId, projectB.id));
      await db.delete(projects).where(eq(projects.id, projectB.id));
    }
  });
  
  it('should update a task in project A without affecting project B', async () => {
    // Update taskA using its ID (direct lookup should work)
    const updateA = await request(app)
      .put(`/api/projects/${projectA.id}/tasks/${taskA.id}`)
      .set('Cookie', authCookie)
      .send({
        completed: true,
        status: 'Done'
      });
    
    // Verify the update succeeded
    expect(updateA.status).toBe(200);
    
    // Fetch both tasks to verify states
    const updatedTaskA = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskA.id)
    });
    
    const updatedTaskB = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskB.id)
    });
    
    // taskA should be completed
    expect(updatedTaskA?.completed).toBe(true);
    expect(updatedTaskA?.status).toBe('Done');
    
    // taskB should remain unchanged
    expect(updatedTaskB?.completed).toBe(false);
    expect(updatedTaskB?.status).toBe('pending');
  });
  
  it('should reject update when using sourceId from wrong project', async () => {
    // Try to update taskA using sourceId but in project B's context
    // This should fail because the sourceId exists in project B but we're trying to 
    // update it in the context of project A
    const updateResponse = await request(app)
      .put(`/api/projects/${projectB.id}/tasks/${sharedSourceId}`)
      .set('Cookie', authCookie)
      .send({
        completed: true,
        status: 'Done'
      });
    
    // Should get a 404 error (not found) because of project boundary enforcement
    expect(updateResponse.status).toBe(404);
    
    // Fetch both tasks to verify states
    const updatedTaskA = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskA.id)
    });
    
    const updatedTaskB = await db.query.projectTasks.findFirst({
      where: eq(projectTasks.id, taskB.id)
    });
    
    // Both tasks should maintain their previous state
    expect(updatedTaskA?.completed).toBe(true); // From previous test
    expect(updatedTaskB?.completed).toBe(false); // Unchanged
  });
});