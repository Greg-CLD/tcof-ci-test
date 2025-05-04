import React, { useState, useEffect } from 'react';
import { ChevronRight, GripVertical, PlusCircle } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import TaskCard, { TaskUpdates } from './TaskCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  PlanRecord, 
  Stage, 
  TaskItem, 
  GoodPracticeTask, 
  TaskPriority 
} from '@/lib/plan-db';
import { Badge } from '@/components/ui/badge';
import { savePlan } from '@/lib/plan-db';
import { getLatestPlanId } from '@/lib/planHelpers';
import { v4 as uuidv4 } from 'uuid';

interface StageAccordionProps {
  stage: Stage;
  plan: PlanRecord;
  onPlanUpdate: (updatedPlan: PlanRecord) => void;
  stageFilter: string;
  statusFilter: string;
  sourceFilter: string;
}

const stageDescriptions: Record<Stage, string> = {
  'Identification': 'Discover and assess project requirements and constraints',
  'Definition': 'Outline scope, objectives, and success criteria',
  'Delivery': 'Execute project activities and manage progress',
  'Closure': 'Conclude project, capture lessons, and transition to operations'
};

const stageEmojis: Record<Stage, string> = {
  'Identification': '🔍',
  'Definition': '📝',
  'Delivery': '🚀',
  'Closure': '🏁'
};

// Type definition for draggable item
interface SortableTaskCardProps {
  id: string;
  task: TaskItem | GoodPracticeTask;
  stage: Stage;
  isGoodPractice: boolean;
  sourceName?: string;
  onUpdate: (taskId: string, updates: TaskUpdates, isGoodPractice: boolean) => void;
}

function SortableTaskCard({
  id,
  task,
  stage,
  isGoodPractice,
  sourceName,
  onUpdate
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1
  };
  
  // Get the source type for the task
  const getTaskSource = (): 'heuristic' | 'factor' | 'custom' | 'framework' => {
    if (isGoodPractice) return 'framework';
    
    if ('origin' in task) {
      // Regular task
      return task.origin === 'heuristic' ? 'heuristic' : 
             task.origin === 'factor' ? 'factor' : 'custom';
    }
    
    // Good practice task
    return 'framework';
  };
  
  // Get framework code for good practice tasks
  const getFrameworkCode = (): string | undefined => {
    if (isGoodPractice && 'frameworkCode' in task) {
      return task.frameworkCode;
    }
    return undefined;
  };
  
  // Get owner from task if available
  const getOwner = (): string | undefined => {
    // We don't currently store owner, but the TaskCard expects it
    return undefined;
  };
  
  // Get status from task if available or derive from completed
  const getStatus = (): 'To Do' | 'Working On It' | 'Done' => {
    return task.completed ? 'Done' : 'To Do';
  };
  
  const dragHandleProps = {
    ...attributes,
    ...listeners
  };
  
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        id={task.id}
        text={task.text}
        completed={task.completed || false}
        notes={task.notes}
        priority={task.priority}
        dueDate={task.dueDate}
        owner={getOwner()}
        status={getStatus()}
        stage={stage}
        source={getTaskSource()}
        sourceName={sourceName}
        frameworkCode={getFrameworkCode()}
        isGoodPractice={isGoodPractice}
        onUpdate={onUpdate}
        dragHandleProps={dragHandleProps}
      />
    </div>
  );
}

