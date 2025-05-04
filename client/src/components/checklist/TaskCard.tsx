import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Circle, 
  CheckCircle, 
  Edit, 
  Clock, 
  MoreHorizontal,
  Calendar
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskPriority } from '@/lib/plan-db';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface TaskUpdates {
  completed?: boolean;
  notes?: string;
  priority?: TaskPriority | undefined;
  dueDate?: string | undefined;
}

interface TaskCardProps {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  stage: string;
  source: 'heuristic' | 'factor' | 'custom' | 'framework';
  sourceName?: string;
  frameworkCode?: string;
  isGoodPractice?: boolean;
  onUpdate: (id: string, updates: TaskUpdates, isGoodPractice?: boolean) => void;
}

export default function TaskCard({
  id,
  text,
  completed,
  notes = '',
  priority,
  dueDate,
  stage,
  source,
  sourceName,
  frameworkCode,
  isGoodPractice = false,
  onUpdate
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(notes);
  
  // Handle task completion toggle
  const handleToggleCompleted = () => {
    onUpdate(id, { completed: !completed }, isGoodPractice);
  };
  
  // Handle priority change
  const handlePriorityChange = (newPriority: TaskPriority | undefined) => {
    onUpdate(id, { priority: newPriority }, isGoodPractice);
  };
  
  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    // Convert Date to ISO string, or undefined if no date
    const dateString = date ? date.toISOString() : undefined;
    onUpdate(id, { dueDate: dateString }, isGoodPractice);
  };
  
  // Handle notes update
  const handleNotesUpdate = () => {
    onUpdate(id, { notes: noteText }, isGoodPractice);
    setIsEditing(false);
  };
  
  const getPriorityColor = (priorityValue?: TaskPriority): string => {
    switch (priorityValue) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getSourceBadgeColor = (): string => {
    if (isGoodPractice || source === 'framework') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    
    switch (source) {
      case 'heuristic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'factor':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getSourceLabel = (): string => {
    if (isGoodPractice) {
      return frameworkCode ? `Framework: ${frameworkCode}` : 'Framework';
    }
    
    switch (source) {
      case 'heuristic':
        return 'Personal Heuristic';
      case 'factor':
        return sourceName ? `Success Factor: ${sourceName}` : 'Success Factor';
      default:
        return 'Task';
    }
  };
  
  return (
    <div className={cn(
      'p-4 border rounded-md transition-colors',
      completed ? 'bg-gray-50' : 'bg-white'
    )}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-1">
          <button
            onClick={handleToggleCompleted}
            className="text-gray-400 hover:text-gray-600"
            aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {completed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>
        </div>
        
        <div className="flex-grow">
          <p className={cn(
            'text-sm font-medium',
            completed && 'line-through text-gray-500'
          )}>
            {text}
          </p>
          
          {/* Notes section */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add notes..."
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNoteText(notes);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleNotesUpdate}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : notes ? (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <div className="flex justify-between">
                <span className="font-medium">Notes:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
              <p className="whitespace-pre-wrap mt-1">{notes}</p>
            </div>
          ) : null}
          
          {/* Tags & metadata */}
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Priority indicator */}
            {priority && (
              <Badge variant="outline" className={getPriorityColor(priority)}>
                {priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low'} Priority
              </Badge>
            )}
            
            {/* Due date indicator */}
            {dueDate && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Due: {format(new Date(dueDate), 'MMM d, yyyy')}
              </Badge>
            )}
            
            {/* Source type indicator */}
            <Badge variant="outline" className={getSourceBadgeColor()}>
              {getSourceLabel()}
            </Badge>
            
            {/* Stage indicator */}
            <Badge variant="outline" className="bg-gray-100 text-gray-800">
              {stage}
            </Badge>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                Add Notes
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handlePriorityChange('high')}>
                Set High Priority
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handlePriorityChange('medium')}>
                Set Medium Priority
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handlePriorityChange('low')}>
                Set Low Priority
              </DropdownMenuItem>
              
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Set Due Date
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate ? new Date(dueDate) : undefined}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {dueDate && (
                <DropdownMenuItem onClick={() => handleDateChange(undefined)}>
                  Clear Due Date
                </DropdownMenuItem>
              )}
              
              {priority && (
                <DropdownMenuItem onClick={() => handlePriorityChange(undefined)}>
                  Clear Priority
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}