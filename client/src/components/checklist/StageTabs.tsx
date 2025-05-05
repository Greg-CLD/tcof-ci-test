import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { loadPlan, savePlan, PlanRecord, Stage, TaskItem } from '@/lib/plan-db';

// Types
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

// Define extended TaskItem that includes factorId
interface FactorTaskItem extends TaskItem {
  factorId?: string;
  source?: string;
}

interface TaskStatus {
  [key: string]: boolean;
}

interface StageTabsProps {
  factor: FactorTask;
  projectId: string;
}

export default function StageTabs({ factor, projectId }: StageTabsProps) {
  // Debug log for props inspection
  console.log('StageTabs props ➔', { factor, projectId });

  const [activeTab, setActiveTab] = useState<Stage>('Identification');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({});
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Create a unique ID for each task to use in the taskStatus map
  const createTaskId = (factorId: string, stage: Stage, taskIndex: number) => {
    return `${factorId}-${stage}-${taskIndex}`;
  };
  
  // Load plan data when component mounts
  useEffect(() => {
    const loadPlanData = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const loadedPlan = await loadPlan(projectId);
        if (loadedPlan) {
          setPlan(loadedPlan);
          
          // Initialize task status from plan data
          const initialStatus: TaskStatus = {};
          
          // Check all stages for task completion status
          Object.entries(loadedPlan.stages).forEach(([stageName, stageData]) => {
            const tasks = stageData.tasks || [];
            
            tasks.forEach((task) => {
              // Cast to FactorTaskItem to access factorId
              const factorTask = task as FactorTaskItem;
              if (factorTask.factorId === factor.id) {
                initialStatus[task.id] = task.completed || false;
              }
            });
          });
          
          setTaskStatus(initialStatus);
        }
      } catch (error) {
        console.error('Error loading plan data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load task data. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadPlanData();
  }, [factor.id, projectId, toast]);
  
  // Handle task status change
  const handleTaskChange = async (taskId: string, completed: boolean) => {
    if (!plan) return;
    
    try {
      // Update local state
      setTaskStatus((prev) => ({
        ...prev,
        [taskId]: completed,
      }));
      
      // Update plan data
      const updatedPlan = { ...plan };
      
      // Find and update the task in the plan
      let taskUpdated = false;
      
      Object.entries(updatedPlan.stages).forEach(([stageName, stageData]) => {
        if (!stageData.tasks) return;
        
        // Find the task in this stage
        const taskIndex = stageData.tasks.findIndex((t) => t.id === taskId);
        
        if (taskIndex >= 0 && stageName in updatedPlan.stages) {
          // Update the task completion status (safely cast to Stage to fix TypeScript error)
          const stageKey = stageName as Stage;
          updatedPlan.stages[stageKey].tasks[taskIndex].completed = completed;
          taskUpdated = true;
        }
      });
      
      // If task wasn't found (new task), add it to the appropriate stage
      if (!taskUpdated) {
        // Parse taskId to get stage and factor info
        const [factorId, stageName, taskIndexStr] = taskId.split('-');
        const stageKey = stageName as Stage;
        const taskIndex = parseInt(taskIndexStr);
        
        // Make sure stage is valid and task index is within range
        if (stageKey in updatedPlan.stages && 
            factor.tasks[stageKey] && 
            taskIndex < factor.tasks[stageKey].length) {
          
          const taskText = factor.tasks[stageKey][taskIndex];
          
          // Add task to the appropriate stage
          if (!updatedPlan.stages[stageKey].tasks) {
            updatedPlan.stages[stageKey].tasks = [];
          }
          
          updatedPlan.stages[stageKey].tasks.push({
            id: taskId,
            text: taskText,
            stage: stageKey,  // Add required stage property
            origin: 'factor', // Add required origin property
            completed: completed,
            factorId: factorId, // Will be added as extended property
            source: 'factor',   // Will be added as extended property 
          } as TaskItem); // Cast to TaskItem to satisfy TypeScript
        }
      }
      
      // Save updated plan
      await savePlan(updatedPlan);
      setPlan(updatedPlan);
      
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status. Please try again.',
        variant: 'destructive',
      });
      
      // Revert local state on error
      setTaskStatus((prev) => ({
        ...prev,
        [taskId]: !completed,
      }));
    }
  };
  
  // Count completed tasks for a stage
  const getStageProgress = (stage: Stage) => {
    const tasks = factor.tasks[stage];
    if (!tasks || tasks.length === 0) return { completed: 0, total: 0 };
    
    let completed = 0;
    let total = tasks.length;
    
    tasks.forEach((_, index) => {
      const taskId = createTaskId(factor.id, stage, index);
      if (taskStatus[taskId]) {
        completed++;
      }
    });
    
    return { completed, total };
  };
  
  // Generate badge for stage progress
  const getProgressBadge = (stage: Stage) => {
    const { completed, total } = getStageProgress(stage);
    
    if (total === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          No tasks
        </span>
      );
    }
    
    if (completed === total) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Complete
        </span>
      );
    }
    
    if (completed === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          <Circle className="h-3 w-3" />
          Not started
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
        <AlertCircle className="h-3 w-3" />
        {completed}/{total}
      </span>
    );
  };
  
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as Stage)}
      className="w-full"
    >
      <TabsList className="grid grid-cols-4 gap-2 mb-4">
        <TabsTrigger 
          value="Identification"
          disabled={factor.tasks.Identification.length === 0}
          className="flex flex-col gap-1 py-2"
        >
          <span>Identification</span>
          {getProgressBadge('Identification')}
        </TabsTrigger>
        
        <TabsTrigger 
          value="Definition"
          disabled={factor.tasks.Definition.length === 0}
          className="flex flex-col gap-1 py-2"
        >
          <span>Definition</span>
          {getProgressBadge('Definition')}
        </TabsTrigger>
        
        <TabsTrigger 
          value="Delivery"
          disabled={factor.tasks.Delivery.length === 0}
          className="flex flex-col gap-1 py-2"
        >
          <span>Delivery</span>
          {getProgressBadge('Delivery')}
        </TabsTrigger>
        
        <TabsTrigger 
          value="Closure"
          disabled={factor.tasks.Closure.length === 0}
          className="flex flex-col gap-1 py-2"
        >
          <span>Closure</span>
          {getProgressBadge('Closure')}
        </TabsTrigger>
      </TabsList>
      
      {/* Tab content for each stage */}
      {(['Identification', 'Definition', 'Delivery', 'Closure'] as Stage[]).map((stage) => (
        <TabsContent key={stage} value={stage}>
          {factor.tasks[stage].length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No tasks defined for this stage
            </div>
          ) : (
            <div className="space-y-2">
              {factor.tasks[stage].map((taskText, index) => {
                const taskId = createTaskId(factor.id, stage, index);
                return (
                  <div
                    key={taskId}
                    className="flex items-start gap-3 p-3 rounded-md border border-gray-100 bg-white hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`${stage}-task-${index}`}
                      checked={!!taskStatus[taskId]}
                      onCheckedChange={(checked) => {
                        handleTaskChange(taskId, checked === true);
                      }}
                    />
                    <label
                      htmlFor={`${stage}-task-${index}`}
                      className={`text-sm cursor-pointer ${
                        taskStatus[taskId] ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {taskText}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}