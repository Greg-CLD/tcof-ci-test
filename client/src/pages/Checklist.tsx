import React, { useState, useEffect } from 'react';
import { Stage as PlanStage } from '@/lib/plan-db';
// Define the stage type that matches the one used in CreateTaskForm and the API
type Stage = 'identification' | 'definition' | 'delivery' | 'closure';
import { useLocation, useParams } from 'wouter';
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
import CreateTaskForm from '@/components/plan/CreateTaskForm';
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
import { useAuth } from '@/hooks/auth-hook';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { TaskPersistenceHelper } from '@/components/TaskPersistenceHelper';
import { useProjectContext } from '@/contexts/ProjectContext';

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
  status?: 'To Do' | 'Working On It' | 'Done';
}

export default function Checklist({ projectId: propProjectId }: ChecklistProps): JSX.Element {
  const { toast } = useToast();
  const { plan } = usePlan() as { plan: any };
  const { getSelectedProject } = useProjects();
  const { setCurrentProjectId } = useProjectContext(); // Use the ProjectContext's setter
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const params = useParams<{ projectId: string }>();
  const [_, navigate] = useLocation();
  
  // Create a wrapper function to match the old API
  const setSelectedProjectId = (id: string) => {
    setCurrentProjectId(id);
  };

  // Determine the current project ID with this priority: 
  // 1. URL parameter (highest priority)
  // 2. Prop passed to component
  // 3. Selected project from localStorage
  const urlProjectId = params.projectId;
  const selectedProject = getSelectedProject();
  const storedProjectId = localStorage.getItem('currentProjectId') || localStorage.getItem('selectedProjectId');
  
  // Set the final project ID using priority order
  const currentProjectId = urlProjectId || propProjectId || selectedProject?.id || storedProjectId;
  
  // Store the project ID in localStorage for consistency across refreshes
  useEffect(() => {
    if (currentProjectId) {
      console.log('Checklist: Setting project ID to localStorage and state:', currentProjectId);
      
      // Always keep storage consistent - use both keys for backward compatibility
      localStorage.setItem('currentProjectId', currentProjectId);
      localStorage.setItem('selectedProjectId', currentProjectId);
      
      // Also update the selected project in our hook using Context
      setCurrentProjectId(currentProjectId);
      
      // If we're on the non-specific /checklist route but have a project ID, 
      // update URL to include project ID for better persistence on refresh
      if (!urlProjectId && window.location.pathname === '/checklist') {
        console.log('Checklist: Updating URL to include project ID:', currentProjectId);
        navigate(`/projects/${currentProjectId}/checklist`, { replace: true });
      }
    } else if (isAuthenticated && !currentProjectId) {
      // If no project ID available but user is logged in, redirect to projects page
      console.log('Checklist: No project ID available, redirecting to organisations');
      navigate('/organisations');
    }
  }, [currentProjectId, urlProjectId, isAuthenticated, navigate, setCurrentProjectId]);

  // Success factors
  const { factors } = useFactors();

  // Local state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Stage>('identification');
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [tasksByStage, setTasksByStage] = useState<Record<Stage, UnifiedTask[]>>({
    identification: [],
    definition: [],
    delivery: [],
    closure: []
  });

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
  
  // Refresh tasks state when canonical tasks change or auth state changes
  useEffect(() => {
    if (canonicalTasks && canonicalTasks.length > 0 && isAuthenticated) {
      refreshTasksState();
    }
  }, [canonicalTasks, isAuthenticated, currentProjectId]);

  // Helper function to refresh task state
  const refreshTasksState = async () => {
    if (!currentProjectId || !canonicalTasks || canonicalTasks.length === 0) {
      console.log('[CHECKLIST] Cannot refresh tasks: missing project ID or canonical tasks');
      return;
    }
    
    // Don't attempt to load tasks if not authenticated
    if (!isAuthenticated) {
      console.log('[CHECKLIST] Cannot refresh tasks: not authenticated');
      return;
    }
    
    try {
      console.log('[CHECKLIST] Refreshing tasks for project', currentProjectId);
      setLoading(true);
      
      // Get existing task statuses from the server
      const response = await apiRequest(
        "GET", 
        `/api/projects/${currentProjectId}/tasks`
      );
      
      console.log('[CHECKLIST] Server returned tasks:', response);
      
      // Store both custom tasks and task status map
      const projectTasks: UnifiedTask[] = [];
      const taskStatusMap: Record<string, boolean> = {};
      
      if (Array.isArray(response)) {
        console.log(`[CHECKLIST] Processing ${response.length} tasks from server`);
        
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
            sourceId: task.sourceId || undefined,
            notes: task.notes || '',
            priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
            dueDate: task.dueDate || '',
            owner: task.owner || '',
            status: task.status || (task.completed ? 'Done' : 'To Do')
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
      const existingTaskIds = new Set(
        projectTasks
          .filter(task => task.sourceId !== undefined)
          .map(task => task.sourceId)
      );
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
      
      console.log(`[CHECKLIST] Final task count: ${allTasks.length} total tasks`);
      console.log(`[CHECKLIST] Tasks by stage: Identification(${byStage.Identification.length}), Definition(${byStage.Definition.length}), Delivery(${byStage.Delivery.length}), Closure(${byStage.Closure.length})`);
      
      setTasks(allTasks);
      setTasksByStage(byStage);
      setLoading(false);
    } catch (error) {
      console.error('[CHECKLIST] Error refreshing tasks:', error);
      toast({
        title: "Error refreshing tasks",
        description: "There was a problem loading the task list.",
        variant: "destructive"
      });
      setLoading(false);
    } finally {
      // Ensure loading state is reset even if there was an error
      setLoading(false);
    }
  };

  // Load and process tasks
  useEffect(() => {
    if (!currentProjectId || !canonicalTasks) {
      setLoading(false);
      return;
    }

    // Check if user is authenticated before loading tasks
    if (!isAuthenticated) {
      console.log('[CHECKLIST] Waiting for authentication before loading tasks...');
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('[CHECKLIST] Building task list for project', currentProjectId);
    
    refreshTasksState()
      .finally(() => setLoading(false));
      
  }, [currentProjectId, canonicalTasks, isAuthenticated]);

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
      // Ensure we send the correct data to match the backend expectations
      const updatedFields = {
        ...updates,
        stage: stage.toLowerCase(),
        // Convert priority from TaskPriority type to string if present
        priority: updates.priority ? String(updates.priority) : undefined,
        // Ensure we convert status to string
        status: updates.status ? String(updates.status) : undefined
      };
      
      const response = await apiRequest(
        "PUT",
        `/api/projects/${currentProjectId}/tasks/${taskId}`,
        updatedFields
      );
      
      // Parse the response to handle different response formats
      try {
        const responseData = await response.json();
        console.log('[CHECKLIST] Task update sent successfully', responseData);
        
        // Get the actual task data from response (supports both formats)
        const savedTask = responseData.task || responseData;
        
        // If the server returned a different ID, update our local state
        if (savedTask && savedTask.id && savedTask.id !== taskId) {
          console.log(`[CHECKLIST] Server assigned different ID: ${savedTask.id} (client had: ${taskId})`);
          
          // Update tasks array with server ID
          setTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, id: savedTask.id } : task
          ));
          
          // Update tasksByStage with server ID
          setTasksByStage(prev => {
            const updatedTasks = { ...prev };
            Object.keys(updatedTasks).forEach(key => {
              updatedTasks[key as Stage] = updatedTasks[key as Stage].map(task =>
                task.id === taskId ? { ...task, id: savedTask.id } : task
              );
            });
            return updatedTasks;
          });
        }
      } catch (e) {
        // Response might not be JSON, or might be empty
        console.log('[CHECKLIST] Task update successful, but no JSON response');
      }
      
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
  
  // Task creation is now handled by the CreateTaskForm component
  
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
      
      // Delete from server - use the correct endpoint
      const response = await apiRequest(
        "DELETE",
        `/api/projects/${currentProjectId}/tasks/${taskId}`
      );
      
      // Check if the deletion was successful
      if (!response.ok) {
        console.error('[CHECKLIST] Server returned error when deleting task:', response.status);
        throw new Error(`Server returned ${response.status} when deleting task`);
      }
      
      console.log('[CHECKLIST] Task deleted successfully');
      
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
        <SummaryBar tasks={tasks} plan={plan as any} />
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
          <CreateTaskForm 
            projectId={currentProjectId || ''}
            onTaskCreated={refreshTasksState}
            stage={activeTab}
          />
          
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
          <Tabs defaultValue="identification" className="mb-8">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger 
                value="identification" 
                onClick={() => setActiveTab('identification')}
                className="relative"
              >
                Identification
                {tasksByStage.identification.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.identification.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="definition" 
                onClick={() => setActiveTab('definition')}
                className="relative"
              >
                Definition
                {tasksByStage.definition.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.definition.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="delivery" 
                onClick={() => setActiveTab('delivery')}
                className="relative"
              >
                Delivery
                {tasksByStage.delivery.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.delivery.length}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="closure" 
                onClick={() => setActiveTab('closure')}
                className="relative"
              >
                Closure
                {tasksByStage.closure.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                    {tasksByStage.closure.length}
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
                  {/* Add task creation form at the top of every stage tab */}
                  {currentProjectId && (
                    <CreateTaskForm 
                      projectId={currentProjectId}
                      stage={stage as Stage}
                      onTaskCreated={refreshTasksState}
                      isAuthenticated={isAuthenticated}
                    />
                  )}
                  
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-md">
                      <p className="text-gray-500">No tasks found for this stage</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Use the form above to add a custom task
                      </p>
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
      
      {/* Add the task persistence helper for testing */}
      {currentProjectId && <TaskPersistenceHelper projectId={currentProjectId} />}
    </div>
  );
}