import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Circle, 
  CheckCircle, 
  Edit, 
  Save,
  X, 
  MoreHorizontal,
  Calendar,
  GripVertical,
  User,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskPriority } from '@/lib/plan-db';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TaskUpdates {
  text?: string;
  completed?: boolean;
  notes?: string;
  priority?: TaskPriority | undefined;
  dueDate?: string | undefined;
  owner?: string;
  status?: 'To Do' | 'Working On It' | 'Done';
  stage?: 'identification' | 'definition' | 'delivery' | 'closure';
  origin?: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId?: string;
}

interface TaskCardProps {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  owner?: string;
  status?: 'To Do' | 'Working On It' | 'Done';
  stage: string;
  source: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceName?: string;
  frameworkCode?: string;
  isGoodPractice?: boolean;
  origin?: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceId?: string;
  onUpdate: (id: string, updates: TaskUpdates, isGoodPractice?: boolean) => void;
  onDelete?: (id: string) => void;
  dragHandleProps?: any;
}

export default function TaskCard({
  id,
  text,
  completed,
  notes = '',
  priority,
  dueDate,
  owner = '',
  status = 'To Do',
  stage,
  source,
  sourceName,
  frameworkCode,
  isGoodPractice = false,
  onUpdate,
  onDelete,
  dragHandleProps
}: TaskCardProps) {
  // TRACE: Log task ID and completion state on render
  console.debug(`[TRACE_UI] TaskCard rendered:
  - Task ID: ${id}
  - Completed: ${completed}
  - Source: ${source}
  - Stage: ${stage}`);

  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTaskTitle, setEditedTaskTitle] = useState(text);
  const [editedNotes, setEditedNotes] = useState(notes);
  const [editedOwner, setEditedOwner] = useState(owner);
  const [editedStatus, setEditedStatus] = useState<'To Do' | 'Working On It' | 'Done'>(
    completed ? 'Done' : (status || 'To Do')
  );

  // Extract the actual task title without auto-IDs or prefixes
  const getCleanTaskTitle = (taskText: string): string => {
    // Check if the task has an auto-id prefix like "Auto-id-1746387431125-512"
    if (taskText.startsWith('Auto-id-')) {
      const lastDashIndex = taskText.lastIndexOf('-');
      if (lastDashIndex > 0 && lastDashIndex < taskText.length - 1) {
        const possibleEndOfAutoId = taskText.indexOf(':', lastDashIndex);
        if (possibleEndOfAutoId > lastDashIndex) {
          return taskText.substring(possibleEndOfAutoId + 1).trim();
        }
      }
    }

    // If it doesn't match the auto-id pattern, return the original text
    return taskText;
  };

  // Get the clean task title
  const cleanTaskTitle = getCleanTaskTitle(text);

  /**
   * Helper function to validate UUID v4 format
   * @param str String to check for UUID validity
   * @returns true if string is a valid UUID, false otherwise
   */
  const isValidUUID = (str: any): boolean => {
    if (!str) return false;
    if (typeof str !== 'string') return false;
    if (!str.trim()) return false;
    
    // Strict UUID v4 validation pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(str.trim());
  };

  // Handle task completion toggle
  const handleToggleCompleted = () => {
    // Ensure we always have a valid task ID
    if (!id) {
      console.error('[TASK_ERROR] Missing required task ID, cannot update task');
      return;
    }

    // Safely handle potentially undefined props using proper types
    const safeOrigin = typeof origin !== 'undefined' ? 
      origin as TaskUpdates['origin'] : null;
      
    const safeSourceId = typeof sourceId !== 'undefined' && sourceId !== null ? 
      String(sourceId) : null;
    
    // Determine if we have a valid sourceId for a Success Factor task
    const isFactorTask = source === 'factor' || safeOrigin === 'factor';
    const hasValidSourceId = isFactorTask && safeSourceId !== null && isValidUUID(safeSourceId);
    
    // Debug log all props with validation info
    console.debug('[TASK_PROPS]', {
      id, 
      text, 
      completed,
      source,
      origin: safeOrigin,
      sourceId: safeSourceId,
      sourceIdValid: hasValidSourceId ? 'Yes' : 'No',
      stage, 
      status
    });

    // Type-safe status assignment
    const newStatus = !completed ? 'Done' : 'To Do' as const;
    setEditedStatus(newStatus);

    // Choose the most appropriate ID to use for the update
    // For Success Factor tasks with valid sourceId, use sourceId
    // Otherwise fall back to the task's id
    const updateId = hasValidSourceId ? safeSourceId : id;
    
    // Detailed debug logging for task update
    console.debug(`[TASK_UPDATE] Toggle task completion:
    - Using ID: ${updateId} (${hasValidSourceId ? 'valid sourceId' : 'fallback to id'})
    - Original ID: ${id}
    - Source ID: ${safeSourceId || 'N/A'}
    - Source ID Valid UUID: ${hasValidSourceId ? 'Yes' : 'No'}
    - Origin: ${safeOrigin || 'N/A'}
    - Source: ${source}
    - Is Factor Task: ${isFactorTask ? 'Yes' : 'No'}
    - New completed state: ${!completed}
    - New status: ${newStatus}`);
    
    // Create update object with type-safe fields
    const updateData: TaskUpdates = {
      completed: !completed,
      status: newStatus,
    };
    
    // Only include origin if it exists and as the correct type
    if (safeOrigin || source) {
      const originValue = safeOrigin || source;
      // This type assertion is safe because both origin and source are either
      // one of the allowed values or undefined
      updateData.origin = originValue as TaskUpdates['origin'];
    }
    
    // Only include sourceId if it exists
    if (safeSourceId) {
      updateData.sourceId = safeSourceId;
    }
    
    // Send the update with validated ID and clean payload
    onUpdate(updateId, updateData, isGoodPractice);
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

  // Handle save all edited details
  const handleSaveEdits = () => {
    const isCompletedStatus = editedStatus === 'Done';

    onUpdate(id, {
      text: editedTaskTitle,
      notes: editedNotes,
      owner: editedOwner,
      status: editedStatus,
      completed: isCompletedStatus
    }, isGoodPractice);

    setIsExpanded(false);
  };

  // Handle cancel edits
  const handleCancelEdits = () => {
    setEditedTaskTitle(text);
    setEditedNotes(notes);
    setEditedOwner(owner);
    setEditedStatus(completed ? 'Done' : (status || 'To Do'));
    setIsExpanded(false);
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
      return 'bg-purple-100 text-purple-800 border-purple-200'; // Good Practice (purple)
    }

    switch (source) {
      case 'heuristic':
        return 'bg-blue-100 text-blue-800 border-blue-200'; // Personal Heuristic (blue)
      case 'factor':
        return 'bg-green-100 text-green-800 border-green-200'; // Success Factor (green)
      case 'policy':
        return 'bg-amber-100 text-amber-800 border-amber-200'; // Company Policy (amber/yellow)
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'; // Custom Task (gray)
    }
  };

  const getSourceLabel = (): string => {
    // Handle special case for good practice tasks with framework code
    if (isGoodPractice) {
      return frameworkCode ? `Good Practice: ${frameworkCode}` : 'Good Practice';
    }

    // Use the origin labels from constants file
    // Import directly here to avoid circular dependencies with Checklist.tsx
    const originLabels: Record<string, string> = {
      heuristic: 'Your Heuristic',
      factor: 'TCOF Success Factor',
      policy: 'Policy', 
      custom: 'General',
      framework: 'Good Practice'
    };

    // Add the source name for factors if available
    if (source === 'factor' && sourceName) {
      return `${originLabels[source]}: ${sourceName}`;
    }

    // Return the mapped friendly label or a default
    return originLabels[source] || 'Custom Task';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Working On It':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default: // 'To Do'
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={cn(
      'p-4 border rounded-md transition-colors',
      completed || status === 'Done' ? 'bg-gray-50' : 'bg-white',
      isExpanded && 'ring-2 ring-tcof-teal/30'
    )}>
      {/* Collapsed View */}
      {!isExpanded ? (
        <div className="flex gap-3">
          {/* Drag handle */}
          {dragHandleProps && (
            <div className="flex-shrink-0 pt-1 cursor-grab touch-none" {...dragHandleProps}>
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
          )}

          {/* Completion checkbox */}
          <div className="flex-shrink-0 pt-1">
            <button
              onClick={handleToggleCompleted}
              className="text-gray-400 hover:text-gray-600"
              aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {completed || status === 'Done' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Task content */}
          <div className="flex-grow">
            <button 
              className="text-left w-full"
              onClick={() => setIsExpanded(true)}
            >
              <div className="flex items-center">
                <p className={cn(
                  'text-sm font-medium flex-grow',
                  (completed || status === 'Done') && 'line-through text-gray-500'
                )}>
                  {cleanTaskTitle}
                </p>

                {/* Warning icon for unassigned tasks */}
                {!owner && !completed && (
                  <div className="ml-2 group relative" data-testid="unassigned-warning">
                    <AlertTriangle className="h-4 w-4 text-amber-500 warning-icon" />
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 right-0 bottom-full mb-1 whitespace-nowrap z-10">
                      Assign an owner to this task
                    </div>
                  </div>
                )}
              </div>

              {notes && (
                <div className="mt-1 text-xs text-gray-600 truncate">
                  {notes}
                </div>
              )}

              {/* Tags & metadata */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Priority indicator */}
                {priority && (
                  <Badge variant="outline" className={getPriorityColor(priority)}>
                    {priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low'} Priority
                  </Badge>
                )}

                {/* Status indicator */}
                <Badge variant="outline" className={getStatusColor(status)}>
                  {status}
                </Badge>

                {/* Owner indicator */}
                {owner && (
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-200">
                    Owner: {owner}
                  </Badge>
                )}

                {/* Due date indicator */}
                {dueDate && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    Due: {format(new Date(dueDate), 'MMM d, yyyy')}
                  </Badge>
                )}

                {/* Source type indicator - hidden in collapsed view
                <Badge variant="outline" className={getSourceBadgeColor()}>
                  {getSourceLabel()}
                </Badge>
                */}
              </div>
            </button>
          </div>

          {/* Actions menu */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsExpanded(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task Details
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handlePriorityChange('high')}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Set High Priority
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handlePriorityChange('medium')}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                  Set Medium Priority
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handlePriorityChange('low')}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-blue-500" />
                  Set Low Priority
                </DropdownMenuItem>

                {onDelete && source !== 'factor' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Delete Task
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

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

                <DropdownMenuSeparator />

                {/* Send via Email option */}
                <DropdownMenuItem 
                  onClick={() => {
                    // Create a mailto link with task information
                    const subject = "Task Assignment";
                    const body = `Task: ${cleanTaskTitle}\n\nDue: ${dueDate ? format(new Date(dueDate), 'MMM d, yyyy') : 'No due date'}\n\nAssigned to: ${owner || 'Unassigned'}\n\nStatus: ${status}\n\nNotes: ${notes || 'None'}`;
                    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  }}
                  data-testid="send-via-email-button"
                >
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Send via Email
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        // Expanded Edit Mode
        <div className="space-y-4">
          {/* Task Title */}
          <div>
            <Label htmlFor={`task-title-${id}`} className="text-sm font-medium mb-1">
              Task Title
            </Label>
            <Input
              id={`task-title-${id}`}
              value={editedTaskTitle}
              onChange={(e) => setEditedTaskTitle(e.target.value)}
              className="mt-1"
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor={`task-notes-${id}`} className="text-sm font-medium mb-1">
              Description (optional)
            </Label>
            <Textarea
              id={`task-notes-${id}`}
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              className="min-h-[80px] mt-1"
              placeholder="Add notes or description..."
            />
          </div>

          {/* Owner */}
          <div>
            <Label htmlFor={`task-owner-${id}`} className="text-sm font-medium mb-1">
              Owner (optional)
            </Label>
            <div className="relative mt-1">
              <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id={`task-owner-${id}`}
                value={editedOwner}
                onChange={(e) => setEditedOwner(e.target.value)}
                className="pl-8"
                placeholder="Who is responsible for this task?"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor={`task-status-${id}`} className="text-sm font-medium mb-1">
              Status
            </Label>
            <Select 
              value={editedStatus} 
              onValueChange={(value: 'To Do' | 'Working On It' | 'Done') => {
                setEditedStatus(value);
              }}
            >
              <SelectTrigger id={`task-status-${id}`} className="mt-1">
                <SelectValue placeholder="Select task status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="Working On It">Working On It</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metadata tags - in a more compact layout */}
          <div className="pt-2 flex flex-wrap gap-2">
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

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdits}
              className="flex items-center"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdits}
              className="flex items-center"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}