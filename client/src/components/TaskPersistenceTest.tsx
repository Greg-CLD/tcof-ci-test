import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ORIGIN_LABELS, AVAILABLE_ORIGINS, DEFAULT_ORIGIN } from '@/constants/origin';

const STAGES = ['identification', 'definition', 'delivery', 'closure'];

type Task = {
  id: string;
  projectId: string;
  text: string;
  stage: string;
  origin: string;
  sourceId: string;
  completed: boolean;
  notes?: string;
  priority?: string;
  dueDate?: string | null;
  owner?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TestProps = {
  projectId: string;
};

export default function TaskPersistenceTest({ projectId }: TestProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('identification');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/projects/${projectId}/tasks`);
      const data = await response.json();
      setTasks(data);
      return data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tasks. See console for details.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const createTask = async (stage: string): Promise<Task | null> => {
    try {
      // Generate random origin for test variety
      const origin = AVAILABLE_ORIGINS[Math.floor(Math.random() * AVAILABLE_ORIGINS.length)] || DEFAULT_ORIGIN;
      
      // Create unique task data
      const taskId = uuidv4();
      const sourceId = `test-${uuidv4().slice(0, 8)}`;
      const timestamp = new Date().toISOString();
      
      const taskData = {
        id: taskId,
        projectId,
        text: `Persistence test - ${stage} (${timestamp})`,
        stage,
        origin,
        sourceId,
        completed: false,
        priority: "medium",
        status: "pending",
        notes: "Created by browser persistence test"
      };
      
      const response = await apiRequest('POST', `/projects/${projectId}/tasks`, taskData);
      const createdTask = await response.json();
      
      return createdTask;
    } catch (error) {
      console.error(`Error creating task for stage "${stage}":`, error);
      return null;
    }
  };

  const runTest = async () => {
    setIsTesting(true);
    setResults([]);
    
    try {
      // Record initial task count
      const initialTasks = await fetchTasks();
      const initialCount = initialTasks.length;
      log(`Initial task count: ${initialCount}`);
      
      // Create a task for each stage
      log('Creating test tasks for each stage...');
      const createdTasks: Task[] = [];
      
      for (const stage of STAGES) {
        const task = await createTask(stage);
        if (task) {
          createdTasks.push(task);
          log(`✅ Created task for "${stage}" stage: ${task.id.substring(0, 8)}...`);
        } else {
          log(`❌ Failed to create task for "${stage}" stage`);
        }
      }
      
      // Verify tasks were persisted
      log('Verifying task persistence...');
      const updatedTasks = await fetchTasks();
      const updatedCount = updatedTasks.length;
      
      log(`Updated task count: ${updatedCount} (${updatedCount - initialCount} added)`);
      
      // Verify all created tasks exist in the fetched list
      const createdIds = new Set(createdTasks.map(task => task.id));
      const fetchedIds = new Set(updatedTasks.map(task => task.id));
      
      const missingIds = [...createdIds].filter(id => !fetchedIds.has(id));
      
      if (missingIds.length > 0) {
        log(`❌ Some tasks are missing: ${missingIds.map(id => id.substring(0, 8)).join(', ')}`);
      } else {
        log('✅ All created tasks were successfully persisted');
      }
      
      // Final result
      if (missingIds.length === 0 && createdTasks.length === STAGES.length) {
        log(`🎉 Test PASSED! Successfully created and verified ${createdTasks.length} tasks.`);
      } else {
        log(`❌ Test FAILED! ${createdTasks.length} tasks created, ${missingIds.length} tasks missing.`);
      }
      
      // Invalidate the tasks cache to ensure UI is updated
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      
    } catch (error) {
      log(`❌ Test error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const log = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-md">
      <CardHeader>
        <CardTitle>Task Persistence Test</CardTitle>
        <CardDescription>
          Tests task creation and persistence across all project stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Project ID</h3>
              <p className="text-sm text-muted-foreground">{projectId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Current Tasks</h3>
              <p className="text-sm">{isLoading ? 'Loading...' : tasks.length}</p>
            </div>
          </div>
          
          <Tabs defaultValue="identification" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-4">
              {STAGES.map(stage => (
                <TabsTrigger key={stage} value={stage} className="capitalize">
                  {stage}
                  <Badge className="ml-2" variant="outline">
                    {tasks.filter(task => task.stage === stage).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {STAGES.map(stage => (
              <TabsContent key={stage} value={stage} className="space-y-4">
                <div className="rounded-md border p-4">
                  <h3 className="font-medium mb-2 capitalize">{stage} Stage Tasks</h3>
                  {tasks.filter(task => task.stage === stage).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {tasks
                        .filter(task => task.stage === stage)
                        .map(task => (
                          <li key={task.id} className="text-sm border-b pb-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{task.text}</span>
                              <Badge variant="outline">{ORIGIN_LABELS[task.origin as keyof typeof ORIGIN_LABELS] || task.origin}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ID: {task.id.substring(0, 8)}... • Created: {new Date(task.createdAt || '').toLocaleString()}
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          {results.length > 0 && (
            <div className="bg-muted p-4 rounded-md mt-4">
              <h3 className="font-medium mb-2">Test Results</h3>
              <pre className="text-xs whitespace-pre-wrap">
                {results.map((line, i) => (
                  <div key={i} className={
                    line.includes('❌') ? 'text-destructive' : 
                    line.includes('✅') ? 'text-green-600' : 
                    line.includes('🎉') ? 'font-bold text-green-600' : ''
                  }>
                    {line}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={fetchTasks} disabled={isLoading || isTesting}>
          Refresh Tasks
        </Button>
        <Button onClick={runTest} disabled={isLoading || isTesting}>
          {isTesting ? 'Running Test...' : 'Run Persistence Test'}
        </Button>
      </CardFooter>
    </Card>
  );
}