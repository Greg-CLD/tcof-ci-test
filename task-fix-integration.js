/**
 * Task Persistence Fix Integration
 * 
 * This script exports an integrated version of our task persistence fix that can be
 * imported directly into the server/index.ts file.
 */

/**
 * Maps camelCase property names to snake_case database column names
 * 
 * @param {Object} data The task data with camelCase properties
 * @returns {Object} An object with snake_case property names for database
 */
function mapCamelToSnakeCase(data) {
  const updateData = {};
  
  // Direct field mappings (no conversion needed)
  if (data.text !== undefined) updateData.text = data.text;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.origin !== undefined) updateData.origin = data.origin;
  if (data.notes !== undefined) updateData.notes = data.notes === '' ? null : data.notes;
  if (data.priority !== undefined) updateData.priority = data.priority === '' ? null : data.priority;
  if (data.owner !== undefined) updateData.owner = data.owner === '' ? null : data.owner;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.completed !== undefined) updateData.completed = Boolean(data.completed);
  
  // CamelCase to snake_case mappings
  if (data.sourceId !== undefined) updateData.source_id = data.sourceId;
  if (data.projectId !== undefined) updateData.project_id = data.projectId;
  if (data.dueDate !== undefined) updateData.due_date = data.dueDate === '' ? null : data.dueDate;
  
  // Additional fields
  if (data.taskType !== undefined) updateData.task_type = data.taskType === '' ? null : data.taskType;
  if (data.factorId !== undefined) updateData.factor_id = data.factorId === '' ? null : data.factorId;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo === '' ? null : data.assignedTo;
  if (data.taskNotes !== undefined) updateData.task_notes = data.taskNotes === '' ? null : data.taskNotes;
  
  // Always update the updatedAt timestamp
  updateData.updated_at = new Date();
  
  return updateData;
}

/**
 * Apply the task persistence fix to Express app
 * 
 * @param {Object} app Express application instance 
 * @param {Object} db Database connection
 * @param {Object} projectTasksTable Project tasks table schema
 * @param {Object} eq Equal operator from drizzle-orm
 */
function applyTaskPersistenceFix(app, db, projectTasksTable, eq) {
  console.log('[FIX] Setting up task persistence fix middleware');
  
  // Intercept PUT requests to the task update endpoint
  app.use('/api/projects/:projectId/tasks/:taskId', async (req, res, next) => {
    if (req.method !== 'PUT') {
      // Only process PUT requests
      return next();
    }
    
    // Log the interception
    console.log(`[FIX] Intercepted task update: ${req.params.projectId}/${req.params.taskId}`);
    console.log(`[FIX] Task data:`, req.body);
    
    try {
      // First check if the task exists
      const taskId = req.params.taskId;
      const tasks = await db.select()
        .from(projectTasksTable)
        .where(eq(projectTasksTable.id, taskId))
        .limit(1);
      
      // If task not found by direct ID, try source_id lookup
      if (tasks.length === 0) {
        console.log(`[FIX] Task not found by direct ID, trying sourceId lookup: ${taskId}`);
        
        const sourceIdTasks = await db.select()
          .from(projectTasksTable)
          .where(eq(projectTasksTable.sourceId, taskId))
          .limit(1);
        
        if (sourceIdTasks.length === 0) {
          console.log(`[FIX] Task not found by sourceId either`);
          return res.status(404).json({
            error: 'Task not found',
            taskId: taskId
          });
        }
        
        // Use the actual ID from the database
        const actualTaskId = sourceIdTasks[0].id;
        console.log(`[FIX] Found task via sourceId, actual ID: ${actualTaskId}`);
        
        // Update with properly mapped data
        const mappedData = mapCamelToSnakeCase(req.body);
        console.log(`[FIX] Mapped update data:`, mappedData);
        
        // Execute the update with the actual ID
        const [updatedTask] = await db.update(projectTasksTable)
          .set(mappedData)
          .where(eq(projectTasksTable.id, actualTaskId))
          .returning();
        
        // Convert back to camelCase for the API response
        const response = {
          id: updatedTask.id,
          projectId: updatedTask.project_id,
          text: updatedTask.text || '',
          stage: updatedTask.stage || 'identification',
          origin: updatedTask.origin || 'custom',
          source: updatedTask.origin || 'custom',
          sourceId: updatedTask.source_id || '',
          completed: Boolean(updatedTask.completed),
          notes: updatedTask.notes || '',
          priority: updatedTask.priority || '',
          dueDate: updatedTask.due_date || '',
          owner: updatedTask.owner || '',
          status: updatedTask.status || 'To Do',
          createdAt: updatedTask.created_at ? new Date(updatedTask.created_at).toISOString() : new Date().toISOString(),
          updatedAt: updatedTask.updated_at ? new Date(updatedTask.updated_at).toISOString() : new Date().toISOString()
        };
        
        console.log(`[FIX] Task updated successfully via sourceId lookup`);
        return res.status(200).json(response);
      }
      
      // Task found by direct ID, proceed with normal update
      console.log(`[FIX] Task found by direct ID lookup`);
      
      // Map camelCase properties to snake_case database columns
      const mappedData = mapCamelToSnakeCase(req.body);
      console.log(`[FIX] Mapped update data:`, mappedData);
      
      // Execute the update with proper mapping
      const [updatedTask] = await db.update(projectTasksTable)
        .set(mappedData)
        .where(eq(projectTasksTable.id, taskId))
        .returning();
      
      if (!updatedTask) {
        console.error(`[FIX] Update failed for task ${taskId}`);
        return res.status(500).json({
          error: 'Failed to update task',
          taskId: taskId
        });
      }
      
      // Convert back to camelCase for the API response
      const response = {
        id: updatedTask.id,
        projectId: updatedTask.project_id,
        text: updatedTask.text || '',
        stage: updatedTask.stage || 'identification',
        origin: updatedTask.origin || 'custom',
        source: updatedTask.origin || 'custom',
        sourceId: updatedTask.source_id || '',
        completed: Boolean(updatedTask.completed),
        notes: updatedTask.notes || '',
        priority: updatedTask.priority || '',
        dueDate: updatedTask.due_date || '',
        owner: updatedTask.owner || '',
        status: updatedTask.status || 'To Do',
        createdAt: updatedTask.created_at ? new Date(updatedTask.created_at).toISOString() : new Date().toISOString(),
        updatedAt: updatedTask.updated_at ? new Date(updatedTask.updated_at).toISOString() : new Date().toISOString()
      };
      
      console.log(`[FIX] Task updated successfully:`, response);
      return res.status(200).json(response);
    } catch (error) {
      console.error(`[FIX] Error in task update middleware:`, error);
      return res.status(500).json({
        error: 'Internal server error', 
        message: error.message || 'Failed to update task'
      });
    }
  });
  
  console.log('[FIX] Task persistence fix applied successfully');
}