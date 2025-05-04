import React, { useState } from 'react';
import { Calendar, Check, Edit2, Save, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import styles from '@/lib/styles/checklist.module.css';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSource = 'heuristic' | 'factor' | 'framework';

export interface TaskCardProps {
  id: string;
  text: string;
  sourceType: TaskSource;
  sourceLabel: string;
  sourceIcon?: string;
  completed?: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: Date | null;
  isDeletable?: boolean;
  onToggleComplete: (id: string, completed: boolean) => void;
  onUpdateTask: (id: string, updates: TaskUpdates) => void;
  onDeleteTask?: (id: string) => void;
}

export interface TaskUpdates {
  text?: string;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: Date | null;
}

export default function TaskCard({
  id,
  text,
  sourceType,
  sourceLabel,
  sourceIcon,
  completed = false,
  notes = '',
  priority,
  dueDate,
  isDeletable = true,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editText, setEditText] = useState(text);
  const [editNotes, setEditNotes] = useState(notes);
  const [editPriority, setEditPriority] = useState<TaskPriority | undefined>(priority);
  const [editDueDate, setEditDueDate] = useState<Date | null | undefined>(dueDate);
  
  // Task source icon and styling
  const getSourceIcon = () => {
    if (sourceIcon) return sourceIcon;
    switch (sourceType) {
      case 'heuristic': return '🔸';
      case 'factor': return '🧱';
      case 'framework': return '📘';
      default: return '📋';
    }
  };
  
  const getSourceClass = () => {
    switch (sourceType) {
      case 'heuristic': return styles.taskBadgeHeuristic;
      case 'factor': return styles.taskBadgeFactor;
      case 'framework': return styles.taskBadgeGp;
      default: return '';
    }
  };
  
  // Handle save edits
  const handleSave = () => {
    if (editText.trim() === '') return;
    
    const updates: TaskUpdates = {};
    
    if (editText !== text) {
      updates.text = editText;
    }
    
    if (editNotes !== notes) {
      updates.notes = editNotes;
    }
    
    if (editPriority !== priority) {
      updates.priority = editPriority;
    }
    
    if (editDueDate !== dueDate) {
      updates.dueDate = editDueDate;
    }
    
    // Only save if something has changed
    if (Object.keys(updates).length > 0) {
      onUpdateTask(id, updates);
    }
    
    setIsEditing(false);
  };
  
  // Handle pressing Enter to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };
  
  // Cancel editing and reset values
  const handleCancel = () => {
    setEditText(text);
    setEditNotes(notes);
    setEditPriority(priority);
    setEditDueDate(dueDate);
    setIsEditing(false);
  };
  
  // Format priority for display
  const formatPriority = (priority?: TaskPriority) => {
    if (!priority) return '';
    
    switch (priority) {
      case 'low': return '⚪ Low';
      case 'medium': return '🔵 Medium';
      case 'high': return '🔴 High';
      default: return '';
    }
  };
  
  // Priority color class
  const getPriorityClass = (priority?: TaskPriority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };
  
  return (
    <div className={cn(
      'bg-white rounded-md shadow-sm border p-3 mb-2',
      completed && 'opacity-70',
      priority && !isEditing && getPriorityClass(priority)
    )}>
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <Checkbox 
          checked={completed}
          onCheckedChange={(checked) => onToggleComplete(id, !!checked)}
          className={cn(
            "mt-1",
            completed && "bg-tcof-teal border-tcof-teal"
          )}
        />
        
        {/* Content */}
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Task text"
                className="w-full"
              />
              
              <div className="flex flex-wrap gap-2">
                <Select 
                  value={editPriority} 
                  onValueChange={(value) => setEditPriority(value as TaskPriority)}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">⚪ Low</SelectItem>
                    <SelectItem value="medium">🔵 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-8 px-2 text-xs flex items-center gap-1"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {editDueDate ? format(editDueDate, 'PP') : 'Due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editDueDate || undefined}
                      onSelect={setEditDueDate}
                      initialFocus
                    />
                    {editDueDate && (
                      <div className="flex justify-end p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditDueDate(null)}
                          className="text-red-500 hover:text-red-600"
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              
              <Textarea 
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes here..."
                className="w-full min-h-[60px]"
              />
              
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className={cn("text-sm mb-1", completed && "line-through text-gray-500")}>
                  {text}
                </div>
                
                <div className="flex items-center gap-1 ml-1 text-gray-400">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  
                  {isDeletable && onDeleteTask && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => onDeleteTask(id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Task metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs font-medium",
                  getSourceClass()
                )}>
                  {getSourceIcon()} {sourceLabel}
                </span>
                
                {priority && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full border text-xs",
                    getPriorityClass(priority)
                  )}>
                    {formatPriority(priority)}
                  </span>
                )}
                
                {dueDate && (
                  <span className="flex items-center gap-0.5 text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {format(dueDate, 'PP')}
                  </span>
                )}
                
                {notes && (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-gray-500 underline"
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    {showNotes ? 'Hide notes' : 'View notes'}
                  </Button>
                )}
              </div>
              
              {/* Notes */}
              {showNotes && notes && (
                <div className="mt-2 pl-2 border-l-2 border-gray-200 text-xs text-gray-600">
                  {notes}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}