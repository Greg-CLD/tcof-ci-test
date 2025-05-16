import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
// Import Stage type and STAGES constant from plan-db to ensure consistency
import { Stage, STAGES, STAGE_CONFIGS } from '@/lib/plan-db';
// Import origin types and constants
import { TaskOrigin, ORIGIN_LABELS, DEFAULT_ORIGIN, AVAILABLE_ORIGINS } from '@/constants/origin';

interface CreateTaskFormProps {
  projectId: string;
  stage: Stage; // Current active stage (used as default)
  onTaskCreated: () => void;
  isAuthenticated: boolean;
}

export default function CreateTaskForm({ 
  projectId, 
  stage, 
  onTaskCreated,
  isAuthenticated
}: CreateTaskFormProps) {
  const [taskText, setTaskText] = useState('');
  const [selectedStage, setSelectedStage] = useState<Stage>(stage);
  const [selectedOrigin, setSelectedOrigin] = useState<TaskOrigin>(DEFAULT_ORIGIN);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use the project tasks hook to handle task creation and persistence
  const { createTask } = useProjectTasks(projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskText.trim()) {
      toast({
        title: "Task text required",
        description: "Please enter a task description",
        variant: "destructive"
      });
      return;
    }
    
    // Don't attempt to create tasks if not authenticated
    if (!isAuthenticated) {
      console.log('[CREATE_TASK] Cannot create task: not authenticated');
      toast({
        title: "Authentication required",
        description: "Please log in to create tasks",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Generate a unique source ID with a prefix that makes it clearly identifiable
      const sourceId = `${selectedOrigin}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      console.log('[CREATE_TASK] Creating task on server:', { 
        text: taskText, 
        stage: selectedStage,
        origin: selectedOrigin,
        sourceId,
        projectId
      });
      
      // Use the hook's createTask method which handles all cache invalidation
      // and properly manages response formats
      const newTask = await createTask({
        projectId,
        text: taskText,
        stage: selectedStage,
        origin: selectedOrigin,
        sourceId,
        completed: false,
        priority: "medium",
        status: "To Do"
      });
      
      console.log('[CREATE_TASK] Task created successfully:', newTask);
      
      toast({
        title: "Task created",
        description: "New task has been added to the " + getStageLabel(selectedStage) + " stage"
      });
      
      // Clear the form and notify parent
      setTaskText('');
      // Reset origin to default after task creation
      setSelectedOrigin(DEFAULT_ORIGIN);
      onTaskCreated();
      
    } catch (error) {
      console.error('[CREATE_TASK] Error creating task:', error);
      
      // More specific error message based on error type
      let errorMessage = "Failed to create task";
      
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("Authentication")) {
          errorMessage = "Authentication error - please refresh the page and try again";
        } else if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
          errorMessage = "Network error - please check your connection";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Error creating task",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to get the display label for a stage value
  const getStageLabel = (stageValue: string): string => {
    const stageConfig = STAGE_CONFIGS.find(config => config.value.toLowerCase() === stageValue.toLowerCase());
    return stageConfig?.label || stageValue.charAt(0).toUpperCase() + stageValue.slice(1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2 mb-4">
      <div className="flex items-center space-x-2 flex-wrap md:flex-nowrap">
        <Input
          type="text"
          placeholder="Add a new task..."
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          disabled={isSubmitting || !isAuthenticated}
          className="flex-1 min-w-[200px] mb-2 md:mb-0"
        />
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Select
            value={selectedStage}
            onValueChange={(value) => setSelectedStage(value as Stage)}
            disabled={isSubmitting || !isAuthenticated}
          >
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_CONFIGS.map(stageConfig => (
                <SelectItem key={stageConfig.value} value={stageConfig.value.toLowerCase()}>
                  {stageConfig.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={selectedOrigin}
            onValueChange={(value) => setSelectedOrigin(value as TaskOrigin)}
            disabled={isSubmitting || !isAuthenticated}
          >
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Select origin" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_ORIGINS.map(origin => (
                <SelectItem key={origin} value={origin}>
                  {ORIGIN_LABELS[origin]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            type="submit" 
            disabled={isSubmitting || !taskText.trim() || !isAuthenticated}
            size="sm"
            className="whitespace-nowrap"
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </Button>
        </div>
      </div>
    </form>
  );
}