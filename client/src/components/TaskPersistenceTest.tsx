import React, { useState, useEffect } from 'react';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader,
  CardTitle 
} from '@/components/ui/card';

export const TaskPersistenceTest = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  // If project id was saved, retrieve it
  useEffect(() => {
    const storedProjectId = localStorage.getItem('test_project_id');
    if (storedProjectId) {
      setProjectId(storedProjectId);
    }
  }, []);
  
  // Create a test project id if needed
  const ensureProjectId = () => {
    if (!projectId) {
      const newId = uuidv4();
      localStorage.setItem('test_project_id', newId);
      setProjectId(newId);
      return newId;
    }
    return projectId;
  };

  // Using our task hook
  const { 
    tasks, 
    isLoading,
    createTask, 
    updateTask, 
    deleteTask,
    error: taskError
  } = useProjectTasks(projectId || undefined);

  // Helper to create a test task
  const handleCreateTask = async () => {
    setError(null);
    setTestResult(null);
    
    if (!isAuthenticated) {
      setError('You must be logged in to test task persistence');
      return;
    }
    
    const currentProjectId = ensureProjectId();
    
    try {
      const taskText = `Test task created at ${new Date().toLocaleTimeString()}`;
      const result = await createTask({
        projectId: currentProjectId,
        text: taskText,
        stage: 'identification',
        origin: 'custom',
        sourceId: 'test',
        completed: false,
        notes: 'This is a test task for persistence verification',
        priority: 'high'
      });
      
      setTestResult(`Task created successfully with ID: ${result.id}`);
    } catch (err) {
      setError(`Failed to create task: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Helper to update a task
  const handleUpdateTask = async () => {
    setError(null);
    setTestResult(null);
    
    if (!isAuthenticated) {
      setError('You must be logged in to test task persistence');
      return;
    }
    
    if (!tasks || tasks.length === 0) {
      setError('No tasks available to update. Create a task first.');
      return;
    }
    
    try {
      const taskToUpdate = tasks[0];
      const result = await updateTask(taskToUpdate.id, {
        text: `Updated task ${new Date().toLocaleTimeString()}`,
        completed: !taskToUpdate.completed
      });
      
      setTestResult(`Task updated successfully: ${result.id}`);
    } catch (err) {
      setError(`Failed to update task: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Helper to delete a task
  const handleDeleteTask = async () => {
    setError(null);
    setTestResult(null);
    
    if (!isAuthenticated) {
      setError('You must be logged in to test task persistence');
      return;
    }
    
    if (!tasks || tasks.length === 0) {
      setError('No tasks available to delete.');
      return;
    }
    
    try {
      await deleteTask(tasks[0].id);
      setTestResult('Task deleted successfully');
    } catch (err) {
      setError(`Failed to delete task: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        className="fixed bottom-4 left-4 z-50 bg-white shadow-md" 
        onClick={() => setIsOpen(true)}
      >
        Task Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-96 shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Task Persistence Test</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-6 w-6 p-0">
            <span className="sr-only">Close</span>
            <span aria-hidden="true">×</span>
          </Button>
        </div>
        <CardDescription>
          {projectId ? `Test project ID: ${projectId}` : 'No project ID set'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        
        {testResult && (
          <Alert className="py-2 bg-green-50 border-green-200 text-green-800">
            <AlertDescription className="text-xs">{testResult}</AlertDescription>
          </Alert>
        )}
        
        {taskError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Hook error: {taskError instanceof Error ? taskError.message : String(taskError)}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="bg-gray-50 p-2 rounded text-sm">
          <h3 className="font-medium mb-1">Current Tasks ({isLoading ? 'Loading...' : tasks?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto">
            {tasks && tasks.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {tasks.map(task => (
                  <li key={task.id} className="text-xs">
                    <span className={task.completed ? 'line-through' : ''}>{task.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">No tasks found</p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <div className="grid grid-cols-3 gap-2 w-full">
          <Button 
            size="sm" 
            onClick={handleCreateTask}
            className="col-span-1"
            disabled={!isAuthenticated}
          >
            Create
          </Button>
          <Button 
            size="sm" 
            onClick={handleUpdateTask}
            className="col-span-1"
            disabled={!isAuthenticated || !tasks || tasks.length === 0}
          >
            Update
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={handleDeleteTask}
            className="col-span-1"
            disabled={!isAuthenticated || !tasks || tasks.length === 0}
          >
            Delete
          </Button>
        </div>
        
        {!isAuthenticated && (
          <p className="text-xs text-red-500 text-center">
            You must be logged in to test task persistence
          </p>
        )}
      </CardFooter>
    </Card>
  );
};