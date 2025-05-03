import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import ActionButtons from '@/components/plan/ActionButtons';
import IntroAccordion from '@/components/plan/IntroAccordion';
import SuccessFactorMapping from '@/components/plan/SuccessFactorMapping';
import TaskList from '@/components/plan/TaskList';
import StageSelector from '@/components/plan/StageSelector';
import FactorTaskEditor, { StageType } from '@/components/plan/FactorTaskEditor';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Trash2, ArrowDown } from 'lucide-react';
import { Stage, loadPlan, savePlan, createEmptyPlan, addPolicyTask, removePolicyTask, PolicyTask } from '@/lib/plan-db';
import { getTcofFactors } from '@/lib/tcofData';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";

export default function Block2Design() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [planId, setPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState<Stage>('Identification');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newPolicyTask, setNewPolicyTask] = useState('');
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [factorTasks, setFactorTasks] = useState<Record<StageType, string[]>>({
    Identification: [],
    Definition: [],
    Delivery: [],
    Closure: []
  });
  
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
  
  // Add policy task
  const handleAddPolicyTask = async () => {
    if (!newPolicyTask.trim() || !planId) return;
    
    try {
      await addPolicyTask(planId, newPolicyTask.trim(), currentStage);
      setNewPolicyTask('');
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: "Policy task added",
        description: `Added "${newPolicyTask}" to ${currentStage} stage`,
      });
    } catch (error) {
      console.error('Error adding policy task:', error);
      toast({
        title: "Error",
        description: "Failed to add policy task",
        variant: "destructive"
      });
    }
  };
  
  // Remove policy task
  const handleRemovePolicyTask = async (taskId: string) => {
    if (!planId) return;
    
    try {
      await removePolicyTask(planId, taskId, currentStage);
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: "Policy task removed",
        description: "The task has been removed from your plan",
      });
    } catch (error) {
      console.error('Error removing policy task:', error);
      toast({
        title: "Error",
        description: "Failed to remove policy task",
        variant: "destructive"
      });
    }
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
        
        <div className="space-y-10 mb-8">
          {/* Stage selector */}
          <StageSelector currentStage={currentStage} onStageChange={handleStageChange} />
          
          {/* Step 3 – Link Heuristics to Success Factors */}
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-bold text-primary">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">3</div>
                Link Heuristics to Success Factors
              </CardTitle>
              <CardDescription>
                Connect your personal heuristics to the 12 official TCOF success factors.
                This mapping helps identify which success factors are most relevant to your context.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <SuccessFactorMapping 
                planId={planId || ''} 
                stage={currentStage}
                heuristics={personalHeuristics}
                mappings={mappings}
                onMappingChange={handleMappingChange}
              />
            </CardContent>
            
            <div className="flex justify-center my-2">
              <ArrowDown className="text-gray-400" />
            </div>
          </Card>
          
          {/* Step 4 – Identify Tasks per Heuristic */}
          <Card className="border-t-4 border-t-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-bold text-primary">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">4</div>
                Identify Tasks per Heuristic
              </CardTitle>
              <CardDescription>
                Create up to 3 tasks per heuristic for each stage (Identification, Definition, Delivery, Closure).
                These tasks will be automatically added to your checklist. The standard TCOF tasks are shown
                alongside your custom tasks.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* This component will automatically load and display tasks from mapped success factors */}
              <TaskList 
                planId={planId || ''}
                tasks={tasks}
                policyTasks={policyTasks}
                stage={currentStage}
                onTasksChange={handleTasksChange}
                mappings={mappings}
                autoLoadFactorTasks={true}
              />
            </CardContent>
            
            <div className="flex justify-center my-2">
              <ArrowDown className="text-gray-400" />
            </div>
          </Card>
          
          {/* Step 5 – Add Organisational Policy Tasks */}
          <Card className="border-t-4 border-t-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center text-xl font-bold text-primary">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">5</div>
                Add Organisational Policy Tasks
              </CardTitle>
              <CardDescription>
                Add tasks specific to your organization's policies or governance requirements.
                These will be included in your final checklist alongside TCOF tasks and your custom tasks.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="p-4 border-2 border-dashed rounded-md border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
                <h3 className="text-lg font-medium mb-3">Organization-Specific Tasks</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add tasks that are required by your organization's policies or governance frameworks.
                  These might include approvals, documentation, or compliance checks specific to your context.
                </p>
                
                <div className="space-y-3">
                  {/* Policy Task Input */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Enter policy task for {currentStage} stage:</label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        placeholder="e.g., Get sign-off from Finance department" 
                        className="flex-1 p-2 border rounded-md"
                        value={newPolicyTask}
                        onChange={(e) => setNewPolicyTask(e.target.value)}
                      />
                      <Button onClick={handleAddPolicyTask}>Add Task</Button>
                    </div>
                  </div>
                  
                  {/* Display existing policy tasks */}
                  {policyTasks.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Current Policy Tasks:</h4>
                      <ul className="space-y-2">
                        {policyTasks.map((task) => (
                          <li key={task.id} className="flex items-center justify-between p-2 bg-white rounded-md border">
                            <span>{task.text}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemovePolicyTask(task.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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