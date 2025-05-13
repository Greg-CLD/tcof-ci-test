import React, { useState, useEffect } from 'react';
import { Stage } from '@/lib/plan-db';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, PlusSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SummaryBar from '@/components/checklist/SummaryBar';
import { ChecklistHeader } from '@/components/outcomes/ChecklistHeader';
import ChecklistFilterBar, {
  StageFilter,
  StatusFilter,
  SourceFilter,
  SortOption,
  SortDirection
} from '@/components/checklist/ChecklistFilterBar';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { useProjects } from '@/hooks/useProjects';
import { useFactors } from '@/hooks/useFactors';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ChecklistProps {
  projectId?: string;
}

// Task type
interface UnifiedTask {
  id: string;
  text: string;
  completed: boolean;
  stage: Stage;
  source: 'heuristic' | 'factor' | 'custom' | 'framework';
  sourceName?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner?: string;
}

// Task updates
interface TaskUpdates {
  completed?: boolean;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner?: string;
}

export default function Checklist({ projectId }: ChecklistProps) {
  const { toast } = useToast();
  const { plan } = usePlan();
  const { getSelectedProject } = useProjects();
  const queryClient = useQueryClient();

  // Current project ID
  const currentProjectId = projectId || getSelectedProject()?.id;

  // Success factors
  const { factors } = useFactors();

  // Local state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Stage>('Identification');
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [tasksByStage, setTasksByStage] = useState<Record<Stage, UnifiedTask[]>>({
    Identification: [],
    Definition: [],
    Delivery: [],
    Closure: []
  });

  // Filters
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Get canonical tasks - this is the core of our solution
  // We use these tasks even without a plan
  const { data: canonicalTasks } = useQuery({
    queryKey: ['/api/admin/tcof-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tcof-tasks');
      if (!res.ok) throw new Error('Failed to load canonical tasks');
      return res.json();
    }
  });

  // Helper function to refresh task state
  const refreshTasksState = async () => {
    if (!currentProjectId || !canonicalTasks) return;
    
    try {
      // Get existing task statuses from the server
      const response = await apiRequest(
        "GET", 
        `/api/projects/${currentProjectId}/tasks`
      );
      
      // Create a lookup table for completed statuses
      const taskStatusMap: Record<string, boolean> = {};
      if (Array.isArray(response)) {
        response.forEach((task: any) => {
          if (task.sourceId) {
            taskStatusMap[task.sourceId] = !!task.completed;
          }
        });
      }
      
      // Start with canonical tasks
      const allTasks: UnifiedTask[] = canonicalTasks.map((task: any) => {
        // Check if this task exists in our status map or the plan
        let completed = false;
        
        // First check direct task status
        if (taskStatusMap[task.id]) {
          completed = true;
        }
        // Then fallback to plan if it exists (for backward compatibility)
        else if (plan?.blocks?.block2?.tasks) {
          const existingTask = plan.blocks.block2.tasks.find(
            (t: any) => t.id === task.id
          );
          
          if (existingTask) {
            completed = !!existingTask.completed;
          }
        }
        
        return {
          id: task.id,
          text: task.title,
          completed,
          stage: task.stage || 'Identification',
          source: 'factor',
          sourceName: task.factorCode
        };
      });
      
      // Organize tasks by stage
      const byStage: Record<Stage, UnifiedTask[]> = {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
      
      allTasks.forEach(task => {
        const stage = task.stage as Stage;
        if (byStage[stage]) {
          byStage[stage].push(task);
        } else {
          byStage.Identification.push({...task, stage: 'Identification'});
        }
      });
      
      setTasks(allTasks);
      setTasksByStage(byStage);
    } catch (error) {
      console.error('[CHECKLIST] Error refreshing tasks:', error);
      toast({
        title: "Error refreshing tasks",
        description: "There was a problem loading the task list.",
        variant: "destructive"
      });
    }
  };

  // Load and process tasks
  useEffect(() => {
    if (!currentProjectId || !canonicalTasks) {
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('[CHECKLIST] Building task list for project', currentProjectId);
    
    refreshTasksState()
      .finally(() => setLoading(false));
      
  }, [currentProjectId, canonicalTasks]);

  // Handle task updates - now always plan-free
  const handleTaskUpdate = async (taskId: string, updates: TaskUpdates, stage: Stage, source: string) => {
    if (!currentProjectId) return;
    
    console.log(`[CHECKLIST] Updating task ${taskId}:`, updates);
    
    try {
      // First update local state for immediate UI feedback
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      setTasks(updatedTasks);
      
      // Update tasksByStage for UI
      const byStage: Record<Stage, UnifiedTask[]> = {
        Identification: [],
        Definition: [],
        Delivery: [],
        Closure: []
      };
      
      updatedTasks.forEach(task => {
        const stage = task.stage as Stage;
        if (byStage[stage]) {
          byStage[stage].push(task);
        } else {
          byStage.Identification.push({...task, stage: 'Identification'});
        }
      });
      
      setTasksByStage(byStage);
      
      // Always save directly using the task API - no plan dependency
      const response = await apiRequest(
        "POST",
        `/api/projects/${currentProjectId}/tasks`,
        { taskId, updates, stage, source }
      );
      
      console.log('[CHECKLIST] Task update sent successfully', response);
      
    } catch (error) {
      console.error('[CHECKLIST] Error updating task:', error);
      
      // Revert local state on error by refreshing from server
      refreshTasksState();
      
      toast({
        title: "Error updating task",
        description: "Failed to update task. Please try again.",
        variant: "destructive"
      });
    }
  };



  // Helper function for source labels
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'factor': return 'Success Factor Tasks';
      case 'heuristic': return 'Personal Heuristic Tasks';
      case 'framework': return 'Framework Tasks';
      case 'custom': return 'Custom Tasks';
      default: return 'Tasks';
    }
  };

  // Render UI
  return (
    <div className="container mx-auto px-4 py-8">
      <ChecklistHeader 
        projectId={currentProjectId || ""} 
        title="Task Checklist" 
        description="Track your project's progress through recommended tasks."
      />
      
      <div className="mb-8">
        <SummaryBar tasks={tasks} />
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <ChecklistFilterBar
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            sortOption={sortOption}
            setSortOption={setSortOption}
            sortDirection={sortDirection}
            setSortDirection={setSortDirection}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-tcof-teal" />
        </div>
      ) : (
        <>
          <Tabs defaultValue="Identification" className="mb-8">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger 
                value="Identification" 
                onClick={() => setActiveTab('Identification')}
                className="relative"
              >
                Identification
                {tasksByStage.Identification.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.Identification.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="Definition" 
                onClick={() => setActiveTab('Definition')}
                className="relative"
              >
                Definition
                {tasksByStage.Definition.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.Definition.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="Delivery" 
                onClick={() => setActiveTab('Delivery')}
                className="relative"
              >
                Delivery
                {tasksByStage.Delivery.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.Delivery.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="Closure" 
                onClick={() => setActiveTab('Closure')}
                className="relative"
              >
                Closure
                {tasksByStage.Closure.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.Closure.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {Object.entries(tasksByStage).map(([stage, stageTasks]) => (
              <TabsContent key={stage} value={stage} className="space-y-6">
                {stageTasks.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-md">
                    <p className="text-gray-500">No tasks found for this stage</p>
                    <Button variant="outline" className="mt-4">
                      <PlusSquare className="mr-2 h-4 w-4" />
                      Add Custom Task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Group tasks by source */}
                    {Object.entries(
                      stageTasks.reduce((groups, task) => {
                        const source = task.source || 'custom';
                        if (!groups[source]) groups[source] = [];
                        groups[source].push(task);
                        return groups;
                      }, {} as Record<string, UnifiedTask[]>)
                    ).map(([source, tasks]) => (
                      <div key={source} className="space-y-2">
                        <h3 className="text-sm font-semibold text-tcof-dark border-b pb-2">
                          {getSourceLabel(source)}
                        </h3>
                        <div className="space-y-2">
                          {tasks.map(task => (
                            <div 
                              key={`${task.source}-${task.id}`} 
                              className="flex items-start gap-3 p-3 border rounded-md hover:bg-gray-50"
                            >
                              <div className="flex-shrink-0 pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => {
                                    handleTaskUpdate(
                                      task.id, 
                                      { completed: !task.completed }, 
                                      task.stage, 
                                      task.source
                                    );
                                  }}
                                  className="rounded-sm h-5 w-5 border-gray-300 text-tcof-teal focus:ring-tcof-teal"
                                  title="Click to mark complete"
                                />
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                  <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                    {task.text}
                                  </p>
                                  {task.sourceName && (
                                    <span className="text-xs text-gray-500 mt-1 sm:mt-0">
                                      {factors?.find(f => f.id === task.sourceName)?.title || task.sourceName}
                                    </span>
                                  )}
                                </div>
                                {task.notes && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {task.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}