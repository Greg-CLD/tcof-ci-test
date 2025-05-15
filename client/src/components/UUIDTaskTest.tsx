import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { convertToUuid, getOriginalId, wasGeneratedFrom, isValidUUID } from '@/lib/uuid-utils';

/**
 * Component for testing UUID task persistence
 * This component creates, updates, and deletes tasks using the UUID utilities
 */
const UUIDTaskTest: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { toast } = useToast();
  const [testTaskId, setTestTaskId] = useState<string | undefined>();
  const [taskText, setTaskText] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [stage, setStage] = useState<'identification' | 'definition' | 'delivery' | 'closure'>('identification');
  const [testUuid, setTestUuid] = useState('');
  const [originalId, setOriginalId] = useState('');
  const [completed, setCompleted] = useState(false);
  const [status, setStatus] = useState('');
  const [conversionResult, setConversionResult] = useState('');
  
  // Use the project tasks hook to access task operations
  const { 
    tasks, 
    isLoading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask 
  } = useProjectTasks(projectId);
  
  useEffect(() => {
    // Log all tasks whenever they change
    if (tasks) {
      console.log('Current tasks:', tasks);
    }
  }, [tasks]);
  
  // Test UUID conversion function
  const testConversion = () => {
    try {
      const uuid = convertToUuid(originalId);
      setTestUuid(uuid);
      setConversionResult(`
Converted "${originalId}" to UUID "${uuid}"
Is Valid UUID: ${isValidUUID(uuid) ? 'Yes' : 'No'}
Generated From "${originalId}": ${wasGeneratedFrom(uuid, originalId) ? 'Yes' : 'No'}
Original ID from UUID: "${getOriginalId(uuid)}"
`);
      toast({
        title: "UUID Conversion Test",
        description: `Successfully converted "${originalId}" to UUID format.`,
      });
    } catch (error) {
      console.error('Conversion error:', error);
      setConversionResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "UUID Conversion Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  // Create a new test task
  const handleCreateTask = async () => {
    if (!taskText) {
      toast({
        title: "Validation Error",
        description: "Task text is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Use sourceId to test our UUID conversion from a non-UUID format
      const sourceId = `test-${Date.now()}`;
      
      // Create the task using our hook
      const newTask = await createTask({
        projectId,
        text: taskText,
        stage,
        origin: 'custom',
        sourceId,
        notes: taskNotes || undefined,
        completed,
        status: status || undefined
      });
      
      // Update the test task ID
      setTestTaskId(newTask.id);
      
      toast({
        title: "Task Created",
        description: `Successfully created task with ID: ${newTask.id}`,
      });
      
      console.log('Created task:', newTask);
      console.log('Task ID is a valid UUID:', isValidUUID(newTask.id));
      
      // Check if the source ID was converted to a UUID internally
      const sourceUuid = convertToUuid(sourceId, false);
      console.log('Source ID converted to UUID:', sourceUuid);
      console.log('Task was created with source ID:', newTask.sourceId);
      
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Task Creation Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  // Update the test task
  const handleUpdateTask = async () => {
    if (!testTaskId) {
      toast({
        title: "No Task Selected",
        description: "Create a task first or select an existing task",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const updatedTask = await updateTask(testTaskId, {
        text: taskText,
        stage,
        notes: taskNotes || undefined,
        completed,
        status: status || undefined
      });
      
      toast({
        title: "Task Updated",
        description: `Successfully updated task ID: ${updatedTask.id}`,
      });
      
      console.log('Updated task:', updatedTask);
      
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Task Update Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  // Delete the test task
  const handleDeleteTask = async () => {
    if (!testTaskId) {
      toast({
        title: "No Task Selected",
        description: "Create a task first or select an existing task",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await deleteTask(testTaskId);
      
      toast({
        title: "Task Deleted",
        description: `Successfully deleted task ID: ${testTaskId}`,
      });
      
      // Clear the test task ID
      setTestTaskId(undefined);
      
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Task Deletion Error",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  // Select an existing task
  const handleSelectTask = (taskId: string) => {
    if (!tasks) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTestTaskId(task.id);
    setTaskText(task.text);
    setTaskNotes(task.notes || '');
    setStage(task.stage as any);
    setCompleted(task.completed || false);
    setStatus(task.status || '');
    
    toast({
      title: "Task Selected",
      description: `Selected task: ${task.text}`,
    });
  };
  
  return (
    <div className="mx-auto max-w-4xl p-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>UUID Task Persistence Test</CardTitle>
          <CardDescription>
            Test task persistence operations with UUID conversion utilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskText">Task Text</Label>
            <Input
              id="taskText"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Enter task text"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="taskNotes">Task Notes</Label>
            <Textarea
              id="taskNotes"
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Enter task notes (optional)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="taskStage">Task Stage</Label>
            <Select value={stage} onValueChange={(value) => setStage(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identification">Identification</SelectItem>
                <SelectItem value="definition">Definition</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="closure">Closure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="taskStatus">Task Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="taskCompleted"
              checked={completed}
              onCheckedChange={(checked) => setCompleted(!!checked)}
            />
            <Label htmlFor="taskCompleted">Task Completed</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="selectedTask">Current Test Task</Label>
            <div className="p-2 border rounded-md bg-muted/50">
              {testTaskId ? (
                <div>
                  <p><strong>ID:</strong> {testTaskId}</p>
                  <p><strong>Is Valid UUID:</strong> {isValidUUID(testTaskId || '') ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No task selected</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="space-x-2">
            <Button onClick={handleCreateTask}>Create Task</Button>
            <Button onClick={handleUpdateTask} variant="outline" disabled={!testTaskId}>Update Task</Button>
            <Button onClick={handleDeleteTask} variant="destructive" disabled={!testTaskId}>Delete Task</Button>
          </div>
        </CardFooter>
      </Card>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>UUID Conversion Test</CardTitle>
          <CardDescription>
            Test UUID conversion utilities directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="originalId">Original ID</Label>
            <Input
              id="originalId"
              value={originalId}
              onChange={(e) => setOriginalId(e.target.value)}
              placeholder="e.g., sf-1, custom-id, etc."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="conversionResult">Conversion Result</Label>
            <Textarea
              id="conversionResult"
              value={conversionResult}
              readOnly
              className="font-mono h-32"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={testConversion} disabled={!originalId}>Test Conversion</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Existing Tasks</CardTitle>
          <CardDescription>
            Select an existing task to test update and delete operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-destructive p-4 border border-destructive rounded-md">
              Error loading tasks: {String(error)}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`p-4 border rounded-md cursor-pointer hover:bg-accent ${
                    testTaskId === task.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => handleSelectTask(task.id)}
                >
                  <div className="font-medium">{task.text}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {task.id} | Stage: {task.stage} | Origin: {task.origin}
                  </div>
                  {task.sourceId && (
                    <div className="text-sm text-muted-foreground">
                      Source ID: {task.sourceId} | Source UUID: {convertToUuid(task.sourceId, false)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-4">
              No tasks found. Create your first task using the form above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UUIDTaskTest;