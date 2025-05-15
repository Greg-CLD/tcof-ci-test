import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';

// Simple component to test task persistence independently
export function TaskPersistenceTest({ projectId }: { projectId: string }) {
  const [taskText, setTaskText] = useState('');
  const [testResults, setTestResults] = useState<{
    create: { status: 'idle' | 'loading' | 'success' | 'error', message?: string, taskId?: string },
    update: { status: 'idle' | 'loading' | 'success' | 'error', message?: string },
    delete: { status: 'idle' | 'loading' | 'success' | 'error', message?: string },
    fetch: { status: 'idle' | 'loading' | 'success' | 'error', message?: string, count?: number }
  }>({
    create: { status: 'idle' },
    update: { status: 'idle' },
    delete: { status: 'idle' },
    fetch: { status: 'idle' }
  });
  const { toast } = useToast();
  const { 
    tasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    isLoading,
    refetch,
    isCreating,
    isUpdating,
    isDeleting
  } = useProjectTasks(projectId);

  // Helper to update test result status
  const updateTestStatus = (
    test: 'create' | 'update' | 'delete' | 'fetch', 
    status: 'idle' | 'loading' | 'success' | 'error',
    message?: string,
    extraData?: any
  ) => {
    setTestResults(prev => ({
      ...prev,
      [test]: { 
        status, 
        message, 
        ...extraData 
      }
    }));
  };

  // Run task creation test
  const handleCreateTask = async () => {
    if (!taskText) {
      toast({
        title: 'Error',
        description: 'Please enter task text',
        variant: 'destructive'
      });
      return;
    }

    updateTestStatus('create', 'loading');
    
    try {
      const newTask = await createTask({
        projectId,
        text: taskText,
        stage: 'identification',
        origin: 'custom',
        sourceId: null,
        notes: 'Created as part of persistence test'
      });
      
      if (newTask && newTask.id) {
        updateTestStatus('create', 'success', 'Task created successfully', { taskId: newTask.id });
        toast({
          title: 'Success',
          description: `Task created with ID: ${newTask.id}`,
        });
      } else {
        updateTestStatus('create', 'error', 'Task creation failed - no task ID returned');
        toast({
          title: 'Error',
          description: 'Task creation failed - no task ID returned',
          variant: 'destructive'
        });
      }
    } catch (error) {
      updateTestStatus('create', 'error', error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };
  
  // Run task update test if we have a task ID
  const handleUpdateTask = async () => {
    if (!testResults.create.taskId) {
      toast({
        title: 'Error',
        description: 'No task ID available - create a task first',
        variant: 'destructive'
      });
      return;
    }
    
    updateTestStatus('update', 'loading');
    
    try {
      const updatedTask = await updateTask(testResults.create.taskId, {
        text: `${taskText} - UPDATED`,
        notes: 'Updated as part of persistence test'
      });
      
      if (updatedTask) {
        updateTestStatus('update', 'success', 'Task updated successfully');
        toast({
          title: 'Success',
          description: 'Task updated successfully',
        });
      } else {
        updateTestStatus('update', 'error', 'Task update failed - no task returned');
        toast({
          title: 'Error',
          description: 'Task update failed - no task returned',
          variant: 'destructive'
        });
      }
    } catch (error) {
      updateTestStatus('update', 'error', error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };
  
  // Run task deletion test if we have a task ID
  const handleDeleteTask = async () => {
    if (!testResults.create.taskId) {
      toast({
        title: 'Error',
        description: 'No task ID available - create a task first',
        variant: 'destructive'
      });
      return;
    }
    
    updateTestStatus('delete', 'loading');
    
    try {
      await deleteTask(testResults.create.taskId);
      updateTestStatus('delete', 'success', 'Task deleted successfully');
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    } catch (error) {
      updateTestStatus('delete', 'error', error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };
  
  // Run task fetch test
  const handleFetchTasks = async () => {
    updateTestStatus('fetch', 'loading');
    
    try {
      const refreshedTasks = await refetch();
      
      if (refreshedTasks.data) {
        updateTestStatus('fetch', 'success', 'Tasks fetched successfully', { count: refreshedTasks.data.length });
        toast({
          title: 'Success',
          description: `Fetched ${refreshedTasks.data.length} tasks`,
        });
      } else {
        updateTestStatus('fetch', 'error', 'Task fetch failed - no data returned');
        toast({
          title: 'Error',
          description: 'Task fetch failed - no data returned',
          variant: 'destructive'
        });
      }
    } catch (error) {
      updateTestStatus('fetch', 'error', error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };
  
  // Display status icon based on test state
  const StatusIcon = ({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) => {
    if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === 'success') return <Check className="h-4 w-4 text-green-500" />;
    if (status === 'error') return <X className="h-4 w-4 text-red-500" />;
    return null;
  };
  
  // On initial load, fetch tasks
  useEffect(() => {
    if (projectId) {
      handleFetchTasks();
    }
  }, [projectId]);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Task Persistence Test</CardTitle>
        <CardDescription>
          Test task creation, update, and deletion to verify persistence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label htmlFor="taskText">Task Text</label>
            <Input
              id="taskText"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Enter task text"
            />
          </div>
          
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1 font-semibold">Operation</div>
              <div className="col-span-1 font-semibold">Status</div>
              <div className="col-span-2 font-semibold">Result</div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 items-center border-t pt-2">
              <div className="col-span-1">Create</div>
              <div className="col-span-1 flex items-center">
                <StatusIcon status={testResults.create.status} />
                <span className="ml-2">{testResults.create.status}</span>
              </div>
              <div className="col-span-2 text-sm">
                {testResults.create.taskId ? (
                  <span className="text-green-600">ID: {testResults.create.taskId}</span>
                ) : (
                  testResults.create.message || 'Not tested'
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 items-center border-t pt-2">
              <div className="col-span-1">Update</div>
              <div className="col-span-1 flex items-center">
                <StatusIcon status={testResults.update.status} />
                <span className="ml-2">{testResults.update.status}</span>
              </div>
              <div className="col-span-2 text-sm">
                {testResults.update.message || 'Not tested'}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 items-center border-t pt-2">
              <div className="col-span-1">Delete</div>
              <div className="col-span-1 flex items-center">
                <StatusIcon status={testResults.delete.status} />
                <span className="ml-2">{testResults.delete.status}</span>
              </div>
              <div className="col-span-2 text-sm">
                {testResults.delete.message || 'Not tested'}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 items-center border-t pt-2">
              <div className="col-span-1">Fetch</div>
              <div className="col-span-1 flex items-center">
                <StatusIcon status={testResults.fetch.status} />
                <span className="ml-2">{testResults.fetch.status}</span>
              </div>
              <div className="col-span-2 text-sm">
                {testResults.fetch.count !== undefined ? (
                  `Found ${testResults.fetch.count} tasks`
                ) : (
                  testResults.fetch.message || 'Not tested'
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Debug Information</h3>
            <pre className="text-xs bg-slate-100 p-2 rounded-md overflow-auto max-h-40">
              {JSON.stringify({ 
                isLoading, 
                isCreating, 
                isUpdating, 
                isDeleting,
                tasksCount: tasks?.length || 0
              }, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between space-x-2">
        <Button
          variant="outline"
          onClick={handleFetchTasks}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh Tasks
        </Button>
        <div className="flex space-x-2">
          <Button
            variant="default"
            onClick={handleCreateTask}
            disabled={!taskText || isCreating}
          >
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Task
          </Button>
          <Button
            variant="secondary"
            onClick={handleUpdateTask}
            disabled={!testResults.create.taskId || isUpdating}
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Task
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteTask}
            disabled={!testResults.create.taskId || isDeleting}
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete Task
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}