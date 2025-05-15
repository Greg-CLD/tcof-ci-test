import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useProjectTasks } from '@/hooks/useProjectTasks';
// Define the Stage type directly here instead of importing
type Stage = 'identification' | 'definition' | 'delivery' | 'closure';

interface CreateTaskFormProps {
  projectId: string;
  stage: Stage;
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
        stage, 
        sourceId,
        projectId
      });
      
      // Use the hook's createTask method which handles all cache invalidation
      // and properly manages response formats
      const newTask = await createTask({
        projectId,
        text: taskText,
        stage,
        origin: "custom",
        sourceId,
        completed: false,
        priority: "medium",
        status: "To Do"
      });
      
      console.log('[CREATE_TASK] Task created successfully:', newTask);
      
      toast({
        title: "Task created",
        description: "New task has been added"
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

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 mb-4">
      <Input
        type="text"
        placeholder="Add a new task..."
        value={taskText}
        onChange={(e) => setTaskText(e.target.value)}
        disabled={isSubmitting || !isAuthenticated}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={isSubmitting || !taskText.trim() || !isAuthenticated}
        size="sm"
      >
        {isSubmitting ? 'Adding...' : 'Add Task'}
      </Button>
    </form>
  );
}