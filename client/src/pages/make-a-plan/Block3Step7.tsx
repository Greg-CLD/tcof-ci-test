import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePlan } from '@/contexts/PlanContext';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import MakeAPlanLayout from '@/layouts/MakeAPlanLayout';
import StepNavigation from '@/components/StepNavigation';

// Project stage options
const STAGE_OPTIONS = [
  { value: 'Identification', label: 'Identification' },
  { value: 'Definition', label: 'Definition' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Closure', label: 'Closure' },
];

// Framework name display mapping
const FRAMEWORK_NAMES = {
  praxis: 'Praxis Framework',
  green_book: 'UK Government Green Book',
  agilepm: 'Agile Project Management',
  safe: 'Scaled Agile Framework (SAFe)',
  custom: 'Custom Framework',
};

// Type definitions
interface FrameworkTask {
  id: string;
  name: string;
  description: string;
}

interface Framework {
  tasks: FrameworkTask[];
}

interface FrameworksData {
  frameworks: Record<string, Framework>;
  savedTasks: SavedTask[];
}

interface SavedTask {
  taskId: string;
  frameworkCode: string;
  stage: string;
  included: boolean;
  addedAt: string;
}

interface TaskAssignment {
  projectId: string;
  taskId: string;
  frameworkCode: string;
  stage: string;
  included: boolean;
}

export default function Block3Step7() {
  const { projectId } = useParams<{ projectId?: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateToolProgress } = useToolProgress();
  const { plan, saveBlock } = usePlan();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch framework tasks for this project
  const { data: frameworkTasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['project-framework-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest("GET", `/api/projects/${projectId}/framework-tasks`);
      if (!res.ok) {
        if (res.status !== 404) {
          toast({
            title: "Error loading framework tasks",
            description: "Could not load tasks for selected frameworks",
            variant: "destructive",
          });
        }
        return null;
      }
      return res.json() as Promise<FrameworksData>;
    },
    enabled: !!projectId,
  });

  // Mutation for saving framework task assignments
  const saveTaskMutation = useMutation({
    mutationFn: async ({ projectId, taskId, frameworkCode, stage, included }: TaskAssignment) => {
      const res = await apiRequest(
        "POST",
        `/api/projects/${projectId}/framework-tasks`,
        { 
          taskId,
          frameworkCode,
          stage,
          included
        }
      );
      
      if (!res.ok) {
        throw new Error("Failed to save task assignment");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-framework-tasks', projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error saving task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Handle task stage change
  const handleStageChange = async (taskId: string, frameworkCode: string, stage: string) => {
    if (!projectId) return;
    
    try {
      await saveTaskMutation.mutateAsync({
        projectId,
        taskId,
        frameworkCode,
        stage,
        included: isTaskIncluded(taskId, frameworkCode)
      });
      
      toast({
        title: "Task updated",
        description: "Task stage has been updated",
      });
    } catch (error) {
      console.error("Error updating task stage:", error);
    }
  };

  // Handle task inclusion toggle
  const handleInclusionToggle = async (taskId: string, frameworkCode: string) => {
    if (!projectId) return;
    
    const currentlyIncluded = isTaskIncluded(taskId, frameworkCode);
    
    try {
      await saveTaskMutation.mutateAsync({
        projectId,
        taskId,
        frameworkCode,
        stage: getTaskStage(taskId, frameworkCode),
        included: !currentlyIncluded
      });
      
      toast({
        title: currentlyIncluded ? "Task removed" : "Task added",
        description: currentlyIncluded 
          ? "Task removed from your checklist" 
          : "Task added to your checklist",
      });
    } catch (error) {
      console.error("Error toggling task inclusion:", error);
    }
  };

  // Helper to check if a task is included in the checklist
  const isTaskIncluded = (taskId: string, frameworkCode: string): boolean => {
    if (!frameworkTasks?.savedTasks) return false;
    
    const savedTask = frameworkTasks.savedTasks.find(
      task => task.taskId === taskId && task.frameworkCode === frameworkCode
    );
    
    return savedTask ? savedTask.included : false;
  };

  // Helper to get task stage
  const getTaskStage = (taskId: string, frameworkCode: string): string => {
    if (!frameworkTasks?.savedTasks) return 'Identification';
    
    const savedTask = frameworkTasks.savedTasks.find(
      task => task.taskId === taskId && task.frameworkCode === frameworkCode
    );
    
    return savedTask ? savedTask.stage : 'Identification';
  };

  // Save all data to plan context
  const saveToContext = async () => {
    if (!projectId || !frameworkTasks?.savedTasks) return;
    
    setIsSaving(true);
    try {
      // Save selected tasks to plan context for persistence
      await saveBlock('block3', {
        frameworkTasks: frameworkTasks.savedTasks
      });
      
      toast({
        title: "Tasks saved",
        description: "Your task selections have been saved successfully",
      });
    } catch (error) {
      console.error("Error saving to context:", error);
      toast({
        title: "Error saving tasks",
        description: "Failed to save your task selections",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Mark step as complete and navigate to next step
  const handleComplete = async () => {
    if (!projectId) return;
    
    // Save current state before marking complete
    await saveToContext();
    
    // Mark this step as complete
    await updateToolProgress(projectId, 'make-a-plan', 'block-3-step-7', { completed: true });
    
    // Navigate to block-3 summary page
    navigate(`/make-a-plan/${projectId}/block-3/summary`);
  };

  // Check if any tasks are selected
  const hasSelectedTasks = (): boolean => {
    if (!frameworkTasks?.savedTasks) return false;
    return frameworkTasks.savedTasks.some(task => task.included);
  };

  // Loading state
  if (isLoadingTasks) {
    return (
      <MakeAPlanLayout
        title="Add Framework Tasks"
        description="Add good practice tasks from your selected frameworks"
        currentStep={7}
        block={3}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg text-muted-foreground">Loading framework tasks...</span>
        </div>
      </MakeAPlanLayout>
    );
  }

  // No frameworks selected state
  if (!frameworkTasks || !frameworkTasks.frameworks || Object.keys(frameworkTasks.frameworks).length === 0) {
    return (
      <MakeAPlanLayout
        title="Add Framework Tasks"
        description="Add good practice tasks from your selected frameworks"
        currentStep={7}
        block={3}
      >
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>No Frameworks Selected</CardTitle>
            <CardDescription>
              You haven't selected any frameworks in the previous step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please go back to Step 6 and select at least one framework to see tasks here.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => navigate(`/make-a-plan/${projectId}/block-3/step-6`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Framework Selection
            </Button>
          </CardFooter>
        </Card>
        
        <StepNavigation
          prevLink={`/make-a-plan/${projectId}/block-3/step-6`}
          nextLink={`/make-a-plan/${projectId}/block-3/summary`}
          disableComplete={true}
        />
      </MakeAPlanLayout>
    );
  }

  return (
    <MakeAPlanLayout
      title="Add Framework Tasks"
      description="Add good practice tasks from your selected frameworks"
      currentStep={7}
      block={3}
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Framework Tasks</CardTitle>
          <CardDescription>
            Select which tasks to include in your project checklist and assign them to project stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(frameworkTasks.frameworks).map(([frameworkCode, framework]) => (
            <div key={frameworkCode} className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <ClipboardList className="h-5 w-5 mr-2 text-tcof-teal" />
                {FRAMEWORK_NAMES[frameworkCode as keyof typeof FRAMEWORK_NAMES] || frameworkCode}
              </h3>
              
              <div className="space-y-4">
                {framework.tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-start p-4 rounded-lg border border-gray-200"
                  >
                    <Checkbox 
                      id={`task-${task.id}`}
                      checked={isTaskIncluded(task.id, frameworkCode)}
                      onCheckedChange={() => handleInclusionToggle(task.id, frameworkCode)}
                      className="mt-1"
                    />
                    
                    <div className="space-y-1">
                      <Label
                        htmlFor={`task-${task.id}`}
                        className="font-medium text-md"
                      >
                        {task.name}
                      </Label>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                    
                    <div className="w-full md:w-40">
                      <Label htmlFor={`stage-${task.id}`} className="mb-1 block text-sm">
                        Project Stage
                      </Label>
                      <Select 
                        value={getTaskStage(task.id, frameworkCode)} 
                        onValueChange={(value) => handleStageChange(task.id, frameworkCode, value)}
                      >
                        <SelectTrigger id={`stage-${task.id}`} className="w-full">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(`/make-a-plan/${projectId}/block-3/step-6`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={saveToContext}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" /> 
              )}
              Save Progress
            </Button>
            <Button
              disabled={!hasSelectedTasks() || isSaving}
              onClick={handleComplete}
            >
              Complete <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <StepNavigation
        prevLink={`/make-a-plan/${projectId}/block-3/step-6`}
        nextLink={`/make-a-plan/${projectId}/block-3/summary`}
        onComplete={handleComplete}
        nextDisabled={!hasSelectedTasks()}
      />
    </MakeAPlanLayout>
  );
}