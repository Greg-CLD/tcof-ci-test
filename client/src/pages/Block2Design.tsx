import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import ActionButtons from '@/components/plan/ActionButtons';
import IntroAccordion from '@/components/plan/IntroAccordion';
import SuccessFactorMapping from '@/components/plan/SuccessFactorMapping';
import ExcelImport from '@/components/plan/ExcelImport';
import TaskList from '@/components/plan/TaskList';
import StageSelector from '@/components/plan/StageSelector';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from 'lucide-react';
import { Stage, loadPlan, savePlan, createEmptyPlan } from '@/lib/plan-db';

export default function Block2Design() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [planId, setPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState<Stage>('Identification');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Define steps for the progress bar
  const steps: Step[] = [
    { id: 'block-1', label: 'Block 1: Discover', completed: true },
    { id: 'block-2', label: 'Block 2: Design', completed: false },
    { id: 'block-3', label: 'Block 3: Deliver', completed: false },
  ];
  
  // Load or create plan
  useEffect(() => {
    async function initializePlan() {
      try {
        // Try to load the active plan ID from localStorage
        const savedPlanId = localStorage.getItem('activePlanId');
        
        if (savedPlanId) {
          // Check if the plan exists
          const plan = await loadPlan(savedPlanId);
          if (plan) {
            setPlanId(savedPlanId);
            setIsLoading(false);
            return;
          }
        }
        
        // Create a new plan if none exists
        const newPlanId = await createEmptyPlan();
        setPlanId(newPlanId);
        localStorage.setItem('activePlanId', newPlanId);
      } catch (error) {
        console.error('Error initializing plan:', error);
        // Create a fallback plan in case of error
        try {
          const fallbackPlanId = await createEmptyPlan();
          setPlanId(fallbackPlanId);
          localStorage.setItem('activePlanId', fallbackPlanId);
        } catch (fallbackError) {
          console.error('Failed to create fallback plan:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    initializePlan();
  }, []);
  
  // Get plan data for the current stage
  const [planData, setPlanData] = useState<any>(null);

  // Load plan data whenever the planId or stage changes
  useEffect(() => {
    async function fetchPlanData() {
      if (!planId) return;
      
      try {
        const data = await loadPlan(planId);
        setPlanData(data);
      } catch (error) {
        console.error('Error loading plan data:', error);
      }
    }
    
    fetchPlanData();
  }, [planId, refreshTrigger]);
  
  const stageData = planData?.stages?.[currentStage] || {};
  
  // Get personal heuristics from Block 1
  const personalHeuristics = stageData?.personalHeuristics || [];
  
  // Get mappings, tasks, and policy tasks for the current stage
  const mappings = stageData?.mappings || [];
  const tasks = stageData?.tasks || [];
  const policyTasks = stageData?.policyTasks || [];
  
  const handleStageChange = (stage: Stage) => {
    setCurrentStage(stage);
  };
  
  const handleMappingChange = () => {
    // Trigger refresh when mappings change
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleTasksChange = () => {
    // Trigger refresh when tasks change
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleBack = () => {
    setLocation('/make-a-plan/full/block-1');
  };
  
  const handleNext = () => {
    setLocation('/make-a-plan/full/block-3');
  };
  
  const handleSkipToChecklist = () => {
    setLocation('/checklist');
  };
  
  // Clear Block 2 data
  const handleClearBlock = async () => {
    if (!planId || !planData) return;
    
    try {
      // Create a copy of the plan with empty data for all stages
      const updatedPlan = { 
        ...planData,
        stages: {
          ...planData.stages,
          Identification: {
            ...planData.stages.Identification,
            mappings: [],
            tasks: [],
            policyTasks: []
          },
          Definition: {
            ...planData.stages.Definition,
            mappings: [],
            tasks: [],
            policyTasks: []
          },
          Delivery: {
            ...planData.stages.Delivery,
            mappings: [],
            tasks: [],
            policyTasks: []
          },
          Closure: {
            ...planData.stages.Closure,
            mappings: [],
            tasks: [],
            policyTasks: []
          }
        }
      };
      
      // Save the updated plan
      const success = await savePlan(planId, updatedPlan);
      
      if (success) {
        // Trigger refresh to update the UI
        setRefreshTrigger(prev => prev + 1);
        
        // Show success message
        toast({
          title: "Block cleared",
          description: "All mappings and tasks have been removed",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to clear block data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error clearing block:', error);
      toast({
        title: "Error",
        description: "Failed to clear block data",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <ProgressNav steps={steps} currentStepId="block-2" />
        
        <h1 className="text-3xl font-bold text-tcof-dark mb-6">Block 2: Connect & Build</h1>
        
        <IntroAccordion title="TCOF Phase 2: Connect & Build">
          <p className="mb-4">
            In this phase, you'll map your personal heuristics to TCOF success factors and import tasks 
            from the TCOF framework. This helps you build a comprehensive task list based on proven practices.
          </p>
          <p>
            Steps to complete this block:
          </p>
          <ol className="list-decimal list-inside space-y-2 mt-2 mb-4">
            <li>Select a project stage (Identification, Definition, Delivery, or Closure)</li>
            <li>Map your personal heuristics to TCOF success factors</li>
            <li>Import tasks from the TCOF framework</li>
            <li>Add custom policy tasks as needed</li>
            <li>Repeat for each project stage</li>
          </ol>
        </IntroAccordion>
        
        {personalHeuristics.length === 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No personal heuristics found</AlertTitle>
            <AlertDescription>
              Please go back to Block 1 and add some personal heuristics before proceeding with this step.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6 mb-8">
          {/* Stage selector */}
          <StageSelector currentStage={currentStage} onStageChange={handleStageChange} />
          
          {/* Success Factor Mapping */}
          <SuccessFactorMapping 
            planId={planId || ''} 
            stage={currentStage}
            heuristics={personalHeuristics}
            mappings={mappings}
            onMappingChange={handleMappingChange}
          />
          
          {/* Excel Import */}
          <ExcelImport 
            planId={planId || ''}
            stage={currentStage}
            onTasksImported={handleTasksChange}
            mappings={mappings}
          />
          
          {/* Task List */}
          <TaskList 
            planId={planId || ''}
            tasks={tasks}
            policyTasks={policyTasks}
            stage={currentStage}
            onTasksChange={handleTasksChange}
          />
        </div>
        
        <ActionButtons 
          onPrevious={handleBack}
          onNext={handleNext}
          onSkip={handleSkipToChecklist}
          onClear={handleClearBlock}
          showSkip={true}
          showClear={true}
          isNextDisabled={false}
        />
      </div>
    </div>
  );
}