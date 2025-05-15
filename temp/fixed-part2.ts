  createTask: async (taskData: Partial<ProjectTask>): Promise<ProjectTask | null> => {
    if (!taskData.projectId) {
      console.error('Cannot create task: missing projectId');
      return null;
    }
    
    console.log('Validating task data:', {
      projectId: taskData.projectId,
      text: taskData.text,
      stage: taskData.stage,
      hasId: !!taskData.id
    });

    try {
      const normalizedProjectId = validateProjectUUID(taskData.projectId);
      console.log(`Creating task for normalized project ID: ${normalizedProjectId}`);
      
      // Convert empty values to appropriate defaults
      const task: ProjectTask = {
        id: taskData.id || uuidv4(),
        projectId: normalizedProjectId,
        text: taskData.text || '',
        stage: taskData.stage || 'identification',
        origin: taskData.origin || 'custom',
        sourceId: taskData.sourceId || '',
        completed: taskData.completed || false,
        notes: taskData.notes || '',
        priority: taskData.priority || '',
        dueDate: taskData.dueDate || '',
        owner: taskData.owner || '',
        status: taskData.status || 'To Do',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Task object prepared for insert:', JSON.stringify(task, null, 2));
      
      // Save the task to the database using Drizzle insert
      console.log('Starting database insert operation');
      
      // Properly sanitize values for database insertion:
      // 1. Convert empty strings to null for any nullable fields
      // 2. Ensure dates are handled correctly
      const insertValues = {
        id: task.id,
        projectId: task.projectId,
        text: task.text || '',
        stage: task.stage || 'identification',
        origin: task.origin || 'custom',
        sourceId: task.sourceId || '',
        completed: Boolean(task.completed), 
        // Handle possible empty strings by converting them to null
        notes: task.notes === '' ? null : task.notes,
        priority: task.priority === '' ? null : task.priority,
        dueDate: task.dueDate === '' ? null : task.dueDate,
        owner: task.owner === '' ? null : task.owner,
        status: task.status || 'To Do',
        createdAt: new Date(),  // Always use current date
        updatedAt: new Date()   // Always use current date
      };
      console.log('Insert values:', JSON.stringify(insertValues, null, 2));
      
      const [savedTask] = await db.insert(projectTasksTable)
        .values(insertValues)
        .returning();
      
      console.log('Database operation result:', savedTask ? 'Success' : 'Failed (null)');
      
      if (savedTask) {
        console.log('Saved task from DB:', JSON.stringify(savedTask, null, 2));
        return convertDbTaskToProjectTask(savedTask);
      }
      
      console.error('Task creation failed: Database returned null after insert');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error.stack : '';
      
      console.error('Error creating task:', {
        message: errorMessage,
        stack: errorDetails,
        taskData: {
          id: taskData.id,
          projectId: taskData.projectId,
          text: taskData.text,
          stage: taskData.stage
        }
      });
      return null;
    }
  },