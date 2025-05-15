import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, RefreshCw, Save, Trash } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProjectTask } from '@shared/schema';

interface TaskPersistenceTesterProps {
  projectId: string;
}

export function TaskPersistenceTester({ projectId }: TaskPersistenceTesterProps) {
  const [taskText, setTaskText] = useState(`Test Task ${new Date().toLocaleTimeString()}`);
  const [lastCreatedTaskId, setLastCreatedTaskId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState<'manual' | 'auto'>('manual');
  const [autoTestRunning, setAutoTestRunning] = useState(false);
  const [autoTestResults, setAutoTestResults] = useState<{
    create: boolean | null;
    get: boolean | null;
    update: boolean | null;
    verify: boolean | null;
    delete: boolean | null;
    overall: boolean | null;
  }>({
    create: null,
    get: null,
    update: null,
    verify: null,
    delete: null,
    overall: null
  });
  
  const { toast } = useToast();
  
  // Get project tasks hook with the required mutations
  const { 
    tasks, 
    refetch, 
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    isCreating,
    isUpdating,
    isDeleting
  } = useProjectTasks(projectId);
  
  // Handler for creating a new task
  const handleCreateTask = async () => {
    try {
      const result = await createTask({
        text: taskText,
        stage: 'identification',
        origin: 'custom',
        sourceId: `test-${uuidv4().slice(0, 8)}`,
        priority: 'medium',
        completed: false
      });
      
      console.log('Task created:', result);
      setLastCreatedTaskId(result.id);
      
      toast({
        title: 'Task Created',
        description: `Created task with ID: ${result.id}`,
      });
      
      return result;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error Creating Task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  // Handler for updating the last created task
  const handleUpdateTask = async () => {
    if (!lastCreatedTaskId) {
      toast({
        title: 'No Task to Update',
        description: 'Create a task first',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const updatedTaskText = `${taskText} (Updated ${new Date().toLocaleTimeString()})`;
      
      const result = await updateTaskMutation.mutateAsync({
        taskId: lastCreatedTaskId,
        data: {
          text: updatedTaskText,
          completed: true
        }
      });
      
      console.log('Task updated:', result);
      setTaskText(updatedTaskText);
      
      toast({
        title: 'Task Updated',
        description: `Updated task: ${result.id}`,
      });
      
      return result;
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error Updating Task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  // Handler for deleting the last created task
  const handleDeleteTask = async () => {
    if (!lastCreatedTaskId) {
      toast({
        title: 'No Task to Delete',
        description: 'Create a task first',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await deleteTaskMutation.mutateAsync(lastCreatedTaskId);
      
      toast({
        title: 'Task Deleted',
        description: `Deleted task: ${lastCreatedTaskId}`,
      });
      
      setLastCreatedTaskId(null);
      setTaskText(`Test Task ${new Date().toLocaleTimeString()}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error Deleting Task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      throw error;
    }
  };
  
  // Function to verify if a task with the given ID exists in the fetched tasks
  const verifyTaskExists = (taskId: string): boolean => {
    const taskExists = tasks?.some(task => task.id === taskId) ?? false;
    console.log(`Verifying task ${taskId} exists:`, taskExists);
    return taskExists;
  };
  
  // Run automated test for the full lifecycle
  const runAutomatedTest = async () => {
    setAutoTestRunning(true);
    setAutoTestResults({
      create: null,
      get: null,
      update: null,
      verify: null,
      delete: null,
      overall: null
    });
    
    try {
      // Step 1: Create a task
      console.log('Automated test - Step 1: Create task');
      const newTask = await handleCreateTask();
      setAutoTestResults(prev => ({ ...prev, create: true }));
      
      if (!newTask || !newTask.id) {
        throw new Error('Failed to create task');
      }
      
      // Step 2: Verify it appears in the task list
      console.log('Automated test - Step 2: Verify task exists');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
      await refetch();
      
      const taskExists = verifyTaskExists(newTask.id);
      setAutoTestResults(prev => ({ ...prev, get: taskExists }));
      
      if (!taskExists) {
        throw new Error('Created task not found in task list');
      }
      
      // Step 3: Update the task
      console.log('Automated test - Step 3: Update task');
      const updatedTask = await handleUpdateTask();
      setAutoTestResults(prev => ({ ...prev, update: true }));
      
      if (!updatedTask) {
        throw new Error('Failed to update task');
      }
      
      // Step 4: Verify update appears
      console.log('Automated test - Step 4: Verify update');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
      await refetch();
      
      const updatedTaskExists = tasks?.some(task => 
        task.id === newTask.id && 
        task.text === updatedTask.text && 
        task.completed === true
      ) ?? false;
      
      setAutoTestResults(prev => ({ ...prev, verify: updatedTaskExists }));
      
      if (!updatedTaskExists) {
        throw new Error('Updated task not found with correct values');
      }
      
      // Step 5: Delete the task
      console.log('Automated test - Step 5: Delete task');
      await handleDeleteTask();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
      await refetch();
      
      const taskDeleted = !verifyTaskExists(newTask.id);
      setAutoTestResults(prev => ({ ...prev, delete: taskDeleted }));
      
      if (!taskDeleted) {
        throw new Error('Task still exists after deletion');
      }
      
      // All steps passed
      setAutoTestResults(prev => ({ ...prev, overall: true }));
      toast({
        title: 'Test Completed Successfully',
        description: 'All persistence tests passed!',
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Automated test failed:', error);
      setAutoTestResults(prev => ({ ...prev, overall: false }));
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setAutoTestRunning(false);
    }
  };
  
  // Get the last created task if it exists
  const lastCreatedTask = lastCreatedTaskId 
    ? tasks?.find(task => task.id === lastCreatedTaskId) 
    : null;
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Task Persistence Tester
        </CardTitle>
        <CardDescription>
          Test if tasks are properly saved and persisted to the database
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 mb-6">
            <Button
              variant={testMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setTestMode('manual')}
              disabled={autoTestRunning}
            >
              Manual Testing
            </Button>
            <Button
              variant={testMode === 'auto' ? 'default' : 'outline'}
              onClick={() => setTestMode('auto')}
              disabled={autoTestRunning}
            >
              Automated Test
            </Button>
          </div>
          
          {testMode === 'manual' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="taskText">Task Text</Label>
                <Input
                  id="taskText"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="Enter task text"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button 
                  onClick={handleCreateTask} 
                  disabled={createTaskMutation.isPending || taskText.trim() === ''}
                >
                  {createTaskMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                  Create Task
                </Button>
                
                <Button 
                  onClick={handleUpdateTask} 
                  disabled={updateTaskMutation.isPending || !lastCreatedTaskId}
                  variant="outline"
                >
                  {updateTaskMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                  Update Task
                </Button>
                
                <Button 
                  onClick={handleDeleteTask} 
                  disabled={deleteTaskMutation.isPending || !lastCreatedTaskId}
                  variant="destructive"
                >
                  {deleteTaskMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                  Delete Task
                </Button>
                
                <Button 
                  onClick={() => refetch()} 
                  disabled={isLoading}
                  variant="secondary"
                >
                  {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Tasks
                </Button>
              </div>
              
              {lastCreatedTask && (
                <div className="mt-6 p-4 border rounded-md bg-gray-50">
                  <h3 className="text-lg font-semibold mb-2">Last Created Task</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">ID:</span>
                      <span className="font-mono text-sm">{lastCreatedTask.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Text:</span>
                      <span>{lastCreatedTask.text}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Completed:</span>
                      <span>{lastCreatedTask.completed ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Stage:</span>
                      <Badge variant="outline">{lastCreatedTask.stage}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Created At:</span>
                      <span>{new Date(lastCreatedTask.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Updated At:</span>
                      <span>{new Date(lastCreatedTask.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Current Tasks for Project ({tasks?.length || 0})</h3>
                {isLoading ? (
                  <div className="flex justify-center p-4">
                    <Spinner />
                  </div>
                ) : tasks && tasks.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-auto p-2">
                    {tasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`p-2 border rounded-md ${task.id === lastCreatedTaskId ? 'bg-yellow-50 border-yellow-300' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Checkbox checked={task.completed} readOnly className="mr-2" />
                            <span className={task.completed ? 'line-through text-gray-500' : ''}>
                              {task.text}
                            </span>
                          </div>
                          <Badge variant="outline" size="sm">{task.stage}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 border rounded-md bg-gray-50">
                    <p className="text-gray-500">No tasks found for this project</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Automated Test UI
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Automated Persistence Test</AlertTitle>
                <AlertDescription>
                  This will create, verify, update, and delete a test task to verify 
                  database persistence is working correctly.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={runAutomatedTest}
                disabled={autoTestRunning}
                className="w-full"
              >
                {autoTestRunning && <Spinner className="mr-2 h-4 w-4" />}
                Run Full Persistence Test
              </Button>
              
              {(autoTestResults.create !== null || autoTestRunning) && (
                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold">Test Results:</h3>
                  <div className="space-y-2 p-3 border rounded-md bg-gray-50">
                    <TestResultRow 
                      label="1. Create Task" 
                      result={autoTestResults.create} 
                      isRunning={autoTestRunning && autoTestResults.create === null}
                    />
                    <TestResultRow 
                      label="2. Verify Task Exists" 
                      result={autoTestResults.get} 
                      isRunning={autoTestRunning && autoTestResults.create !== null && autoTestResults.get === null}
                    />
                    <TestResultRow 
                      label="3. Update Task" 
                      result={autoTestResults.update} 
                      isRunning={autoTestRunning && autoTestResults.get !== null && autoTestResults.update === null}
                    />
                    <TestResultRow 
                      label="4. Verify Update" 
                      result={autoTestResults.verify} 
                      isRunning={autoTestRunning && autoTestResults.update !== null && autoTestResults.verify === null}
                    />
                    <TestResultRow 
                      label="5. Delete Task" 
                      result={autoTestResults.delete} 
                      isRunning={autoTestRunning && autoTestResults.verify !== null && autoTestResults.delete === null}
                    />
                    <Separator className="my-2" />
                    <TestResultRow 
                      label="Overall Result" 
                      result={autoTestResults.overall} 
                      isRunning={autoTestRunning && autoTestResults.delete !== null && autoTestResults.overall === null}
                      isFinal
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Project ID: <span className="font-mono">{projectId}</span>
        </div>
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper component for test results
interface TestResultRowProps {
  label: string;
  result: boolean | null;
  isRunning: boolean;
  isFinal?: boolean;
}

function TestResultRow({ label, result, isRunning, isFinal = false }: TestResultRowProps) {
  return (
    <div className={`flex justify-between ${isFinal ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span>
        {isRunning ? (
          <Spinner className="h-4 w-4" />
        ) : result === null ? (
          <span className="text-gray-400">Pending</span>
        ) : result === true ? (
          <span className="text-green-600 flex items-center">
            <Check className="h-4 w-4 mr-1" /> Pass
          </span>
        ) : (
          <span className="text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> Fail
          </span>
        )}
      </span>
    </div>
  );
}