import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

interface TaskListProps {
  tasks: string[];
  onAddTask: () => void;
  onUpdateTask: (index: number, newText: string) => void;
  onDeleteTask: (index: number) => void;
}

export default function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TaskListProps) {
  // Debug the tasks array when it changes
  useEffect(() => {
    console.debug(`TaskList rendered with ${tasks?.length || 0} tasks`);
    if (!tasks) {
      console.warn('⚠️ TaskList received null or undefined tasks array');
    } else if (!Array.isArray(tasks)) {
      console.error('❌ TaskList received non-array tasks:', tasks);
    }
  }, [tasks]);
  
  // Safely normalize the tasks array to prevent runtime errors
  const normalizedTasks = Array.isArray(tasks) ? tasks : [];
  
  // Show a warning if tasks is not an array
  if (!Array.isArray(tasks)) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-center text-amber-800">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold">Invalid tasks data structure</p>
            <p className="text-sm mt-1">The component received invalid task data. Please check the console for details.</p>
          </div>
        </div>
        
        <Button 
          onClick={onAddTask}
          variant="outline"
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Task
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {normalizedTasks.length === 0 ? (
        <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-md">
          No tasks for this stage. Click 'Add New Task' to create one.
        </div>
      ) : (
        normalizedTasks.map((task, index) => (
          <div key={`task-${index}`} className="flex items-center space-x-2">
            <Input
              value={task}
              onChange={(e) => onUpdateTask(index, e.target.value)}
              className="flex-1"
              placeholder="Enter task description..."
            />
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => onDeleteTask(index)}
              title="Delete task"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}
      
      <Button 
        onClick={onAddTask}
        variant="outline"
        className="w-full mt-4"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Task
      </Button>
    </div>
  );
}