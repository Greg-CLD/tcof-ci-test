import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, AlertTriangle, Bug } from 'lucide-react';

interface TaskListProps {
  tasks: string[];
  onAddTask: () => void;
  onUpdateTask: (index: number, newText: string) => void;
  onDeleteTask: (index: number) => void;
}

export default function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TaskListProps) {
  // Debug the tasks array when it changes
  useEffect(() => {
    console.log(`TaskList Debug:`, {
      hasTasksProp: tasks !== undefined,
      isArray: Array.isArray(tasks),
      length: Array.isArray(tasks) ? tasks.length : 'N/A',
      content: tasks
    });
  }, [tasks]);
  
  // Extra safety check for tasks being undefined or null
  if (tasks === undefined || tasks === null) {
    console.error('⚠️ TaskList received null or undefined tasks array');
    
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center text-red-800">
          <Bug className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold">Missing task data</p>
            <p className="text-sm mt-1">The task list component received no data to display.</p>
          </div>
        </div>
        
        <Button 
          onClick={onAddTask}
          variant="outline"
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add First Task
        </Button>
      </div>
    );
  }
  
  // Check for non-array tasks data
  if (!Array.isArray(tasks)) {
    console.error('❌ TaskList received non-array tasks:', tasks);
    
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-center text-amber-800">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold">Invalid tasks data structure</p>
            <p className="text-sm mt-1">Expected an array of tasks but received something else.</p>
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
  
  // At this point we know tasks is a valid array
  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-md">
          No tasks for this stage. Click 'Add New Task' to create one.
        </div>
      ) : (
        tasks.map((task, index) => (
          <div key={`task-${index}`} className="flex items-center space-x-2">
            <Input
              value={task || ''}
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