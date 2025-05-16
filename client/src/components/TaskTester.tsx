import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Use the same stages as the rest of the application
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

type TaskTesterProps = {
  projectId: string;
  createTask: (taskData: any) => Promise<Task>;
  fetchTasks: () => Promise<Task[]>;
};

export function TaskTester({ projectId, createTask, fetchTasks }: TaskTesterProps) {
  const [results, setResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const log = (message: string) => {
    setResults(prev => [...prev, message]);
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
        const timestamp = new Date().toISOString();
        const taskData = {
          id: uuidv4(),
          projectId,
          text: `Smoke test task - ${stage} (${timestamp})`,
          stage,
          origin: 'custom',
          sourceId: `test-${uuidv4().slice(0, 8)}`,
          completed: false,
          priority: "medium",
          status: "To Do",
          notes: "Created by smoke test"
        };

        const task = await createTask(taskData);
        if (task) {
          createdTasks.push(task);
          log(`✅ Created "${stage}" task: ${task.id.substring(0, 8)}...`);
        } else {
          log(`❌ Failed to create "${stage}" task`);
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

      const missingIds = Array.from(createdIds).filter(id => !fetchedIds.has(id));

      if (missingIds.length > 0) {
        log(`❌ Some tasks are missing: ${missingIds.map(id => id.substring(0, 8)).join(', ')}`);
      } else {
        log('✅ All created tasks were successfully persisted');
      }

      // Final result
      if (missingIds.length === 0 && createdTasks.length === STAGES.length) {
        log(`🎉 Test PASSED! Successfully created and verified ${createdTasks.length} tasks.`);
        log('\nFetched tasks:');
        log(JSON.stringify(updatedTasks, null, 2));
      } else {
        log(`❌ Test FAILED! ${createdTasks.length} tasks created, ${missingIds.length} tasks missing.`);
      }

    } catch (error) {
      log(`❌ Test error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>Task Persistence Test</CardTitle>
        <CardDescription>
          Tests task creation and persistence across all project stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <Button 
              onClick={runTest} 
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                'Run Smoke Test'
              )}
            </Button>
          </div>

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
    </Card>
  );
}