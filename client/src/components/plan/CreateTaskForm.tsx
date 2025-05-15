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
// Import Stage type from plan-db to ensure consistency
import { Stage } from '@/lib/plan-db';

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
      const sourceId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      console.log('[CREATE_TASK] Creating task on server:', { 
        text: taskText, 
        stage: selectedStage, 
        sourceId,
        projectId
      });
      
      // Use the hook's createTask method which handles all cache invalidation
      // and properly manages response formats
      const newTask = await createTask({
        projectId,
        text: taskText,
        stage: selectedStage,
        origin: "custom",
        sourceId,
        completed: false,
        priority: "medium",
        status: "To Do"
      });
      
      console.log('[CREATE_TASK] Task created successfully:', newTask);
      
      toast({
        title: "Task created",
        description: "New task has been added to the " + selectedStage + " stage"
      });
      
      // Clear the form and notify parent
      setTaskText('');
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
  
  // Helper function to format stage name for display
  const formatStageName = (stage: string): string => {
    return stage.charAt(0).toUpperCase() + stage.slice(1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2 mb-4">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Add a new task..."
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          disabled={isSubmitting || !isAuthenticated}
          className="flex-1"
        />
        <Select
          value={selectedStage}
          onValueChange={(value) => setSelectedStage(value as Stage)}
          disabled={isSubmitting || !isAuthenticated}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="identification">{formatStageName("identification")}</SelectItem>
            <SelectItem value="definition">{formatStageName("definition")}</SelectItem>
            <SelectItem value="delivery">{formatStageName("delivery")}</SelectItem>
            <SelectItem value="closure">{formatStageName("closure")}</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          type="submit" 
          disabled={isSubmitting || !taskText.trim() || !isAuthenticated}
          size="sm"
        >
          {isSubmitting ? 'Adding...' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}