import React, { useState, useEffect } from 'react';
import { PlanRecord, loadPlan, savePlan, TaskItem, Stage } from '@/lib/plan-db';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CircleX, Download, FileText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StageAccordion from '@/components/checklist/StageAccordion';
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
import { exportPlanPDF, exportCSV } from '@/lib/exportUtils';
import { usePlan } from '@/contexts/PlanContext';
import { ensurePlanForProject } from '@/lib/planHelpers';
import { useProjects } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { useHeuristicLinks } from '@/hooks/useHeuristicLinks';
import { usePersonalHeuristics } from '@/hooks/usePersonalHeuristics';
import { useFrameworkTasks } from '@/hooks/useFrameworkTasks';
import { useFactors } from '@/hooks/useFactors';
import { Badge } from '@/components/ui/badge';
import { TaskCard, TaskUpdates } from '@/components/checklist/TaskCard';
import { useQuery } from '@tanstack/react-query';

interface ChecklistProps {
  projectId?: string;
}

// Combined task type that can represent any task source
interface UnifiedTask {
  id: string;
  text: string;
  completed: boolean;
  stage: Stage;
  source: 'heuristic' | 'factor' | 'custom' | 'framework';
  sourceName?: string;
  frameworkCode?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  owner?: string;
  order?: number;
}

