import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface TaskListProps {
  tasks: string[];
  onAddTask: () => void;
  onUpdateTask: (index: number, newText: string) => void;
  onDeleteTask: (index: number) => void;
}

export default function TaskList({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task, index) => (
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
      ))}
      
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