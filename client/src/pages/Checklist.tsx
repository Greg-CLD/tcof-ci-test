import React, { useState, useEffect } from 'react';
import { Stage as PlanStage, STAGES, STAGE_CONFIGS } from '@/lib/plan-db';
// Use the Stage type from plan-db.ts for consistency throughout the application
type Stage = PlanStage;
import { useLocation, useParams } from 'wouter';
import UuidWarningTester from '@/components/debug/UuidWarningTester';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2, PlusSquare, X, Trash2, MoreHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ORIGIN_LABELS } from '@/constants/origin';
import { useProjectContext } from '@/contexts/ProjectContext';
import { DEBUG_TASKS, DEBUG_FILTERS } from '@shared/constants.debug';

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
  origin?: string; // Added to fix custom task filtering
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner?: string;
  status?: 'To Do' | 'Working On It' | 'Done';
  createdAt?: string; // ISO date string for creation time
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

// Task-related functionality is now handled in the main component

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
  const [activeTab, setActiveTab] = useState<Stage>(STAGES[0]); // Start with 'identification'
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);

  // Initialize tasks by stage using the STAGES constant
  const [tasksByStage, setTasksByStage] = useState<Record<Stage, UnifiedTask[]>>(
    STAGES.reduce((acc, stage) => ({
      ...acc,
      [stage]: []
    }), {} as Record<Stage, UnifiedTask[]>)
  );

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
          // Ensure stage name is always lowercase for consistency
          const normalizedStage = stageName.toLowerCase();
          if (DEBUG_TASKS) console.log(`[CHECKLIST_DEBUG] Normalizing stage name from "${stageName}" to "${normalizedStage}"`);

          tasks.push({
            id: `${factor.id}-${uuidv4().substring(0, 8)}`,
            title: taskText,
            stage: normalizedStage,
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

      let data;
      // Check if response is a valid JSON response
      try {
        data = await response.json();
      } catch (e) {
        console.error('[CHECKLIST_ERROR] Failed to parse response as JSON:', e);
        data = [];
      }

      // Debug log to see raw server response and parsed data
      if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] Raw server tasks response status:', response.status);
      if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] Raw server tasks data type:', Array.isArray(data) ? 'array' : typeof data);
      if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] Raw server tasks data count:', Array.isArray(data) ? data.length : 'N/A');
      
      // DETAILED DEBUG: Log all tasks with origin="custom" from the raw API response
      const customTasks = Array.isArray(data) ? data.filter((t: any) => t.origin === 'custom') : [];
      if (DEBUG_TASKS) console.log('[CUSTOM_TASK_RAW_DATA] Custom tasks from API:', 
        customTasks.map((t: any) => ({
          id: t.id, 
          text: t.text,
          origin: t.origin,
          stage: t.stage
        }))
      );
      
      // DEBUG: Log all raw tasks to make sure we're getting the right data
      if (DEBUG_TASKS && Array.isArray(data) && data.length > 0) {
        console.log('[RAW_TASKS_SAMPLE] First 2 tasks sample:', 
          data.slice(0, 2).map((t: any) => ({
            id: t.id,
            text: t.text,
            origin: t.origin,
            stage: t.stage
          }))
        );
      }

      if (DEBUG_TASKS) console.log('[CHECKLIST] Server returned tasks:', response);

      // Store both custom tasks and task status map
      const projectTasks: UnifiedTask[] = [];
      const taskStatusMap: Record<string, boolean> = {};

      if (Array.isArray(data)) {
        console.log(`[CHECKLIST] Processing ${data.length} tasks from server`);
        
        // DEBUG: Check specifically how many custom tasks we have before mapping
        const customTasksPreMap = data.filter((t: any) => t.origin === 'custom');
        console.log(`[PRE_MAPPING] Found ${customTasksPreMap.length} custom tasks before mapping process`);

        data.forEach((task: any) => {
          // Track completion status by source ID for referencing canonical tasks
          if (task.sourceId) {
            taskStatusMap[task.sourceId] = !!task.completed;
          }

          // CRITICAL FIX: For custom task visibility
          // Check if this is a custom task before any transformation
          const isCustomTask = task.origin === 'custom';
          
          // Create unified task object for custom tasks and factor tasks
          const unifiedTask: UnifiedTask = {
            id: task.id,
            text: task.text,
            completed: !!task.completed,
            stage: task.stage.toLowerCase() as Stage,
            // FIXED: For custom tasks, both source and origin must be 'custom'
            // This ensures they appear in custom task filters
            source: isCustomTask ? 'custom' : (task.origin || 'custom') as 'custom' | 'factor' | 'heuristic' | 'policy' | 'framework',
            origin: task.origin, // Preserve the original origin value
            sourceId: task.sourceId || undefined,
            notes: task.notes || '',
            priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
            dueDate: task.dueDate || '',
            owner: task.owner || '',
            status: task.status || (task.completed ? 'Done' : 'To Do'),
            createdAt: task.createdAt || new Date().toISOString() // Use server timestamp or current time
          };
          
          // DEBUG: Log individual task transformation for custom tasks
          if (DEBUG_TASKS && task.origin === 'custom') {
            console.log('[UNIFIED_TASK_DEBUG] Raw → Transformed:', {
              raw: {
                id: task.id,
                text: task.text.substring(0, 20) + '...',
                origin: task.origin,
                source: task.source
              },
              transformed: {
                id: unifiedTask.id,
                text: unifiedTask.text.substring(0, 20) + '...',
                origin: unifiedTask.origin, 
                source: unifiedTask.source
              }
            });
          }

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

      if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] projectTasks (custom only):', projectTasks.filter(t => t.source === 'custom').map(t => ({id: t.id, text: t.text})));

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
          stage: (task.stage || 'identification').toLowerCase() as Stage,
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

      // DEBUG: How many custom tasks survived the transformation to UnifiedTask?
      const customUnifiedTasks = projectTasks.filter(task => task.origin === 'custom' || task.source === 'custom');
      if (DEBUG_TASKS) console.log('[POST_MAPPING] Custom UnifiedTasks count:', customUnifiedTasks.length);
      if (DEBUG_TASKS) console.log('[POST_MAPPING] Custom UnifiedTasks:', customUnifiedTasks.map(t => ({
        id: t.id,
        text: t.text.substring(0, 20) + '...',
        source: t.source,
        origin: t.origin,
        stage: t.stage
      })));

      // Combine both task types
      const allTasks: UnifiedTask[] = [...filteredCanonicalTasks, ...projectTasks];

      // DEBUG: How many custom tasks made it to the final merged list?
      const customAllTasks = allTasks.filter(t => t.origin === 'custom' || t.source === 'custom');
      if (DEBUG_TASKS) console.log('[MERGED_TASKS] Custom tasks in final merged list:', customAllTasks.length);
      if (DEBUG_TASKS) console.log('[MERGED_TASKS] Custom tasks sample:', customAllTasks.slice(0, 3).map(t => ({
        id: t.id,
        text: t.text.substring(0, 20) + '...',
        source: t.source,
        origin: t.origin,
        stage: t.stage
      })));

      // Debug log to see all tasks before stage grouping
      if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] All merged tasks (pre-stage-grouping):', allTasks);

      // Organize tasks by stage using the STAGES constant
      const byStage: Record<Stage, UnifiedTask[]> = STAGES.reduce((acc, stage) => ({
        ...acc,
        [stage]: []
      }), {} as Record<Stage, UnifiedTask[]>);

      // DEBUG: Count custom tasks before stage distribution
      const customTasksPreStageDistribution = allTasks.filter(t => t.origin === 'custom' || t.source === 'custom');
      console.log('[PRE_STAGE_DISTRIBUTION] Custom tasks count before stage distribution:', customTasksPreStageDistribution.length);

      allTasks.forEach(task => {
        // Always normalize stage to lowercase for consistent filtering
        // Also handle undefined or null stage values with a default
        const normalizedStage = (task.stage || 'identification').toLowerCase() as Stage;
        
        // DEBUG: For custom tasks, log their distribution in detail
        if (DEBUG_TASKS && (task.origin === 'custom' || task.source === 'custom')) {
          console.log(`[CUSTOM_TASK_DISTRIBUTION] Custom task "${task.text.substring(0, 20)}..." going to stage "${normalizedStage}" (original: "${task.stage}")`);
        }

        if (STAGES.includes(normalizedStage as Stage)) {
          byStage[normalizedStage].push({...task, stage: normalizedStage});
        } else {
          // If stage is invalid, default to identification stage
          if (DEBUG_TASKS) console.log(`[CHECKLIST_DEBUG] Invalid stage "${normalizedStage}" for task "${task.text}" - defaulting to identification`);
          byStage.identification.push({...task, stage: 'identification'});
        }
      });
      if (DEBUG_TASKS) console.log(`[CHECKLIST] Final task count: ${allTasks.length} total tasks`);
      if (DEBUG_TASKS) console.log(`[CHECKLIST] Tasks by stage: identification(${byStage.identification.length}), definition(${byStage.definition.length}), delivery(${byStage.delivery.length}), closure(${byStage.closure.length})`);

      setTasks(allTasks);
      setTasksByStage(byStage);
      if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] tasksByStage[identification]:', byStage['identification'].map(t => t.text));
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

      // Update tasksByStage for UI using the STAGES constant
      const byStage: Record<Stage, UnifiedTask[]> = STAGES.reduce((acc, stage) => ({
        ...acc,
        [stage]: []
      }), {} as Record<Stage, UnifiedTask[]>);

      updatedTasks.forEach(task => {
        // Normalize stage to lowercase and handle undefined/null values
        const normalizedStage = (task.stage || 'identification').toLowerCase() as Stage;

        if (STAGES.includes(normalizedStage as Stage)) {
          byStage[normalizedStage].push({...task, stage: normalizedStage});
        } else {
          if (DEBUG_TASKS) console.log(`[CHECKLIST_DEBUG] Invalid stage "${normalizedStage}" during update - defaulting to identification`);
          byStage.identification.push({...task, stage: 'identification'});
        }
      });

      setTasksByStage(byStage);

      // Use the proper REST API endpoint for updates
      // Ensure we send the correct data to match the backend expectations
      const updatedFields = {
        ...updates,
        // Always normalize stage to lowercase and handle null/undefined
        stage: (stage || 'identification').toLowerCase(),
        // Convert priority from TaskPriority type to string if present
        priority: updates.priority ? String(updates.priority) : undefined,
        // Ensure we convert status to string
        status: updates.status ? String(updates.status) : undefined
      };

      console.log(`[CHECKLIST] Sending task update to API: ${JSON.stringify(updatedFields)}`);


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
    // Import from our origin constants - using the same values here for consistency
    const originGroupLabels: Record<string, string> = {
      factor: 'TCOF Success Factor Tasks',
      heuristic: 'Your Heuristic Tasks', 
      policy: 'Policy Tasks',
      framework: 'Good Practice Tasks',
      custom: 'General Tasks'
    };

    return originGroupLabels[source] || 'Tasks';
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
        <SummaryBar tasks={tasks as any} plan={plan as any} />
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

        <div className="flex gap-2 justify-end">
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
          <Tabs defaultValue={STAGE_CONFIGS[0].value.toLowerCase()} className="mb-8">
            <TabsList className="grid grid-cols-4 mb-4">
              {STAGE_CONFIGS.map(stageConfig => {
                // Always work with lowercase values for state, proper labels for display
                const normalizedValue = stageConfig.value.toLowerCase() as Stage;
                const stageTaskCount = tasksByStage[normalizedValue]?.length || 0;

                // Add debug logging to track stage distribution
                if (DEBUG_TASKS) console.log(`[CHECKLIST_DEBUG] Tab for stage "${normalizedValue}" has ${stageTaskCount} tasks`);

                return (
                  <TabsTrigger 
                    key={normalizedValue}
                    value={normalizedValue} 
                    onClick={() => setActiveTab(normalizedValue)}
                    className="relative"
                  >
                    {stageConfig.label}
                    {stageTaskCount > 0 && (
                      <Badge variant="outline" className="ml-2 bg-tcof-teal text-white">
                        {stageTaskCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(tasksByStage).map(([stage, stageTasks]) => {
              // Always ensure stage is lowercase for consistent filtering
              const normalizedStage = stage.toLowerCase() as Stage;
              // Find the corresponding stage config to get the proper label
              const stageConfig = STAGE_CONFIGS.find(cfg => cfg.value.toLowerCase() === normalizedStage);

              // Debug log raw tasks before any filtering
              if (DEBUG_TASKS) console.log('[CHECKLIST_DEBUG] Raw tasks for stage', normalizedStage, stageTasks);

              if (DEBUG_TASKS) console.log(`[CHECKLIST_DEBUG] Processing stage "${stage}" (display as: "${stageConfig?.label}") with ${stageTasks.length} tasks`);

              // Apply filters to tasks
              let filteredTasks = stageTasks.filter(task => {
                // Make sure task stage is normalized to lowercase
                const taskStage = (task.stage || 'identification').toLowerCase() as Stage;

                // Debug task stage check - stage should match regardless of case
                if (DEBUG_TASKS && taskStage !== normalizedStage) {
                  console.log(`[CHECKLIST_DEBUG] Task stage mismatch: task has "${taskStage}", tab expects "${normalizedStage}"`);
                }

                // Filter by source
                // Fix: Ensure custom tasks appear when 'custom' is selected AND when 'all' is selected
                if (sourceFilter !== 'all') {
                  // For custom filter, include tasks with source='custom' OR origin='custom'
                  if (sourceFilter === 'custom') {
                    // Simplified logic to identify custom tasks
                    // A task is considered custom if EITHER source OR origin is 'custom'
                    const isCustomTask = task.source === 'custom' || task.origin === 'custom';
                    
                    // Only add debug logging in development
                    if (DEBUG_FILTERS) console.log('[FILTER_DEBUG] Task checked for custom filter:', {
                      text: task.text.substring(0, 20) + '...',
                      source: task.source,
                      origin: task.origin,
                      isCustomTask: isCustomTask,
                      wouldPass: isCustomTask
                    });
                    
                    // Skip this task if it's not a custom task
                    if (!isCustomTask) {
                      return false;
                    }
                  } else if (task.source !== sourceFilter) {
                    // For other source filters, require exact match
                    return false;
                  }
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

              // Apply sorting based on selected option
              if (sortOption === 'date') {
                filteredTasks.sort((a, b) => {
                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
                });
              } else if (sortOption === 'stage') {
                // Existing stage-based sorting
                const stageOrder = { identification: 1, definition: 2, delivery: 3, closure: 4 };
                filteredTasks.sort((a, b) => {
                  const stageA = (a.stage || 'identification').toLowerCase() as Stage;
                  const stageB = (b.stage || 'identification').toLowerCase() as Stage;
                  return sortDirection === 'asc' 
                    ? stageOrder[stageA] - stageOrder[stageB]
                    : stageOrder[stageB] - stageOrder[stageA];
                });
              } else if (sortOption === 'status') {
                // Status-based sorting
                filteredTasks.sort((a, b) => {
                  const statusOrder = { 'Done': 2, 'Working On It': 1, 'To Do': 0 };
                  const statusA = a.completed ? 'Done' : a.status || 'To Do';
                  const statusB = b.completed ? 'Done' : b.status || 'To Do';
                  return sortDirection === 'asc'
                    ? statusOrder[statusA] - statusOrder[statusB]
                    : statusOrder[statusB] - statusOrder[statusA];
                });
              } else if (sortOption === 'source') {
                // Source-based sorting
                filteredTasks.sort((a, b) => {
                  const sourceA = a.source || 'custom';
                  const sourceB = b.source || 'custom';
                  return sortDirection === 'asc'
                    ? sourceA.localeCompare(sourceB)
                    : sourceB.localeCompare(sourceA);
                });
              }

              // Default to newest tasks first when no other sorting is specified
              if (sortOption !== 'date' && !sortOption) {
                filteredTasks.sort((a, b) => {
                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA; // Newest first
                });
              }

              // Debug log to track filtered tasks before rendering
              console.log(
                '[CHECKLIST_DEBUG] For stage:', normalizedStage,
                '| source filter:', sourceFilter,
                '| filteredTasks:', filteredTasks.map(t => ({
                  text: t.text,
                  source: t.source,
                  origin: t.origin,
                  id: t.id
                }))
              );
              
              // TEMP DEBUG: Log custom tasks specifically to verify our fix is working
              const customTasks = stageTasks.filter(t => t.origin === 'custom' || t.source === 'custom');
              console.log(
                '[CUSTOM_TASK_DEBUG] Stage:', normalizedStage,
                '| Total custom tasks:', customTasks.length,
                '| Tasks:', customTasks.map(t => ({
                  text: t.text,
                  source: t.source,
                  origin: t.origin,
                  id: t.id
                }))
              );
              
              // Extra verification of our filter logic
              const filteredCustomTasks = stageTasks.filter(task => 
                task.source === 'custom' || task.origin === 'custom'
              );
              console.log(
                '[FILTER_CHECK] Stage:', normalizedStage,
                '| Custom tasks that would pass our filter:', filteredCustomTasks.length
              );

              return (
                <TabsContent key={normalizedStage} value={normalizedStage} className="space-y-6">
                  {/* Add task creation form at the top of every stage tab */}
                  {currentProjectId && (
                    <div className="bg-card rounded-md p-4 shadow-sm mb-4 border">
                      <h3 className="text-lg font-medium mb-2">Add a new task to {stageConfig?.label || normalizedStage.charAt(0).toUpperCase() + normalizedStage.slice(1)}</h3>
                      <CreateTaskForm 
                        projectId={currentProjectId}
                        stage={normalizedStage}
                        onTaskCreated={refreshTasksState}
                        isAuthenticated={isAuthenticated}
                      />
                    </div>
                  )}

                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-md">
                      <p className="text-gray-500">No tasks found for this stage</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Use the "Add a new task" form above to create tasks for this stage
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

      {/* Task Smoke Test Panel */}
      {/* Task testing functionality removed */}

      {/* Debug component for testing UUID validation fix */}
      {currentProjectId && (
        <div className="mt-8 border-t pt-6">
          <div className="text-sm text-muted-foreground mb-4">
            <h3 className="font-semibold text-tcof-dark mb-1">Debug Tools</h3>
            <p>The following tools are for testing and debugging purposes only.</p>
          </div>
          <UuidWarningTester projectId={currentProjectId} />
        </div>
      )}
    </div>
  );
}