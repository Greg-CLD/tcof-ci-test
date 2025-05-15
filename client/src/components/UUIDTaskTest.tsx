/**
 * Test component for verifying UUID handling in tasks
 * This component provides a UI for testing task creation, retrieval, and updating
 * with compound UUID format IDs
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { v4 as uuidv4 } from 'uuid';

// UUID format compatible with task IDs
function createCompoundId() {
  const baseUuid = uuidv4();
  return `${baseUuid}-test-${Date.now()}`;
}

export function UUIDTaskTest() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [taskText, setTaskText] = useState<string>('Test Task');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await apiRequest('GET', '/api/projects');
        const data = await response.json();
        setProjects(data);
        if (data.length > 0) {
          setProjectId(data[0].id);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      }
    }

    if (user) {
      loadProjects();
    }
  }, [user, toast]);

  // Load tasks when project selected
  useEffect(() => {
    async function loadTasks() {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
        const data = await response.json();
        setTasks(data);
        console.log('Fetched tasks:', data);
      } catch (error) {
        console.error('Error loading tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tasks',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadTasks();
    }
  }, [projectId, toast]);

  const createTask = async () => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Please select a project',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const compoundId = createCompoundId();
      setTaskId(compoundId);
      
      const taskData = {
        id: compoundId,
        text: taskText || `UUID Test Task ${new Date().toISOString()}`,
        stage: 'identification',
        origin: 'factor',
        sourceId: compoundId,
        completed: false,
        priority: 'medium',
        owner: 'Test Component',
        status: 'pending',
      };
      
      console.log('Creating task with data:', taskData);
      
      const response = await apiRequest(
        'POST',
        `/api/projects/${projectId}/tasks`,
        taskData
      );
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      console.log('Task created:', data);
      
      // Refresh tasks list
      const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
      const tasksData = await tasksResponse.json();
      setTasks(tasksData);
      
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      setResult(JSON.stringify(error, null, 2));
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    if (!taskId) {
      toast({
        title: 'Error',
        description: 'Please create a task first or select one from the list',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        text: `Updated: ${taskText} (${new Date().toLocaleTimeString()})`,
        completed: true,
      };
      
      console.log(`Updating task ${taskId} with data:`, updateData);
      
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}/tasks/${taskId}`,
        updateData
      );
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      console.log('Task updated:', data);
      
      // Refresh tasks list
      const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
      const tasksData = await tasksResponse.json();
      setTasks(tasksData);
      
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    } catch (error) {
      console.error('Error updating task:', error);
      setResult(JSON.stringify(error, null, 2));
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSourceTasks = async () => {
    if (!taskId) {
      toast({
        title: 'Error',
        description: 'Please create a task first or select one from the list',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching tasks for source ID: ${taskId}`);
      
      const response = await apiRequest(
        'GET',
        `/api/projects/${projectId}/tasks/source/${taskId}`
      );
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      console.log('Tasks for source:', data);
      
      toast({
        title: 'Success',
        description: `Found ${data.length} tasks with source ID ${taskId}`,
      });
    } catch (error) {
      console.error('Error fetching tasks by source:', error);
      setResult(JSON.stringify(error, null, 2));
      toast({
        title: 'Error',
        description: 'Failed to fetch tasks by source',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async () => {
    if (!taskId) {
      toast({
        title: 'Error',
        description: 'Please select a task to delete',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      console.log(`Deleting task with ID: ${taskId}`);
      
      const response = await apiRequest(
        'DELETE',
        `/api/projects/${projectId}/tasks/${taskId}`
      );
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      console.log('Task deletion result:', data);
      
      // Refresh tasks list
      const tasksResponse = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
      const tasksData = await tasksResponse.json();
      setTasks(tasksData);
      
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      setResult(JSON.stringify(error, null, 2));
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTask = (task: any) => {
    setTaskId(task.id);
    setTaskText(task.text);
    setResult(JSON.stringify(task, null, 2));
    toast({
      title: 'Task Selected',
      description: `Selected task: ${task.text}`,
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">UUID Task Test</h1>
      
      {/* Project Selection */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Project Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={loading}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Task Creation */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Create/Update Task</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskText">Task Text</Label>
              <Input
                id="taskText"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Enter task text"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taskId">Task ID (Generated or Selected)</Label>
              <Input
                id="taskId"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Task ID will appear here after creation"
                disabled
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={createTask} disabled={loading || !projectId}>
            Create Task
          </Button>
          <Button onClick={updateTask} disabled={loading || !taskId || !projectId}>
            Update Task
          </Button>
          <Button onClick={getSourceTasks} disabled={loading || !taskId || !projectId}>
            Get Source Tasks
          </Button>
          <Button onClick={deleteTask} disabled={loading || !taskId || !projectId} variant="destructive">
            Delete Task
          </Button>
        </CardFooter>
      </Card>
      
      {/* Tasks List */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Project Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-4">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center p-4">No tasks found</div>
          ) : (
            <ul className="divide-y">
              {tasks.map((task) => (
                <li 
                  key={task.id} 
                  className="py-2 px-4 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectTask(task)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.text}
                      </p>
                      <p className="text-xs text-gray-500">ID: {task.id}</p>
                      <p className="text-xs text-gray-500">Source: {task.sourceId}</p>
                    </div>
                    <div className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {task.origin}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      
      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {result || 'No results yet'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default UUIDTaskTest;