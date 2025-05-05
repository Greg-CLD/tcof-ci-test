import React, { useState, useEffect } from 'react';
import { PlanRecord, loadPlan, savePlan } from '@/lib/plan-db';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CircleX, Download, FileText, Loader2 } from 'lucide-react';
import StageAccordion from '@/components/checklist/StageAccordion';
import SummaryBar from '@/components/checklist/SummaryBar';
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

export default function Checklist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedPlanId, setSelectedPlanId } = usePlan();
  const { getSelectedProject } = useProjects();
  const queryClient = useQueryClient();
  
  // Plan state
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  
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
        const selectedProject = getSelectedProject();
        
        if (selectedProject) {
          // If we have a project but no plan, ensure one exists
          console.log('Ensuring plan exists for project:', selectedProject.id);
          const planId = await ensurePlanForProject(selectedProject.id);
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
  }, [selectedPlanId, setSelectedPlanId, getSelectedProject, toast]);
  
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
  
  // Handle exporting the plan
  const handleExportPDF = () => {
    if (!plan) return;
    
    exportPlanPDF(plan);
    
    toast({
      title: "Checklist Exported",
      description: "Your checklist has been exported as a PDF.",
    });
  };
  
  const handleExportCSV = () => {
    if (!plan) return;
    
    exportCSV(plan);
    
    toast({
      title: "Checklist Exported",
      description: "Your checklist has been exported as a CSV file.",
    });
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-tcof-teal animate-spin" />
          <p className="text-tcof-dark font-medium">Loading your plan...</p>
        </div>
      </div>
    );
  }
  
  // No plan state
  if (!plan) {
    // Get the currently selected project to show relevant information
    const selectedProject = getSelectedProject();
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <CircleX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-tcof-dark mb-2">Project Plan Setup Required</h2>
          
          {selectedProject ? (
            <>
              <p className="text-gray-600 mb-6">
                The plan for <span className="font-semibold">{selectedProject.name}</span> needs to be initialized.
                Please complete the process by clicking the button below.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const planId = await ensurePlanForProject(selectedProject.id);
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
                  Initialize Project Plan
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">
                    Return to Home
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                You need to select or create a project before you can view the task checklist.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild>
                  <Link to="/make-a-plan">
                    Create a Plan
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">
                    Return to Home
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  
  // Calculate total tasks and completed tasks
  const getTotalAndCompleted = () => {
    let total = 0;
    let completed = 0;
    
    Object.values(plan.stages).forEach(stage => {
      // Regular tasks
      if (stage.tasks) {
        total += stage.tasks.length;
        completed += stage.tasks.filter(t => t.completed).length;
      }
      
      // Good practice tasks
      if (stage.goodPractice?.tasks) {
        total += stage.goodPractice.tasks.length;
        completed += stage.goodPractice.tasks.filter(t => t.completed).length;
      }
    });
    
    return { total, completed };
  };
  
  const { total: totalTasks, completed: completedTasks } = getTotalAndCompleted();
  
  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
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
        
        {/* Task list by stage */}
        <div>
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
      </div>
    </div>
  );
}