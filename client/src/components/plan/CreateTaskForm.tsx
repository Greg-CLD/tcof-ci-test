import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
      
      // Generate a unique source ID
      const sourceId = `custom-${Date.now()}`;
      
      console.log('[CREATE_TASK] Creating task on server:', { text: taskText, stage, sourceId });
      
      // Create task on server
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/tasks`,
        {
          text: taskText,
          stage,
          origin: "custom",
          sourceId
        }
      );
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} when creating task`);
      }
      
      // Get the response body and log
      const data = await response.json();
      console.log('[CREATE_TASK] Task created response:', data);
      
      // Extract the task ID from the response, handling different response formats
      const serverId = data.task?.id || data.id || null;
      
      if (!serverId) {
        throw new Error('No task ID returned from creation response');
      }
      
      toast({
        title: "Task created",
        description: "New task has been added"
      });
      
      // Clear the form and notify parent
      setTaskText('');
      onTaskCreated();
      
    } catch (error) {
      console.error('[CREATE_TASK] Error creating task:', error);
      toast({
        title: "Error creating task",
        description: "Failed to create task",
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