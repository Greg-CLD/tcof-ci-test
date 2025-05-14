import React, { useState, useEffect } from 'react';
import { Stage } from '@/lib/plan-db';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2, PlusSquare, X, Trash2, MoreHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TaskCard from '@/components/checklist/TaskCard';
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
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

interface ChecklistProps {
  projectId?: string;
}

// Task type
interface UnifiedTask {
  id: string;
  text: string;
  completed: boolean;
  stage: Stage;
  source: 'heuristic' | 'factor' | 'policy' | 'custom' | 'framework';
  sourceName?: string;
  sourceId?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner?: string;
  status?: 'To Do' | 'Working On It' | 'Done';
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
  
  // Add task dialog state
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskSource, setNewTaskSource] = useState<SourceFilter>('custom');
  const [newTaskStage, setNewTaskStage] = useState<Stage>('Identification');

  // Filters
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Get success factors with tasks - this is the core of our solution
  // We use these tasks even without a plan - using a special route that bypasses auth middleware
  const { data: successFactors } = useQuery({
    queryKey: ['/__tcof/public-checklist-tasks'],
    queryFn: async () => {
      console.log('[CHECKLIST] Fetching tasks from public endpoint...');
      const res = await fetch('/__tcof/public-checklist-tasks');
      if (!res.ok) {
        console.error('[CHECKLIST] Failed to load tasks:', await res.text());
        throw new Error('Failed to load canonical tasks');
      }
      const data = await res.json();
      console.log('[CHECKLIST] Successfully loaded tasks:', data?.length || 0);
      return data;
    }
  });
  
  // Transform success factors into a flat list of tasks for the checklist
  const canonicalTasks = React.useMemo(() => {
    if (!successFactors) return [];
    
    const tasks: any[] = [];
    
    // Process each factor and its tasks by stage
    successFactors.forEach((factor: any) => {
      if (!factor.tasks) return;
      
      // Process tasks for each stage
      Object.entries(factor.tasks).forEach(([stageName, stageTasks]) => {
        if (!Array.isArray(stageTasks)) return;
        
        // Add each task to our flat list with metadata
        (stageTasks as string[]).forEach((taskText: string) => {
          tasks.push({
            id: `${factor.id}-${uuidv4().substring(0, 8)}`,
            title: taskText,
            stage: stageName,
            factorId: factor.id,
            factorCode: factor.title.split(' ')[0],
          });
        });
      });
    });
    
    return tasks;
  }, [successFactors]);
  
  // Refresh tasks state when canonical tasks change
  useEffect(() => {
    if (canonicalTasks && canonicalTasks.length > 0) {
      refreshTasksState();
    }
  }, [canonicalTasks]);

  // Helper function to refresh task state
  const refreshTasksState = async () => {
    if (!currentProjectId || !canonicalTasks || canonicalTasks.length === 0) return;
    
    try {
      // Get existing task statuses from the server
      const response = await apiRequest(
        "GET", 
        `/api/projects/${currentProjectId}/tasks`
      );
      
      // Store both custom tasks and task status map
      const projectTasks: UnifiedTask[] = [];
      const taskStatusMap: Record<string, boolean> = {};
      
      if (Array.isArray(response)) {
        response.forEach((task: any) => {
          // Track completion status by source ID for referencing canonical tasks
          if (task.sourceId) {
            taskStatusMap[task.sourceId] = !!task.completed;
          }
          
          // Create unified task object for custom tasks and factor tasks
          const unifiedTask: UnifiedTask = {
            id: task.id,
            text: task.text,
            completed: !!task.completed,
            stage: (task.stage.charAt(0).toUpperCase() + task.stage.slice(1)) as Stage,
            source: task.origin as 'custom' | 'factor' | 'heuristic' | 'policy' | 'framework',
            sourceId: task.sourceId
          };
          
          // Add source name based on origin
          if (task.origin === 'factor' && task.sourceId) {
            const factor = factors?.find(f => f.id === task.sourceId.split('-')[0]);
            if (factor) {
              unifiedTask.sourceName = factor.title.split(' ')[0];
            }
          }
          
          // Add to project tasks array (will be merged with canonical tasks later)
          projectTasks.push(unifiedTask);
        });
      }
      
      // Start with canonical tasks
      const canonicalTasksList: UnifiedTask[] = canonicalTasks.map((task: any) => {
        // Check if this task exists in our status map or the plan
        let completed = false;
        
        // First check direct task status
        if (taskStatusMap[task.id]) {
          completed = true;
        }
        // Then fallback to plan if it exists (for backward compatibility)
        else if (plan?.blocks?.block2?.tasks) {
          // Use type assertion to handle possible type mismatch
          const planData = plan as any;
          const existingTask = planData.blocks.block2.tasks.find(
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
          sourceName: task.factorCode || task.factorId,
          sourceId: task.id
        };
      });
      
      // Merge canonical tasks with custom tasks from project_tasks table
      // Filter out canonical tasks that already exist in project tasks to avoid duplicates
      const existingTaskIds = new Set(projectTasks.map(task => task.sourceId).filter(Boolean));
      const filteredCanonicalTasks = canonicalTasksList.filter(task => !existingTaskIds.has(task.id));
      
      // Combine both task types
      const allTasks: UnifiedTask[] = [...filteredCanonicalTasks, ...projectTasks];
      
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
      
      // Use the proper REST API endpoint for updates
      const response = await apiRequest(
        "PUT",
        `/api/projects/${currentProjectId}/tasks/${taskId}`,
        updates
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
  
  // Handle adding a new task
  const handleAddTask = async () => {
    if (!newTaskText.trim()) {
      toast({
        title: "Task text is required",
        description: "Please enter task text",
        variant: "destructive"
      });
      return;
    }
    
    if (!currentProjectId) {
      toast({
        title: "No project selected",
        description: "Please select a project first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create a new task ID
      const taskId = uuidv4();
      
      // Create task data
      const taskData = {
        taskId,
        text: newTaskText,
        stage: newTaskStage,
        source: newTaskSource === 'all' ? 'custom' : newTaskSource,
        projectId: currentProjectId,
      };
      
      // Optimistically update UI
      const newTaskObject: UnifiedTask = {
        id: taskId,
        text: newTaskText,
        completed: false,
        stage: newTaskStage,
        source: newTaskSource === 'all' ? 'custom' : newTaskSource as 'custom' | 'factor' | 'heuristic' | 'policy' | 'framework',
      };
      
      // Add to tasks array
      setTasks(prev => [...prev, newTaskObject]);
      
      // Add to tasks by stage
      setTasksByStage(prev => {
        const updatedTasks = { ...prev };
        updatedTasks[newTaskStage] = [...updatedTasks[newTaskStage], newTaskObject];
        return updatedTasks;
      });
      
      // Send to server - Use the correct endpoint path and format
      const response = await apiRequest(
        "POST",
        `/api/projects/${currentProjectId}/tasks`,
        {
          text: newTaskText,
          stage: newTaskStage.toLowerCase(),
          origin: newTaskSource === 'all' ? 'custom' : newTaskSource,
          sourceId: taskId,
          completed: false
        }
      );
      console.log('[CHECKLIST] Task created successfully', response);
      
      // Reset form
      setNewTaskText('');
      setAddTaskDialogOpen(false);
      
      // Set initial stage to match the current tab
      setNewTaskStage(activeTab);
      
      toast({
        title: "Task added",
        description: "New task has been added successfully",
      });
    } catch (error) {
      console.error('[CHECKLIST] Error creating task:', error);
      
      // Revert local state on error by refreshing from server
      refreshTasksState();
      
      toast({
        title: "Error adding task",
        description: "Failed to create new task. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    if (!currentProjectId) {
      toast({
        title: "No project selected",
        description: "Please select a project first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Optimistically update UI
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Update tasks by stage - filter tasks from all stages
      setTasksByStage(prev => {
        const updatedTasks = { ...prev };
        
        // Find and remove the task from whichever stage it's in
        Object.keys(updatedTasks).forEach(stageKey => {
          updatedTasks[stageKey as Stage] = updatedTasks[stageKey as Stage].filter(task => task.id !== taskId);
        });
        
        return updatedTasks;
      });
      
      // Delete from server
      await apiRequest(
        "DELETE",
        `/api/project-tasks/${taskId}?projectId=${currentProjectId}`
      );
      
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully",
      });
    } catch (error) {
      console.error('[CHECKLIST] Error deleting task:', error);
      
      // Revert local state on error by refreshing from server
      refreshTasksState();
      
      toast({
        title: "Error deleting task",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
    }
  };



  // Helper function for source labels
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'factor': return 'Success Factor Tasks';
      case 'heuristic': return 'Personal Heuristic Tasks';
      case 'policy': return 'Company Policy Tasks';
      case 'framework': return 'Good Practice Tasks';
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
        <SummaryBar tasks={tasks} plan={plan} />
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
          <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="whitespace-nowrap bg-tcof-teal hover:bg-tcof-teal/90 text-white">
                <PlusSquare className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Create a custom task for your project checklist.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-text">Task Description</Label>
                  <Textarea
                    id="task-text"
                    placeholder="Enter task description..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task-source">Source</Label>
                    <Select 
                      value={newTaskSource === 'all' ? 'custom' : newTaskSource} 
                      onValueChange={(value) => setNewTaskSource(value as SourceFilter)}
                    >
                      <SelectTrigger id="task-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Task</SelectItem>
                        <SelectItem value="policy">Company Policy</SelectItem>
                        <SelectItem value="framework">Good Practice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="task-stage">Stage</Label>
                    <Select 
                      value={newTaskStage} 
                      onValueChange={(value) => setNewTaskStage(value as Stage)}
                    >
                      <SelectTrigger id="task-stage">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Identification">Identification</SelectItem>
                        <SelectItem value="Definition">Definition</SelectItem>
                        <SelectItem value="Delivery">Delivery</SelectItem>
                        <SelectItem value="Closure">Closure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask}>Add Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
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
            
            {Object.entries(tasksByStage).map(([stage, stageTasks]) => {
              // Apply filters to tasks
              const filteredTasks = stageTasks.filter(task => {
                // Filter by source
                if (sourceFilter !== 'all' && task.source !== sourceFilter) {
                  return false;
                }
                
                // Filter by status
                if (statusFilter === 'completed' && !task.completed) {
                  return false;
                }
                if (statusFilter === 'incomplete' && task.completed) {
                  return false;
                }
                
                // Filter by search query
                if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                
                return true;
              });
              
              return (
                <TabsContent key={stage} value={stage} className="space-y-6">
                  {filteredTasks.length === 0 ? (
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
                        filteredTasks.reduce((groups, task) => {
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
                              <TaskCard
                                key={`${task.source}-${task.id}`}
                                id={task.id}
                                text={task.text}
                                completed={task.completed}
                                notes={task.notes}
                                priority={task.priority}
                                dueDate={task.dueDate}
                                owner={task.owner}
                                status={task.completed ? 'Done' : task.status || 'To Do'}
                                stage={task.stage}
                                source={task.source}
                                sourceName={task.sourceName}
                                isGoodPractice={false}
                                onUpdate={(id, updates) => {
                                  handleTaskUpdate(
                                    id,
                                    updates,
                                    task.stage,
                                    task.source
                                  );
                                }}
                                onDelete={handleDeleteTask}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}
    </div>
  );
}