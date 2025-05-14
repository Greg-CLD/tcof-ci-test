import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Plus, Trash2 } from 'lucide-react';

// Helper function for diagnostic logging
function logData(message: string, data: any) {
  console.log(message, data);
  return null;
}

// Types
export interface FactorTask {
  id: string;
  title: string;
  description: string;
  tasks: {
    Identification: string[];
    Definition: string[];
    Delivery: string[];
    Closure: string[];
  };
}

export type Stage = 'Identification' | 'Definition' | 'Delivery' | 'Closure';

interface AdminStageTabsProps {
  factor: FactorTask;
  onTaskChange: (stage: Stage, index: number, value: string) => void;
  onAddTask: (stage: Stage) => void;
  onRemoveTask: (stage: Stage, index: number) => void;
}

export default function AdminStageTabs({ 
  factor, 
  onTaskChange, 
  onAddTask, 
  onRemoveTask 
}: AdminStageTabsProps) {
  // Add a validation check for factor
  if (!factor || !factor.tasks) {
    console.error('[ADMIN_TABS] Invalid factor data provided to AdminStageTabs:', factor);
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: Invalid success factor data. Please refresh the page and try again.
      </div>
    );
  }
  
  const [activeTab, setActiveTab] = useState<Stage>('Identification');
  
  // Use console.log directly outside JSX
  console.log("[PROPS → AdminStageTabs]", factor.id, factor.tasks);
  console.log('[ADMIN_TABS] Rendering AdminStageTabs with factor:', factor);
  console.log('[ADMIN_TABS] Tasks structure:', factor.tasks);
  
  // Count tasks for badge display
  const getTaskCount = (stage: Stage) => {
    const tasks = factor.tasks[stage as keyof typeof factor.tasks];
    return tasks ? tasks.length : 0;
  };
  
  // Generate badge for stage task count
  const getTaskCountBadge = (stage: Stage) => {
    const count = getTaskCount(stage);
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
        {count} {count === 1 ? 'task' : 'tasks'}
      </span>
    );
  };
  
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as Stage)}
      className="w-full"
    >
      <TabsList className="grid grid-cols-4 gap-2 mb-4">
        <TabsTrigger 
          value="Identification"
          className="flex flex-col gap-1 py-2"
        >
          <span>Identification</span>
          {getTaskCountBadge('Identification')}
        </TabsTrigger>
        
        <TabsTrigger 
          value="Definition"
          className="flex flex-col gap-1 py-2"
        >
          <span>Definition</span>
          {getTaskCountBadge('Definition')}
        </TabsTrigger>
        
        <TabsTrigger 
          value="Delivery"
          className="flex flex-col gap-1 py-2"
        >
          <span>Delivery</span>
          {getTaskCountBadge('Delivery')}
        </TabsTrigger>
        
        <TabsTrigger 
          value="Closure"
          className="flex flex-col gap-1 py-2"
        >
          <span>Closure</span>
          {getTaskCountBadge('Closure')}
        </TabsTrigger>
      </TabsList>
      
      {/* Tab content for each stage */}
      {(['Identification', 'Definition', 'Delivery', 'Closure'] as Stage[]).map((stage) => {
        // Debug logging outside of JSX
        console.log(`[ADMIN_TABS] Rendering stage ${stage}. Active tab: ${activeTab}`);
        console.log(`[ADMIN_TABS] Tasks for ${stage}:`, factor.tasks[stage as keyof typeof factor.tasks]);
        
        // Get tasks array for this stage directly from the factor's tasks object
        const stageTasks = factor.tasks[stage];
        
        // Log the tasks for this stage for debugging
        console.log(`[ADMIN_TABS] Raw ${stage} tasks:`, stageTasks);
        
        // Ensure we have an array of strings (with no empty items)
        const stageTasksArray = Array.isArray(stageTasks) 
          ? stageTasks.filter(task => typeof task === 'string' && task.trim() !== '')
          : [];
        
        console.log(`[ADMIN_TABS] ${stage} tasks after processing:`, stageTasksArray);
        
        const hasTasks = Array.isArray(stageTasksArray) && stageTasksArray.length > 0;
        
        return (
          <TabsContent key={stage} value={stage}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{stage} Tasks</h3>
                <Button
                  size="sm"
                  onClick={() => onAddTask(stage)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Task
                </Button>
              </div>
              
              {!hasTasks ? (
                <div className="text-center py-6 text-gray-500 border border-dashed rounded-md">
                  No tasks defined for this stage. Click "Add Task" to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {stageTasksArray.map((taskText, index) => (
                    <div
                      key={`${stage}-task-${index}`}
                      className="flex items-start gap-3"
                    >
                      <Textarea
                        value={taskText}
                        onChange={(e) => onTaskChange(stage, index, e.target.value)}
                        placeholder={`Enter ${stage} task...`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveTask(stage, index)}
                        className="mt-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}