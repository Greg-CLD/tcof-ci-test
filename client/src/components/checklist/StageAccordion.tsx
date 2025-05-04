import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { TaskUpdates } from './TaskCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlanRecord, Stage, TaskItem, GoodPracticeTask, TaskPriority } from '@/lib/plan-db';
import { Badge } from '@/components/ui/badge';
import { savePlan } from '@/lib/plan-db';
import { getLatestPlanId } from '@/lib/planHelpers';

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
  
  // Handle task update (completed status, notes, priority, due date)
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
          <div className="space-y-3">
            {/* Render tasks */}
            {filteredTasks.map((task, index) => (
              <div key={task.id} className="p-3 border rounded-md bg-white">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    checked={task.completed}
                    onChange={() => handleTaskUpdate(task.id, { completed: !task.completed })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.text}</div>
                    {task.notes && (
                      <div className="text-xs text-gray-500 mt-1">{task.notes}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {task.priority && (
                        <Badge variant="outline" className="text-xs">
                          {task.priority === 'high' ? 'High' : 
                           task.priority === 'medium' ? 'Medium' : 'Low'} Priority
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {task.origin === 'heuristic' ? 'Heuristic' : 
                          task.origin === 'factor' ? 'Success Factor' : 'Custom'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Render good practice tasks */}
            {filteredGpTasks.map((task, index) => (
              <div key={task.id} className="p-3 border rounded-md bg-white">
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    checked={task.completed}
                    onChange={() => handleTaskUpdate(task.id, { completed: !task.completed }, true)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.text}</div>
                    {task.notes && (
                      <div className="text-xs text-gray-500 mt-1">{task.notes}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {task.priority && (
                        <Badge variant="outline" className="text-xs">
                          {task.priority === 'high' ? 'High' : 
                           task.priority === 'medium' ? 'Medium' : 'Low'} Priority
                        </Badge>
                      )}
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Framework
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show no tasks message when filtered but no results */}
            {filteredTasks.length === 0 && filteredGpTasks.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <p>No tasks match the current filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}