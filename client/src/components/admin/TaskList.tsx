import React, { useState, useEffect } from 'react';
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
  // Use local state to manage task edits
  const [localTasks, setLocalTasks] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Sync local tasks with props when they change
  useEffect(() => {
    setLocalTasks(Array.isArray(tasks) ? [...tasks] : []);
  }, [tasks]);
  
  // Handle local task edit
  const handleTaskEdit = (index: number, value: string) => {
    const updatedTasks = [...localTasks];
    updatedTasks[index] = value;
    setLocalTasks(updatedTasks);
  };
  
  // Handle task save on blur (when user clicks away)
  const handleTaskSave = (index: number) => {
    setEditingIndex(null);
    if (localTasks[index] !== tasks[index]) {
      onUpdateTask(index, localTasks[index]);
    }
  };
  
  // Handle keydown events (Enter to save, Escape to cancel)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTaskSave(index);
    } else if (e.key === 'Escape') {
      // Reset to original value
      const updatedTasks = [...localTasks];
      updatedTasks[index] = tasks[index];
      setLocalTasks(updatedTasks);
      setEditingIndex(null);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      
      {localTasks.length === 0 ? (
        <div className="text-center p-4 text-gray-500 bg-gray-50 rounded-md">
          No tasks yet
        </div>
      ) : (
        <div className="space-y-2">
          {localTasks.map((task, index) => (
            <div key={`task-${index}`} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
              <Checkbox id={`${title}-task-${index}`} />
              <div className="flex-1">
                <Input
                  value={localTasks[index] || ''}
                  onChange={(e) => handleTaskEdit(index, e.target.value)}
                  onFocus={() => setEditingIndex(index)}
                  onBlur={() => handleTaskSave(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
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