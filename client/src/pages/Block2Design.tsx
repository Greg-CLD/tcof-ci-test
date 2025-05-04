import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import OrgPolicies from '@/components/plan/OrgPolicies';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Trash2, ArrowDown } from 'lucide-react';
import { Stage, loadPlan, savePlan, createEmptyPlan, addPolicyTask, removePolicyTask, PolicyTask, PersonalHeuristic, Mapping } from '@/lib/plan-db';
import { getTcofFactorOptions } from '@/lib/tcofData';
import { getTcofFactorsAsItems, getFactorTasks, getFactorNameById, initializeFactors } from '@/lib/factorTaskUtils';
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
  
  // State for organizational policies
  const [orgPolicies, setOrgPolicies] = useState<Array<{
    id: string;
    title: string;
    tasks: Record<StageType, string[]>;
  }>>([]);
  
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
  
  // Get only unmapped heuristics for Step 4
  const unmappedHeuristics = personalHeuristics.filter((h: PersonalHeuristic) => 
    !mappings.some((m: Mapping) => m.heuristicId === h.id && m.factorId !== null)
  );
  
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
  
  // Initialize TCOF factors on component mount
  useEffect(() => {
    const loadFactors = async () => {
      // This will load and cache the factors for synchronous access
      await initializeFactors();
    };
    
    loadFactors();
  }, []);
  
  // Load the selected item's tasks (either TCOF factor or user heuristic)
  useEffect(() => {
    if (!selectedFactorId) return;
    
    // Check if this is a user heuristic or TCOF factor
    const isUserHeuristic = unmappedHeuristics.some((h: PersonalHeuristic) => h.id === selectedFactorId);
    
    if (isUserHeuristic) {
      // For user heuristics, get tasks from the plan data
      if (planData && planData.stages) {
        const userTasks: Record<StageType, string[]> = {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        };
        
        // For each stage, find tasks associated with this heuristic
        const stages: StageType[] = ['Identification', 'Definition', 'Delivery', 'Closure'];
        stages.forEach(stage => {
          const tasks = planData.stages[currentStage].tasks?.filter(
            (t: any) => t.heuristicId === selectedFactorId && t.stage === stage
          ) || [];
          
          userTasks[stage as StageType] = tasks.map((t: any) => t.text);
        });
        
        setFactorTasks(userTasks);
      }
    } else {
      // For TCOF factors, get tasks from the success factors data
      const identificationTasks = getFactorTasks(selectedFactorId, 'Identification');
      const definitionTasks = getFactorTasks(selectedFactorId, 'Definition');
      const deliveryTasks = getFactorTasks(selectedFactorId, 'Delivery');
      const closureTasks = getFactorTasks(selectedFactorId, 'Closure');
      
      setFactorTasks({
        Identification: identificationTasks,
        Definition: definitionTasks,
        Delivery: deliveryTasks,
        Closure: closureTasks
      });
    }
  }, [selectedFactorId, planData, currentStage, unmappedHeuristics]);
  
  // Handler for selecting a factor
  const handleSelectFactor = (factorId: string) => {
    setSelectedFactorId(factorId);
  };
  
  // Handler for adding a task
  const handleAddTask = async (heuristicId: string, stage: StageType) => {
    if (!planId) return;
    
    try {
      // Check if the ID belongs to a user heuristic or TCOF factor
      const isUserHeuristic = unmappedHeuristics.some((h: PersonalHeuristic) => h.id === heuristicId);
      
      // Add empty task to UI first
      setFactorTasks(prev => {
        const stageTasks = [...prev[stage]];
        stageTasks.push('New task');
        return { ...prev, [stage]: stageTasks };
      });
      
      // Then update the plan data
      const updatedPlan = { ...planData };
      if (!updatedPlan.stages[currentStage].tasks) {
        updatedPlan.stages[currentStage].tasks = [];
      }
      
      // Add task with appropriate data structure based on origin
      updatedPlan.stages[currentStage].tasks.push({
        id: uuidv4(), // Generate UUID for the task
        text: 'New task',
        stage: stage,
        origin: isUserHeuristic ? 'userHeuristic' : 'factor',
        heuristicId: isUserHeuristic ? heuristicId : undefined,
        factorId: isUserHeuristic ? undefined : heuristicId,
        completed: false
      });
      
      await savePlan(planId, updatedPlan);
      setRefreshTrigger(prev => prev + 1);
      
      // Find appropriate description text based on item type
      const itemName = isUserHeuristic
        ? unmappedHeuristics.find((h: PersonalHeuristic) => h.id === heuristicId)?.text || heuristicId
        : getFactorNameById(heuristicId);
      
      toast({
        title: 'Task added',
        description: `Added new task to ${stage} for "${itemName}"`,
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive'
      });
    }
  };
  
  // Handler for updating a task
  const handleUpdateTask = async (itemId: string, stage: StageType, taskIndex: number, newText: string) => {
    if (!planId) return;
    
    try {
      // Check if this is a user heuristic task
      const isUserHeuristic = unmappedHeuristics.some((h: PersonalHeuristic) => h.id === itemId);
      
      // Update UI first
      setFactorTasks(prev => {
        const stageTasks = [...prev[stage]];
        stageTasks[taskIndex] = newText;
        return { ...prev, [stage]: stageTasks };
      });
      
      // Then update the plan data
      const updatedPlan = { ...planData };
      const taskToUpdate = updatedPlan.stages[currentStage].tasks.find(
        (t: any) => {
          if (isUserHeuristic) {
            return t.heuristicId === itemId && t.stage === stage && t.origin === 'userHeuristic';
          } else {
            return t.factorId === itemId && t.stage === stage;
          }
        }
      );
      
      if (taskToUpdate) {
        taskToUpdate.text = newText;
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    }
  };
  
  // Handler for deleting a task
  const handleDeleteTask = async (itemId: string, stage: StageType, taskIndex: number) => {
    if (!planId) return;
    
    try {
      // Check if this is a user heuristic task
      const isUserHeuristic = unmappedHeuristics.some((h: PersonalHeuristic) => h.id === itemId);
      
      // Update UI first
      setFactorTasks(prev => {
        const stageTasks = [...prev[stage]];
        stageTasks.splice(taskIndex, 1);
        return { ...prev, [stage]: stageTasks };
      });
      
      // Then update the plan data
      const updatedPlan = { ...planData };
      const taskIndex = updatedPlan.stages[currentStage].tasks.findIndex(
        (t: any) => {
          if (isUserHeuristic) {
            return t.heuristicId === itemId && t.stage === stage && t.origin === 'userHeuristic';
          } else {
            return t.factorId === itemId && t.stage === stage;
          }
        }
      );
      
      if (taskIndex !== -1) {
        updatedPlan.stages[currentStage].tasks.splice(taskIndex, 1);
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
        
        // Find appropriate description text for toast message
        const itemName = isUserHeuristic
          ? unmappedHeuristics.find((h: PersonalHeuristic) => h.id === itemId)?.text || 'heuristic'
          : 'factor';
          
        toast({
          title: 'Task deleted',
          description: `The task has been removed from your ${itemName}`,
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive'
      });
    }
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
  
  // Legacy policy task methods
  const handleLegacyAddPolicyTask = async () => {
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
  
  // Remove policy task - legacy method
  const handleLegacyRemovePolicyTask = async (taskId: string) => {
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
  
  // New Policy-related methods for OrgPolicies component
  
  const handleAddPolicy = async (title: string) => {
    if (!planId || !title.trim()) return;
    
    try {
      // Create a new policy with empty tasks
      const newPolicy = {
        id: uuidv4(),
        title: title.trim(),
        tasks: {
          Identification: [],
          Definition: [],
          Delivery: [],
          Closure: []
        }
      };
      
      // Update local state
      setOrgPolicies(prev => [...prev, newPolicy]);
      
      // Update plan data
      const updatedPlan = { ...planData };
      if (!updatedPlan.stages[currentStage].orgPolicies) {
        updatedPlan.stages[currentStage].orgPolicies = [];
      }
      
      updatedPlan.stages[currentStage].orgPolicies.push(newPolicy);
      await savePlan(planId, updatedPlan);
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: 'Policy created',
        description: `Added new policy "${title}"`,
      });
    } catch (error) {
      console.error('Error adding policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to add policy',
        variant: 'destructive'
      });
    }
  };
  
  const handleUpdatePolicy = async (policyId: string, title: string) => {
    if (!planId || !title.trim()) return;
    
    try {
      // Update local state
      setOrgPolicies(prev => prev.map(policy => 
        policy.id === policyId ? { ...policy, title: title.trim() } : policy
      ));
      
      // Update plan data
      const updatedPlan = { ...planData };
      const policyToUpdate = updatedPlan.stages[currentStage].orgPolicies?.find(
        (p: any) => p.id === policyId
      );
      
      if (policyToUpdate) {
        policyToUpdate.title = title.trim();
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: 'Policy updated',
          description: `Updated policy title to "${title}"`,
        });
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to update policy',
        variant: 'destructive'
      });
    }
  };
  
  const handleDeletePolicy = async (policyId: string) => {
    if (!planId) return;
    
    try {
      // Update local state
      setOrgPolicies(prev => prev.filter(policy => policy.id !== policyId));
      
      // Update plan data
      const updatedPlan = { ...planData };
      if (updatedPlan.stages[currentStage].orgPolicies) {
        updatedPlan.stages[currentStage].orgPolicies = updatedPlan.stages[currentStage].orgPolicies.filter(
          (p: any) => p.id !== policyId
        );
        
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: 'Policy deleted',
          description: 'The policy has been removed from your plan',
        });
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete policy',
        variant: 'destructive'
      });
    }
  };
  
  const handleAddOrgPolicyTask = async (policyId: string, stage: StageType) => {
    if (!planId) return;
    
    try {
      // Update local state
      setOrgPolicies(prev => prev.map(policy => {
        if (policy.id === policyId) {
          const updatedTasks = { ...policy.tasks };
          updatedTasks[stage] = [...updatedTasks[stage], 'New task'];
          return { ...policy, tasks: updatedTasks };
        }
        return policy;
      }));
      
      // Update plan data
      const updatedPlan = { ...planData };
      const policyToUpdate = updatedPlan.stages[currentStage].orgPolicies?.find(
        (p: any) => p.id === policyId
      );
      
      if (policyToUpdate) {
        if (!policyToUpdate.tasks[stage]) {
          policyToUpdate.tasks[stage] = [];
        }
        
        policyToUpdate.tasks[stage].push('New task');
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: 'Task added',
          description: `Added new task to ${stage} stage`,
        });
      }
    } catch (error) {
      console.error('Error adding policy task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add policy task',
        variant: 'destructive'
      });
    }
  };
  
  const handleUpdatePolicyTask = async (policyId: string, stage: StageType, taskIndex: number, newText: string) => {
    if (!planId) return;
    
    try {
      // Update local state
      setOrgPolicies(prev => prev.map(policy => {
        if (policy.id === policyId) {
          const updatedTasks = { ...policy.tasks };
          if (updatedTasks[stage] && updatedTasks[stage][taskIndex] !== undefined) {
            updatedTasks[stage] = [
              ...updatedTasks[stage].slice(0, taskIndex),
              newText,
              ...updatedTasks[stage].slice(taskIndex + 1)
            ];
          }
          return { ...policy, tasks: updatedTasks };
        }
        return policy;
      }));
      
      // Update plan data
      const updatedPlan = { ...planData };
      const policyToUpdate = updatedPlan.stages[currentStage].orgPolicies?.find(
        (p: any) => p.id === policyId
      );
      
      if (policyToUpdate && policyToUpdate.tasks[stage] && policyToUpdate.tasks[stage][taskIndex] !== undefined) {
        policyToUpdate.tasks[stage][taskIndex] = newText;
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating policy task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update policy task',
        variant: 'destructive'
      });
    }
  };
  
  const handleDeletePolicyTask = async (policyId: string, stage: StageType, taskIndex: number) => {
    if (!planId) return;
    
    try {
      // Update local state
      setOrgPolicies(prev => prev.map(policy => {
        if (policy.id === policyId) {
          const updatedTasks = { ...policy.tasks };
          if (updatedTasks[stage] && updatedTasks[stage][taskIndex] !== undefined) {
            updatedTasks[stage] = [
              ...updatedTasks[stage].slice(0, taskIndex),
              ...updatedTasks[stage].slice(taskIndex + 1)
            ];
          }
          return { ...policy, tasks: updatedTasks };
        }
        return policy;
      }));
      
      // Update plan data
      const updatedPlan = { ...planData };
      const policyToUpdate = updatedPlan.stages[currentStage].orgPolicies?.find(
        (p: any) => p.id === policyId
      );
      
      if (policyToUpdate && policyToUpdate.tasks[stage] && policyToUpdate.tasks[stage][taskIndex] !== undefined) {
        policyToUpdate.tasks[stage].splice(taskIndex, 1);
        await savePlan(planId, updatedPlan);
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: 'Task deleted',
          description: 'The task has been removed from your policy',
        });
      }
    } catch (error) {
      console.error('Error deleting policy task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete policy task',
        variant: 'destructive'
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
        
        {/* Stage Selector */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Select Project Stage</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose the project stage you want to work on. Each stage requires its own set of mappings and tasks.
          </p>
          <StageSelector
            currentStage={currentStage}
            onStageChange={handleStageChange}
          />
        </div>
        
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
              {unmappedHeuristics.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>All personal heuristics have been mapped to TCOF success factors in Step 3.</p>
                  <p className="mt-2">If you want to add tasks for unmapped heuristics, please go back to Step 3 and unmap some heuristics.</p>
                </div>
              ) : (
                /* FactorTaskEditor for creating tasks for unmapped heuristics */
                <FactorTaskEditor
                  items={unmappedHeuristics.map((h: PersonalHeuristic) => ({ id: h.id, title: h.text }))}
                  selectedItemId={selectedFactorId}
                  title="Heuristic Tasks"
                  description="Select a personal heuristic from the list to add specific tasks for each stage."
                  tasks={factorTasks}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onSelectItem={handleSelectFactor}
                  isAutoSaving={false}
                />
              )}
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
                      <Button onClick={handleLegacyAddPolicyTask}>Add Task</Button>
                    </div>
                  </div>
                  
                  {/* Display existing policy tasks */}
                  {policyTasks.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Current Policy Tasks:</h4>
                      <ul className="space-y-2">
                        {policyTasks.map((task: PolicyTask) => (
                          <li key={task.id} className="flex items-center justify-between p-2 bg-white rounded-md border">
                            <span>{task.text}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleLegacyRemovePolicyTask(task.id)}>
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