export default function StageAccordion({ 
  stage, 
  plan, 
  onPlanUpdate,
  stageFilter,
  statusFilter,
  sourceFilter 
}: StageAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();
  
  // Get tasks for this stage
  const tasks = plan.stages[stage].tasks || [];
  const gpTasks = plan.stages[stage].goodPractice?.tasks || [];
  
  // Count total tasks in this stage
  const totalTasks = tasks.length + gpTasks.length;
  const completedTasks = 
    tasks.filter(t => t.completed).length + 
    gpTasks.filter(t => t.completed).length;
  
  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 }}),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // Handle task update (completed status, notes, priority, due date, etc.)
  const handleTaskUpdate = (taskId: string, updates: TaskUpdates, isGoodPractice = false) => {
    const updatedPlan = { ...plan };
    
    if (isGoodPractice) {
      // Update good practice task
      const taskIndex = updatedPlan.stages[stage].goodPractice?.tasks?.findIndex(t => t.id === taskId) ?? -1;
      if (taskIndex === -1 || !updatedPlan.stages[stage].goodPractice?.tasks) return;
      
      const task = updatedPlan.stages[stage].goodPractice.tasks[taskIndex];
      
      // Update task properties
      if (updates.completed !== undefined) task.completed = updates.completed;
      if (updates.notes !== undefined) task.notes = updates.notes;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.dueDate !== undefined) {
        // Convert null to undefined
        task.dueDate = updates.dueDate === null ? undefined : updates.dueDate;
      }
      if (updates.title !== undefined) {
        task.text = updates.title;
      }
      // Other properties like owner and status are currently not stored in the model
    } else {
      // Update regular task
      const taskIndex = updatedPlan.stages[stage].tasks?.findIndex(t => t.id === taskId) ?? -1;
      if (taskIndex === -1 || !updatedPlan.stages[stage].tasks) return;
      
      const task = updatedPlan.stages[stage].tasks[taskIndex];
      
      // Update task properties
      if (updates.completed !== undefined) task.completed = updates.completed;
      if (updates.notes !== undefined) task.notes = updates.notes;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.dueDate !== undefined) {
        // Convert null to undefined
        task.dueDate = updates.dueDate === null ? undefined : updates.dueDate;
      }
      if (updates.title !== undefined) {
        task.text = updates.title;
      }
      // Other properties like owner and status are currently not stored in the model
    }
    
    // Save plan and update UI
    const planId = getLatestPlanId();
    if (planId) {
      savePlan(planId, updatedPlan);
      onPlanUpdate(updatedPlan);
      
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      });
    }
  };
  
  // Handle drag end event for reordering tasks
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const updatedPlan = { ...plan };
    
    // Determine if the task is a regular task or good practice task
    const isGoodPractice = active.id.toString().startsWith('gp-');
    
    if (isGoodPractice) {
      // Handle reordering of good practice tasks
      const gpTasks = [...(updatedPlan.stages[stage].goodPractice?.tasks || [])];
      const fromIndex = gpTasks.findIndex(t => t.id === active.id.toString().replace('gp-', ''));
      const toIndex = gpTasks.findIndex(t => t.id === over.id.toString().replace('gp-', ''));
      
      if (fromIndex !== -1 && toIndex !== -1) {
        // Move the task from old position to new position
        const [movedTask] = gpTasks.splice(fromIndex, 1);
        gpTasks.splice(toIndex, 0, movedTask);
        
        // Update the plan with reordered tasks
        if (updatedPlan.stages[stage].goodPractice) {
          updatedPlan.stages[stage].goodPractice.tasks = gpTasks;
        }
      }
    } else {
      // Handle reordering of regular tasks
      const tasks = [...(updatedPlan.stages[stage].tasks || [])];
      const fromIndex = tasks.findIndex(t => t.id === active.id);
      const toIndex = tasks.findIndex(t => t.id === over.id);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        // Move the task from old position to new position
        const [movedTask] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, movedTask);
        
        // Update the plan with reordered tasks
        updatedPlan.stages[stage].tasks = tasks;
      }
    }
    
    // Save the updated plan
    const planId = getLatestPlanId();
    if (planId) {
      savePlan(planId, updatedPlan);
      onPlanUpdate(updatedPlan);
      
      toast({
        title: "Tasks reordered",
        description: "Task order has been updated.",
      });
    }
  };
  
  // Add a new task to this stage
  const handleAddTask = () => {
    const updatedPlan = { ...plan };
    
    // Create a new task with default values
    const newTask: TaskItem = {
      id: uuidv4(),
      text: "New task", // Default text
      stage,
      origin: 'custom', // Mark as a custom task
      completed: false
    };
    
    // Add the task to the plan
    updatedPlan.stages[stage].tasks = [
      ...(updatedPlan.stages[stage].tasks || []),
      newTask
    ];
    
    // Save the updated plan
    const planId = getLatestPlanId();
    if (planId) {
      savePlan(planId, updatedPlan);
      onPlanUpdate(updatedPlan);
      
      toast({
        title: "Task added",
        description: "New task has been added.",
      });
    }
  };
  
  // Filter tasks based on the current filters
  const filterTasks = () => {
    let filteredTasks = [...tasks];
    let filteredGpTasks = [...gpTasks];
    
    // Apply status filter
    if (statusFilter === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed);
      filteredGpTasks = filteredGpTasks.filter(task => task.completed);
    } else if (statusFilter === 'open') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
      filteredGpTasks = filteredGpTasks.filter(task => !task.completed);
    }
    
    // Apply source filter
    if (sourceFilter === 'heuristic') {
      filteredTasks = filteredTasks.filter(task => task.origin === 'heuristic');
      filteredGpTasks = [];
    } else if (sourceFilter === 'factor') {
      filteredTasks = filteredTasks.filter(task => task.origin === 'factor');
      filteredGpTasks = [];
    } else if (sourceFilter === 'framework') {
      filteredTasks = [];
      // Good practice tasks are already framework tasks
    }
    
    return { filteredTasks, filteredGpTasks };
  };
  
  // Get filtered tasks
  const { filteredTasks, filteredGpTasks } = filterTasks();
  
  // Skip rendering this stage if there are no tasks that match the filters
  if (filteredTasks.length === 0 && filteredGpTasks.length === 0) {
    return null;
  }
  
  // Generate drag IDs for tasks (regular tasks use their ID, good practice tasks prefix with 'gp-')
  const regularTaskIds = filteredTasks.map(task => task.id);
  const gpTaskIds = filteredGpTasks.map(task => `gp-${task.id}`);
  const allTaskIds = [...regularTaskIds, ...gpTaskIds];
  
  return (
    <div className="mb-6 border rounded-md shadow-sm bg-white overflow-hidden">
      {/* Stage header */}
      <div 
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          isOpen ? "bg-tcof-teal/10 border-b" : "hover:bg-gray-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <ChevronRight 
            className={cn("h-5 w-5 mr-2 text-tcof-teal transition-transform", 
              isOpen && "transform rotate-90"
            )} 
          />
          <div>
            <h2 className="text-lg font-semibold text-tcof-dark">{stage} Stage</h2>
            <p className="text-sm text-gray-500">{stageDescriptions[stage]}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">{stageEmojis[stage]}</span>
          <Badge variant="outline" className="bg-white">
            {completedTasks}/{totalTasks} complete
          </Badge>
        </div>
      </div>
      
      {/* Stage content */}
      {isOpen && (
        <div className="p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {/* Render regular tasks */}
                {filteredTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    id={task.id}
                    task={task}
                    stage={stage}
                    isGoodPractice={false}
                    sourceName={task.origin === 'factor' ? 'Success Factor' : undefined}
                    onUpdate={handleTaskUpdate}
                  />
                ))}
                
                {/* Render good practice tasks */}
                {filteredGpTasks.map((task) => (
                  <SortableTaskCard
                    key={`gp-${task.id}`}
                    id={`gp-${task.id}`}
                    task={task}
                    stage={stage}
                    isGoodPractice={true}
                    onUpdate={handleTaskUpdate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {/* Add task button */}
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
              onClick={handleAddTask}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Task
            </Button>
          </div>
          
          {/* Show no tasks message when filtered but no results */}
          {filteredTasks.length === 0 && filteredGpTasks.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              <p>No tasks match the current filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}