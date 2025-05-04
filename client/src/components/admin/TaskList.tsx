import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskListProps {
  title: string;
  tasks: string[];
  onAddTask: () => void;
  onUpdateTask: (index: number, newText: string) => void;
  onDeleteTask: (index: number) => void;
}

export default function TaskList({ title, tasks = [], onAddTask, onUpdateTask, onDeleteTask }: TaskListProps) {
  // At this point we ensure tasks is always a valid array
  const taskList = Array.isArray(tasks) ? tasks : [];
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      
      {taskList.length === 0 ? (
        <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-md">
          No tasks yet
        </div>
      ) : (
        <div className="space-y-2">
          {taskList.map((task, index) => (
            <div key={`task-${index}`} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
              <Checkbox id={`${title}-task-${index}`} />
              <div className="flex-1">
                <Input
                  value={task || ''}
                  onChange={(e) => onUpdateTask(index, e.target.value)}
                  className="border-none bg-transparent focus-visible:ring-0"
                  placeholder="Enter task description..."
                />
              </div>
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => onDeleteTask(index)}
                title="Delete task"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <Button 
        onClick={onAddTask}
        variant="outline"
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add New Task
      </Button>
    </div>
  );
}