export default function Checklist({ projectId }: ChecklistProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedPlanId, setSelectedPlanId } = usePlan();
  const { getSelectedProject } = useProjects();
  const queryClient = useQueryClient();
  
  // Current project ID
  const currentProjectId = projectId || getSelectedProject()?.id;
  
  // Hook to get framework tasks
  const { frameworkTasks, getTaskDetails } = useFrameworkTasks(currentProjectId);
  
  // Hook to get heuristic links
  const { links } = useHeuristicLinks(currentProjectId);
  
  // Hook to get personal heuristics
  const { heuristics } = usePersonalHeuristics(currentProjectId);
  
  // Hook to get success factors
  const { factors } = useFactors();
  
  // Plan state
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Stage>('Identification');
  
  // Query for the canonical checklist (when no plan exists)
  const { data: canonicalChecklist, isLoading: isLoadingCanonical } = useQuery({
    queryKey: [`/api/checklist/${currentProjectId}`],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const response = await fetch(`/api/checklist/${currentProjectId}`);
      if (!response.ok) throw new Error('Failed to fetch canonical checklist');
      return response.json();
    },
    // Only fetch the canonical checklist if no plan exists
    enabled: !plan && !!currentProjectId,
  });
  
  // All tasks combined from different sources
  const [allTasks, setAllTasks] = useState<Record<Stage, UnifiedTask[]>>({
    Identification: [],
    Definition: [],
    Delivery: [],
    Closure: []
  });
  
  // Check if the project still exists (for handling deletion cases)
  useEffect(() => {
    const checkProjectExists = async () => {
      const projectId = localStorage.getItem('selectedProjectId');
      if (!projectId) return;
      
      try {
        // Try to get the projects list
        const projects = await queryClient.fetchQuery({ 
          queryKey: ['/api/projects'],
          staleTime: 0 // Force a fresh fetch
        });
        
        // Check if the current project exists in the list
        const projectExists = Array.isArray(projects) && 
          projects.some((project: any) => project.id === projectId);
        
        // If the project doesn't exist anymore (i.e., it was deleted)
        if (!projectExists) {
          console.log('Selected project no longer exists, redirecting to home');
          // Clear the selected project from localStorage
          localStorage.removeItem('selectedProjectId');
          // Clear selected plan ID
          setSelectedPlanId(null);
          // Show toast notification
          toast({
            title: "Project Deleted",
            description: "The project you were viewing has been deleted.",
          });
          // Redirect to home
          setLocation('/');
        }
      } catch (error) {
        console.error('Error checking if project exists:', error);
      }
    };
    
    checkProjectExists();
  }, [queryClient, setLocation, toast, setSelectedPlanId]);
  
  // Filter and sort state
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Ensure a plan exists for the current project
  useEffect(() => {
    async function ensurePlan() {
      try {
        setLoading(true);
        // Use the projectId prop if provided, otherwise get the selected project
        const projectToUse = projectId ? { id: projectId } : getSelectedProject();
        
        if (projectToUse) {
          // If we have a project but no plan, ensure one exists
          console.log('Ensuring plan exists for project:', projectToUse.id);
          const planId = await ensurePlanForProject(projectToUse.id);
          console.log('ensurePlanForProject →', planId);
          
          if (!selectedPlanId || selectedPlanId !== planId) {
            console.log('Setting new plan ID:', planId);
            setSelectedPlanId(planId);
          }
          
          // Load the plan
          const pl = await loadPlan(planId);
          setPlan(pl || null);
        } else if (selectedPlanId) {
          // If we have a planId but no project, just load the plan
          console.log('Loading plan with ID:', selectedPlanId);
          const pl = await loadPlan(selectedPlanId);
          setPlan(pl || null);
        } else {
          // No project and no plan ID
          console.log('No project or plan ID found');
          setPlan(null);
        }
      } catch (err) {
        console.error('Error ensuring plan exists:', err);
        toast({
          title: 'Error loading plan',
          description: 'Please try again or select a different project.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }
    
    ensurePlan();
  }, [selectedPlanId, setSelectedPlanId, getSelectedProject, toast, projectId]);
  
  // Combine all tasks from different sources
  useEffect(() => {
    // Initialize the combined tasks object
    const combined: Record<Stage, UnifiedTask[]> = {
      Identification: [],
      Definition: [],
      Delivery: [],
      Closure: []
    };
    
    // If no plan but we have canonical checklist data, use that instead
    if (!plan && canonicalChecklist) {
      // Add tasks from canonical checklist
      Object.entries(canonicalChecklist.stages).forEach(([stageName, stageData]) => {
        const stage = stageName as Stage;
        if (stageData && stageData.tasks && Array.isArray(stageData.tasks)) {
          const canonicalTasks = stageData.tasks.map((task: any) => ({
            id: task.id,
            text: task.text,
            completed: task.completed || false,
            stage,
            source: task.origin as 'heuristic' | 'factor' | 'custom' | 'framework',
            sourceName: task.origin === 'factor' ? 'Success Factor' : undefined,
            notes: task.notes,
            priority: task.priority,
            dueDate: task.dueDate,
            owner: task.owner,
            order: task.order
          }));
          combined[stage].push(...canonicalTasks);
        }
      });
      setAllTasks(combined);
      return;
    }
    
    // If no plan and no canonical data, initialize with empty data
    if (!plan && !canonicalChecklist) {
      setAllTasks(combined);
      return;
    }
    
    // Helper function to add tasks to the combined object
    const addTasksToStage = (tasks: UnifiedTask[]) => {
      tasks.forEach(task => {
        if (task.stage) {
          combined[task.stage].push(task);
        }
      });
    };
    
    // 1. Add tasks from plan stages
    if (plan) {
      Object.entries(plan.stages).forEach(([stageName, stageData]) => {
      const stage = stageName as Stage;
      
      // Regular tasks
      if (stageData.tasks && stageData.tasks.length > 0) {
        const stageTasks = stageData.tasks.map(task => ({
          id: task.id,
          text: task.text,
          completed: task.completed || false,
          stage,
          source: task.origin as 'heuristic' | 'factor' | 'custom',
          sourceName: task.origin === 'factor' ? 'Success Factor' : undefined,
          notes: task.notes,
          priority: task.priority,
          dueDate: task.dueDate,
          owner: task.owner,
          order: task.order
        }));
        addTasksToStage(stageTasks);
      }
      
      // Good practice tasks
      if (stageData.goodPractice?.tasks && stageData.goodPractice.tasks.length > 0) {
        const goodPracticeTasks = stageData.goodPractice.tasks.map(task => ({
          id: task.id,
          text: task.text,
          completed: task.completed || false,
          stage,
          source: 'framework' as const,
          frameworkCode: task.frameworkCode,
          sourceName: task.frameworkCode ? `Framework: ${task.frameworkCode}` : 'Framework',
          notes: task.notes,
          priority: task.priority,
          dueDate: task.dueDate,
          owner: task.owner,
          order: task.order
        }));
        addTasksToStage(goodPracticeTasks);
      }
    });
    }
    
    // 2. Add framework tasks if not already included
    if (frameworkTasks?.savedTasks && frameworkTasks.savedTasks.length > 0) {
      const frameworkTasksList = frameworkTasks.savedTasks
        .filter(task => task.included)
        .map(task => {
          const taskDetails = getTaskDetails(task.taskId, task.frameworkCode);
          return {
            id: task.taskId,
            text: taskDetails?.name || 'Unknown task',
            completed: false, // Set default to false, will be updated from plan data if exists
            stage: task.stage as Stage,
            source: 'framework' as const,
            frameworkCode: task.frameworkCode,
            sourceName: `Framework: ${task.frameworkCode}`,
            notes: taskDetails?.description
          } as UnifiedTask;
        });
      
      // Only add tasks that aren't already in the combined list
      frameworkTasksList.forEach(task => {
        const existingTaskIndex = combined[task.stage].findIndex(t => 
          t.id === task.id && t.source === 'framework' && t.frameworkCode === task.frameworkCode
        );
        
        if (existingTaskIndex === -1) {
          combined[task.stage].push(task);
        }
      });
    }
    
    // Sort tasks within each stage by order
    Object.keys(combined).forEach(stageName => {
      const stage = stageName as Stage;
      combined[stage].sort((a, b) => {
        // Default to end of list for items without order
        const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    });
    
    // Update state with combined tasks
    setAllTasks(combined);
  }, [plan, frameworkTasks, getTaskDetails, canonicalChecklist]);
  
  // Handle plan update
  const handlePlanUpdate = (updatedPlan: PlanRecord) => {
    setPlan(updatedPlan);
    // Save the updated plan to storage
    if (selectedPlanId) {
      savePlan(selectedPlanId, { ...updatedPlan })
        .catch(err => {
          console.error('Error saving plan:', err);
          toast({
            title: "Error saving plan",
            description: "There was a problem saving your changes.",
            variant: "destructive",
          });
        });
    }
  };
  
  // Handle task update
  const handleTaskUpdate = (taskId: string, updates: TaskUpdates, stage: Stage, source: string) => {
    if (!plan) {
      // If no plan exists, show a message about creating a plan first
      toast({
        title: "No Plan Available",
        description: "Please create a plan first before updating tasks.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedPlan = { ...plan };
    
    // Determine if the task is a regular task or good practice task based on source
    const isGoodPractice = source === 'framework';
    
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
      if (updates.owner !== undefined) {
        task.owner = updates.owner;
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
      if (updates.title !== undefined) {
        task.text = updates.title;
      }
      if (updates.owner !== undefined) {
        task.owner = updates.owner;
      }
    }
    
    // Save plan and update UI
    if (selectedPlanId) {
      savePlan(selectedPlanId, updatedPlan);
      setPlan(updatedPlan);
      
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      });
    }
  };
  
  // Handle exporting the plan
  const handleExportPDF = () => {
    if (!plan) {
      toast({
        title: "No Plan Available",
        description: "Please create a plan first before exporting.",
        variant: "destructive"
      });
      return;
    }
    
    exportPlanPDF(plan);
    
    toast({
      title: "Checklist Exported",
      description: "Your checklist has been exported as a PDF.",
    });
  };
  
  const handleExportCSV = () => {
    if (!plan) {
      toast({
        title: "No Plan Available",
        description: "Please create a plan first before exporting.",
        variant: "destructive"
      });
      return;
    }
    
    exportCSV(plan);
    
    toast({
      title: "Checklist Exported",
      description: "Your checklist has been exported as a CSV file.",
    });
  };
  
  // Loading state
  if (loading || isLoadingCanonical) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-tcof-teal animate-spin" />
          <p className="text-tcof-dark font-medium">Loading your checklist...</p>
        </div>
      </div>
    );
  }
  
  // Even if no plan exists, we'll still display the checklist UI
  // Just track if we need to show a warning banner
  const showNoPlanWarning = !plan;
  
  // Calculate total tasks and completed tasks
  const getTotalAndCompleted = () => {
    let total = 0;
    let completed = 0;
    
    Object.values(allTasks).forEach(stageTasks => {
      total += stageTasks.length;
      completed += stageTasks.filter(t => t.completed).length;
    });
    
    return { total, completed };
  };
  
  const { total: totalTasks, completed: completedTasks } = getTotalAndCompleted();
  
  // Filter tasks based on the current filters
  const getFilteredTasks = (tasks: UnifiedTask[], stage: Stage) => {
    let filtered = [...tasks];
    
    // Apply stage filter
    if (stageFilter !== 'all' && stageFilter !== stage) {
      return [];
    }
    
    // Apply status filter
    if (statusFilter === 'completed') {
      filtered = filtered.filter(task => task.completed);
    } else if (statusFilter === 'open') {
      filtered = filtered.filter(task => !task.completed);
    }
    
    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(task => task.source === sourceFilter);
    }
    
    return filtered;
  };
  
  // Group tasks by source
  const getTasksBySource = (tasks: UnifiedTask[]) => {
    const grouped: Record<string, UnifiedTask[]> = {
      heuristic: [],
      factor: [],
      framework: [],
      custom: []
    };
    
    tasks.forEach(task => {
      grouped[task.source].push(task);
    });
    
    return grouped;
  };
  
  // Return the source group label
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'heuristic':
        return 'Heuristics';
      case 'factor':
        return 'Success Factors';
      case 'framework':
        return 'Framework Tasks';
      case 'custom':
        return 'Custom Tasks';
      default:
        return 'Other Tasks';
    }
  };
  
  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Warning banner if no plan exists */}
        {showNoPlanWarning && (
          <div className="mb-4 p-4 border-l-4 border-amber-500 bg-amber-50 text-amber-800 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CircleX className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium">Project Plan Required</h3>
                <div className="mt-2 text-sm">
                  <p>
                    {getSelectedProject() ? (
                      <>
                        The plan for <span className="font-semibold">{getSelectedProject()?.name}</span> needs to be initialized.
                        <Button 
                          variant="link" 
                          className="text-amber-800 underline p-0 h-auto font-semibold"
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const planId = await ensurePlanForProject(getSelectedProject()?.id as string);
                              setSelectedPlanId(planId);
                              const loadedPlan = await loadPlan(planId);
                              setPlan(loadedPlan || null);
                              toast({
                                title: "Plan Initialized",
                                description: "Your project plan has been created successfully."
                              });
                            } catch (err) {
                              console.error("Error creating plan:", err);
                              toast({
                                title: "Error Creating Plan",
                                description: "Please try again or select a different project.",
                                variant: "destructive"
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          Click here to initialize it.
                        </Button>
                      </>
                    ) : (
                      <>
                        No project is selected. Please select a project first to access the full checklist functionality.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* Outcome Progress Tracking */}
        {projectId ? (
          <ChecklistHeader projectId={projectId} />
        ) : getSelectedProject()?.id ? (
          <ChecklistHeader projectId={getSelectedProject()?.id as string} />
        ) : null}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-tcof-dark">Project Checklist</h1>
            <p className="text-gray-600 mt-1">
              Track and manage your project tasks across all stages
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="text-sm font-medium">
                Progress: {completedTasks}/{totalTasks} tasks completed
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExportPDF}
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Summary bar */}
        <div className="mb-6">
          <SummaryBar plan={plan} />
        </div>
        
        {/* View toggle button */}
        <div className="mb-4">
          <Button asChild variant="outline">
            <Link to="/factor-checklist">
              Switch to Factor-Based Checklist
            </Link>
          </Button>
        </div>
        
        {/* Filters */}
        <ChecklistFilterBar
          stageFilter={stageFilter}
          statusFilter={statusFilter}
          sourceFilter={sourceFilter}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onStageFilterChange={setStageFilter}
          onStatusFilterChange={setStatusFilter}
          onSourceFilterChange={setSourceFilter}
          onSortChange={setSortBy}
          onSortDirectionChange={setSortDirection}
        />
        
        {/* Task list by stage tabs */}
        <div className="mt-8">
          <Tabs 
            defaultValue="Identification" 
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Stage)}
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="Identification">Identification</TabsTrigger>
              <TabsTrigger value="Definition">Definition</TabsTrigger>
              <TabsTrigger value="Delivery">Delivery</TabsTrigger>
              <TabsTrigger value="Closure">Closure</TabsTrigger>
            </TabsList>
            
            {/* Render each stage's tab content */}
            {(['Identification', 'Definition', 'Delivery', 'Closure'] as Stage[]).map(stageName => {
              const filteredTasks = getFilteredTasks(allTasks[stageName], stageName);
              const groupedTasks = getTasksBySource(filteredTasks);
              
              // Skip empty tabs based on filter
              if (filteredTasks.length === 0 && stageFilter !== 'all' && stageFilter !== stageName) {
                return null;
              }
              
              return (
                <TabsContent key={stageName} value={stageName} className="mt-0">
                  <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                    <div className="p-4 bg-tcof-teal/10 border-b">
                      <h2 className="text-lg font-semibold text-tcof-dark">{stageName} Stage</h2>
                      <p className="text-sm text-gray-500">
                        {stageName === 'Identification' && 'Discover and assess project requirements and constraints'}
                        {stageName === 'Definition' && 'Outline scope, objectives, and success criteria'}
                        {stageName === 'Delivery' && 'Execute project activities and manage progress'}
                        {stageName === 'Closure' && 'Conclude project, capture lessons, and transition to operations'}
                      </p>
                    </div>
                    
                    <div className="p-4">
                      {/* Display message if no tasks for this stage */}
                      {filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No tasks available for this stage with the current filters.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Display tasks grouped by source */}
                          {Object.entries(groupedTasks).map(([source, tasks]) => {
                            if (tasks.length === 0) return null;
                            
                            return (
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
                                        />
                                      </div>
                                      <div className="flex-grow min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                          <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                            {task.text}
                                          </p>
                                          <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
                                            {task.sourceName && (
                                              <Badge 
                                                variant="outline" 
                                                className={`text-xs ${
                                                  task.source === 'heuristic' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                                  task.source === 'factor' ? 'bg-green-50 text-green-800 border-green-300' :
                                                  task.source === 'framework' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                                                  'bg-gray-50 text-gray-800 border-gray-300'
                                                }`}
                                              >
                                                {task.sourceName}
                                              </Badge>
                                            )}
                                            
                                            {task.owner && (
                                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                                                Owner: {task.owner}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {task.notes && (
                                          <p className="mt-1 text-xs text-gray-500">{task.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
        
        {/* Legacy stage accordions (hidden but still updated for export) */}
        {plan && (
          <div className="hidden">
            {Object.keys(plan.stages).map((stageName) => (
              <StageAccordion
                key={stageName}
                stage={stageName as any}
                plan={plan}
                onPlanUpdate={handlePlanUpdate}
                stageFilter={stageFilter}
                statusFilter={statusFilter}
                sourceFilter={sourceFilter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}