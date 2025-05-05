import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Stage } from '@/lib/plan-db';
import { apiRequest } from '@/lib/queryClient';

interface FactorTask {
  id: string;
  title: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

interface StageTabsProps {
  factor: FactorTask;
  projectId: string;
}

export default function StageTabs({ factor, projectId }: StageTabsProps) {
  const [selectedStage, setSelectedStage] = useState<Stage>('Identification');
  const [taskCompletionStatus, setTaskCompletionStatus] = useState<Record<string, boolean>>({});
  const [savingTaskIds, setSavingTaskIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Get tasks for the selected stage
  const stageTasks = factor.tasks[selectedStage] || [];

  // Function to create a unique task ID
  const createTaskId = (factorId: string, stage: Stage, taskIndex: number) => {
    return `${factorId}-${stage}-${taskIndex}`;
  };

  // Handle checkbox change
  const handleTaskStatusChange = async (taskId: string, factorId: string, taskText: string, isChecked: boolean) => {
    try {
      // Add to saving state to show loading indicator
      setSavingTaskIds(prev => [...prev, taskId]);
      
      // Update local state
      setTaskCompletionStatus(prev => ({
        ...prev,
        [taskId]: isChecked
      }));

      // We would normally save this to the project's task state
      // For now, just simulate API call and show success toast
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: isChecked ? 'Task completed' : 'Task uncompleted',
        description: `"${taskText.substring(0, 40)}${taskText.length > 40 ? '...' : ''}" status updated.`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      
      // Revert state on error
      setTaskCompletionStatus(prev => ({
        ...prev,
        [taskId]: !isChecked
      }));
      
      toast({
        title: 'Error updating task',
        description: 'Failed to update task status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Remove from saving state
      setSavingTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  return (
    <div className="pt-2">
      <Tabs defaultValue="Identification" value={selectedStage} onValueChange={(value) => setSelectedStage(value as Stage)}>
        <TabsList className="w-full">
          <TabsTrigger value="Identification" className="flex-1">Identification</TabsTrigger>
          <TabsTrigger value="Definition" className="flex-1">Definition</TabsTrigger>
          <TabsTrigger value="Delivery" className="flex-1">Delivery</TabsTrigger>
          <TabsTrigger value="Closure" className="flex-1">Closure</TabsTrigger>
        </TabsList>
        
        {Object.keys(factor.tasks).map((stageName) => {
          const stage = stageName as Stage;
          const tasks = factor.tasks[stage];
          
          return (
            <TabsContent key={stage} value={stage}>
              {tasks && tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task, index) => {
                    const taskId = createTaskId(factor.id, stage, index);
                    const isCompleted = taskCompletionStatus[taskId] || false;
                    const isSaving = savingTaskIds.includes(taskId);
                    
                    return (
                      <div key={taskId} className="flex items-start space-x-2 py-1">
                        <div className="pt-0.5">
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Checkbox 
                              id={taskId}
                              checked={isCompleted}
                              onCheckedChange={(checked) => 
                                handleTaskStatusChange(taskId, factor.id, task, checked === true)
                              }
                            />
                          )}
                        </div>
                        <label 
                          htmlFor={taskId} 
                          className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {task}
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Alert className="mt-2">
                  <AlertDescription>
                    No tasks available for this stage.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}