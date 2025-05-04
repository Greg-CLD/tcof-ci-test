import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import ActionButtons from '@/components/plan/ActionButtons';
import IntroAccordion from '@/components/plan/IntroAccordion';
import DeliveryApproachTool, { DeliveryApproachData } from '@/components/DeliveryApproachTool';
import FrameworkPicker from '@/components/plan/FrameworkPicker';
import CustomFrameworkEditor from '@/components/plan/CustomFrameworkEditor';
import ReviewCard from '@/components/plan/ReviewCard';
import { 
  Stage, 
  loadPlan, 
  savePlan, 
  createEmptyPlan, 
  setZone, 
  toggleFramework, 
  toggleGpTask, 
  markPlanComplete,
  CustomFramework
} from '@/lib/plan-db';
import { getFrameworkByCode } from '@/lib/goodPracticeData';
import { 
  setDeliveryApproach,
  createCustomFramework,
  addTaskToCustomFramework,
  removeTaskFromCustomFramework,
  removeCustomFramework
} from '@/lib/planHelpers';
import styles from '@/lib/styles/gp.module.css';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import '../styles/approach.css';

// Define interface for good practice task
interface GPTask {
  frameworkCode: string;
  stage: Stage;
  text: string;
}

export default function Block3Complete() {
  const [_, setLocation] = useLocation();
  const [planId, setPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [zoneSelected, setZoneSelected] = useState(false);
  const [praxisZone, setPraxisZone] = useState<string | null>(null);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, Record<Stage, string[]>>>({});
  const [customFrameworks, setCustomFrameworks] = useState<CustomFramework[]>([]);
  const { toast } = useToast();
  
  // Define steps for the progress bar
  const steps: Step[] = [
    { id: 'block-1', label: 'Block 1: Discover', completed: true },
    { id: 'block-2', label: 'Block 2: Design', completed: true },
    { id: 'block-3', label: 'Block 3: Complete', completed: false },
  ];
  
  // Load or create plan
  useEffect(() => {
    async function loadExistingPlan() {
      // Try to load the active plan ID from localStorage
      const savedPlanId = localStorage.getItem('activePlanId');
      
      if (savedPlanId) {
        try {
          // Check if the plan exists
          const plan = await loadPlan(savedPlanId);
          if (plan && plan.stages && plan.stages.Identification) {
            setPlanId(savedPlanId);
            
            // Load zone and frameworks if they exist
            const goodPractice = plan.stages.Identification.goodPractice;
            if (goodPractice?.zone) {
              setPraxisZone(goodPractice.zone);
              setZoneSelected(true);
              setSelectedFrameworks(goodPractice.frameworks || []);
              
              // Build selected tasks map
              const tasksMap: Record<string, Record<Stage, string[]>> = {};
              
              // Process all stages
              Object.keys(plan.stages).forEach(stageKey => {
                const stage = stageKey as Stage;
                const stageGoodPractice = plan.stages[stage].goodPractice;
                
                if (stageGoodPractice?.tasks) {
                  // Group tasks by framework code
                  stageGoodPractice.tasks.forEach((task: GPTask) => {
                    if (!tasksMap[task.frameworkCode]) {
                      tasksMap[task.frameworkCode] = {
                        'Identification': [],
                        'Definition': [],
                        'Delivery': [],
                        'Closure': []
                      };
                    }
                    
                    // Check if the stage is a valid Stage type before accessing
                    if (Object.prototype.hasOwnProperty.call(tasksMap[task.frameworkCode], task.stage)) {
                      tasksMap[task.frameworkCode][task.stage as Stage].push(task.text);
                    }
                  });
                }
                
                // Load custom frameworks if they exist
                if (stageGoodPractice?.customFrameworks) {
                  setCustomFrameworks(stageGoodPractice.customFrameworks);
                  // Only need to load from one stage since they're the same across all stages
                  return;
                }
              });
              
              setSelectedTasks(tasksMap);
            }
            
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error loading plan:", error);
          // Continue to create a new plan
        }
      }
      
      // Create a new plan if none exists or if there was an error
      try {
        const newPlanId = await createEmptyPlan();
        setPlanId(newPlanId);
        localStorage.setItem('activePlanId', newPlanId);
      } catch (error) {
        console.error("Error creating new plan:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadExistingPlan();
  }, []);
  
  const handleZoneSelected = (zone: string, suggestedFrameworks: string[]) => {
    if (!planId) return;
    
    // Set zone in plan
    setZone(planId, zone);
    setPraxisZone(zone);
    setZoneSelected(true);
    
    // Auto-select suggested frameworks
    suggestedFrameworks.forEach(code => {
      toggleFramework(planId, code);
      
      // Auto-select all tasks for each framework
      const framework = getFrameworkByCode(code);
      if (framework) {
        // For each stage, add all tasks
        Object.entries(framework.tasks).forEach(([stageKey, tasks]) => {
          const stage = stageKey as Stage;
          tasks.forEach(task => {
            toggleGpTask(planId, task, code, stage);
          });
        });
      }
    });
    
    // Update state
    setSelectedFrameworks(suggestedFrameworks);
    
    // Build selected tasks map
    const tasksMap: Record<string, Record<Stage, string[]>> = {};
    
    suggestedFrameworks.forEach(code => {
      const framework = getFrameworkByCode(code);
      if (framework) {
        tasksMap[code] = {
          'Identification': [...framework.tasks.Identification],
          'Definition': [...framework.tasks.Definition],
          'Delivery': [...framework.tasks.Delivery],
          'Closure': [...framework.tasks.Closure]
        };
      }
    });
    
    setSelectedTasks(tasksMap);
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: 'Zone Selected',
      description: `You've selected ${zone}. Suggested frameworks have been added.`,
      variant: 'default',
    });
  };
  
  const handleFrameworkToggle = (frameworkCode: string) => {
    if (!planId) return;
    
    // Toggle framework in plan
    toggleFramework(planId, frameworkCode);
    
    // Update state
    setSelectedFrameworks(prev => {
      if (prev.includes(frameworkCode)) {
        // Remove framework
        return prev.filter(code => code !== frameworkCode);
      } else {
        // Add framework and auto-select all tasks
        const framework = getFrameworkByCode(frameworkCode);
        if (framework) {
          // For each stage, add all tasks
          Object.entries(framework.tasks).forEach(([stageKey, tasks]) => {
            const stage = stageKey as Stage;
            tasks.forEach(task => {
              toggleGpTask(planId, task, frameworkCode, stage);
            });
          });
          
          // Update selected tasks
          setSelectedTasks(prev => {
            const newTasks = { ...prev };
            
            newTasks[frameworkCode] = {
              'Identification': [...framework.tasks.Identification],
              'Definition': [...framework.tasks.Definition],
              'Delivery': [...framework.tasks.Delivery],
              'Closure': [...framework.tasks.Closure]
            };
            
            return newTasks;
          });
        }
        
        return [...prev, frameworkCode];
      }
    });
    
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleTaskToggle = (text: string, frameworkCode: string, stage: Stage) => {
    if (!planId) return;
    
    // Toggle task in plan
    toggleGpTask(planId, text, frameworkCode, stage);
    
    // Update state
    setSelectedTasks(prev => {
      const newTasks = { ...prev };
      
      if (!newTasks[frameworkCode]) {
        newTasks[frameworkCode] = {
          'Identification': [],
          'Definition': [],
          'Delivery': [],
          'Closure': []
        };
      }
      
      if (newTasks[frameworkCode][stage].includes(text)) {
        // Remove task
        newTasks[frameworkCode][stage] = newTasks[frameworkCode][stage].filter(t => t !== text);
      } else {
        // Add task
        newTasks[frameworkCode][stage] = [...newTasks[frameworkCode][stage], text];
      }
      
      return newTasks;
    });
    
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleSkipPraxis = () => {
    setZoneSelected(true);
  };
  
  const handleSkipFrameworks = () => {
    // No actions needed, just continue to the next section
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handler for clearing all tasks across all frameworks
  const handleClearAllTasks = async () => {
    if (!planId) return;
    
    try {
      // Load current plan
      const currentPlan = await loadPlan(planId);
      if (!currentPlan) return;
      
      // Clear all tasks from all frameworks in all stages
      Object.keys(currentPlan.stages).forEach(stageName => {
        const stage = stageName as Stage;
        if (currentPlan.stages[stage].goodPractice) {
          currentPlan.stages[stage].goodPractice!.tasks = [];
        }
      });
      
      // Save the updated plan
      const success = await savePlan(planId, currentPlan);
      
      if (success) {
        // Reset selected tasks state
        setSelectedTasks({});
        setRefreshTrigger(prev => prev + 1);
        
        toast({
          title: "Tasks cleared",
          description: "All framework tasks have been removed",
        });
      }
    } catch (error) {
      console.error('Error clearing tasks:', error);
      toast({
        title: "Error",
        description: "Failed to clear tasks",
        variant: "destructive"
      });
    }
  };
  
  const handleGenerateChecklist = () => {
    if (!planId) return;
    
    // Mark plan as complete
    markPlanComplete(planId, true);
    
    // Save plan
    savePlan(planId, {});
    
    // Navigate to checklist
    setLocation('/checklist');
  };
  
  const handleBack = () => {
    setLocation('/make-a-plan/full/block-2');
  };
  
  const handleSave = () => {
    if (!planId) return;
    
    // Save plan
    savePlan(planId, {});
    
    toast({
      title: 'Plan Saved',
      description: 'Your plan has been saved successfully.',
      variant: 'default',
    });
  };
  
  const handleSkipToChecklist = () => {
    if (!planId) return;
    
    // Mark plan as complete
    markPlanComplete(planId, true);
    
    // Save plan
    savePlan(planId, {});
    
    // Navigate to checklist
    setLocation('/checklist');
  };
  
  // Handler for clearing block 3 data
  // Custom framework handlers
  const handleCreateCustomFramework = async (name: string): Promise<string | null> => {
    if (!planId) return null;
    
    try {
      const frameworkId = await createCustomFramework(planId, name);
      
      if (frameworkId) {
        // Refresh custom frameworks
        const updatedPlan = await loadPlan(planId);
        if (updatedPlan && updatedPlan.stages.Identification.goodPractice?.customFrameworks) {
          setCustomFrameworks(updatedPlan.stages.Identification.goodPractice.customFrameworks);
        }
        
        setRefreshTrigger(prev => prev + 1);
        return frameworkId;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating custom framework:', error);
      return null;
    }
  };
  
  const handleAddTaskToCustomFramework = async (
    frameworkId: string,
    stage: Stage,
    taskText: string
  ): Promise<boolean> => {
    if (!planId) return false;
    
    try {
      const success = await addTaskToCustomFramework(planId, frameworkId, stage, taskText);
      
      if (success) {
        // Refresh custom frameworks
        const updatedPlan = await loadPlan(planId);
        if (updatedPlan && updatedPlan.stages.Identification.goodPractice?.customFrameworks) {
          setCustomFrameworks(updatedPlan.stages.Identification.goodPractice.customFrameworks);
        }
        
        setRefreshTrigger(prev => prev + 1);
      }
      
      return success;
    } catch (error) {
      console.error('Error adding task to custom framework:', error);
      return false;
    }
  };
  
  const handleRemoveTaskFromCustomFramework = async (
    frameworkId: string,
    stage: Stage,
    taskIndex: number
  ): Promise<boolean> => {
    if (!planId) return false;
    
    try {
      const success = await removeTaskFromCustomFramework(planId, frameworkId, stage, taskIndex);
      
      if (success) {
        // Refresh custom frameworks
        const updatedPlan = await loadPlan(planId);
        if (updatedPlan && updatedPlan.stages.Identification.goodPractice?.customFrameworks) {
          setCustomFrameworks(updatedPlan.stages.Identification.goodPractice.customFrameworks);
        }
        
        setRefreshTrigger(prev => prev + 1);
      }
      
      return success;
    } catch (error) {
      console.error('Error removing task from custom framework:', error);
      return false;
    }
  };
  
  const handleRemoveCustomFramework = async (frameworkId: string): Promise<boolean> => {
    if (!planId) return false;
    
    try {
      const success = await removeCustomFramework(planId, frameworkId);
      
      if (success) {
        // Refresh custom frameworks
        const updatedPlan = await loadPlan(planId);
        if (updatedPlan && updatedPlan.stages.Identification.goodPractice?.customFrameworks) {
          setCustomFrameworks(updatedPlan.stages.Identification.goodPractice.customFrameworks);
        } else {
          // If no custom frameworks left
          setCustomFrameworks([]);
        }
        
        setRefreshTrigger(prev => prev + 1);
      }
      
      return success;
    } catch (error) {
      console.error('Error removing custom framework:', error);
      return false;
    }
  };

  const handleClearBlock = async () => {
    if (!planId) return;
    
    try {
      // Load current plan data
      const currentPlan = await loadPlan(planId);
      if (!currentPlan) return;
      
      // Create a modified plan with only Block 3 data cleared
      // This keeps Block 1 and Block 2 data intact
      const clearGoodPracticeData = (stage: Stage) => {
        if (currentPlan.stages[stage] && currentPlan.stages[stage].goodPractice) {
          currentPlan.stages[stage].goodPractice = {
            zone: null,
            frameworks: [],
            tasks: [],
            customFrameworks: []
          };
        }
      };
      
      // Clear good practice data across all stages
      Object.keys(currentPlan.stages).forEach(stageName => {
        clearGoodPracticeData(stageName as Stage);
      });
      
      // Remove delivery approach data if it exists
      if (currentPlan.goodPractice && currentPlan.goodPractice.deliveryApproach) {
        currentPlan.goodPractice.deliveryApproach = undefined;
      }
      
      // Save the updated plan
      const success = await savePlan(planId, currentPlan);
      
      if (success) {
        // Trigger refresh to update the UI
        setRefreshTrigger(prev => prev + 1);
        
        // Reset state
        setZoneSelected(false);
        setPraxisZone(null);
        setSelectedFrameworks([]);
        setSelectedTasks({});
        setCustomFrameworks([]);
        
        // Show success message
        toast({
          title: "Block cleared",
          description: "All delivery approach and framework data have been removed",
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
  
  // Handler for the delivery approach tool
  const handleDeliveryApproachSave = async (data: DeliveryApproachData) => {
    if (!planId) return;
    
    // Save the delivery approach data to the plan
    await setDeliveryApproach(planId, data);
    
    // Update the UI state
    setPraxisZone(data.zone);
    setZoneSelected(true);
    
    // Always default to use Praxis Framework first, then add any other suggested frameworks
    // This ensures Praxis is always the default framework as specified in the requirements
    let suggestedFrameworks: string[] = ["PRAXIS"];
    
    // Add additional frameworks based on zone if needed
    if (data.zone.includes('A')) {
      // For Zone A, just use Praxis by default
    } else if (data.zone.includes('B')) {
      suggestedFrameworks.push("AGILEPM");
    } else if (data.zone.includes('C')) {
      suggestedFrameworks.push("AGILEPM");
    } else if (data.zone.includes('D')) {
      suggestedFrameworks.push("SAFe");
    } else if (data.zone.includes('E')) {
      suggestedFrameworks.push("SAFe");
    } else if (data.zone.includes('F')) {
      suggestedFrameworks.push("AGILEPM");
    }
    
    setSelectedFrameworks(suggestedFrameworks);
    
    // Build selected tasks map
    const tasksMap: Record<string, Record<Stage, string[]>> = {};
    
    suggestedFrameworks.forEach((code: string) => {
      const framework = getFrameworkByCode(code);
      if (framework) {
        tasksMap[code] = {
          'Identification': [...framework.tasks.Identification],
          'Definition': [...framework.tasks.Definition],
          'Delivery': [...framework.tasks.Delivery],
          'Closure': [...framework.tasks.Closure]
        };
      }
    });
    
    setSelectedTasks(tasksMap);
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: 'Delivery Approach Selected',
      description: `You've selected ${data.zone}. Recommended methods and tools have been added to your plan.`,
      variant: 'default',
    });
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
        <ProgressNav steps={steps} currentStepId="block-3" />
        
        <h1 className="text-3xl font-bold text-tcof-dark mb-6">Block 3: Complete & Confirm</h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Bring it all together with proven methods and your personalised checklist.
        </p>
        
        <IntroAccordion title="TCOF Phase 3: Complete & Confirm">
          <p className="mb-4">
            In this final phase, you'll select which good practice frameworks align with your project context,
            and add recommended tasks from these frameworks to complete your plan.
          </p>
          <p>
            Steps to complete this block:
          </p>
          <ol className="list-decimal list-inside space-y-2 mt-2 mb-4">
            <li>Answer two questions about your project to identify your Praxis zone</li>
            <li>Select recommended frameworks or add your own choices</li> 
            <li>Review selected tasks from each framework</li>
            <li>Generate your final project checklist</li>
          </ol>
        </IntroAccordion>
        
        {/* Step 6: Delivery Approach Tool */}
        <div className={styles.stepHeading}>
          <div className={styles.stepNumber}>6</div>
          <div className={styles.stepTitle}>Choose Project Approach</div>
          {!zoneSelected && (
            <span className={styles.stepSkip} onClick={handleSkipPraxis}>Skip this step</span>
          )}
        </div>
        
        {!zoneSelected ? (
          <DeliveryApproachTool
            onSave={handleDeliveryApproachSave}
          />
        ) : (
          <div className={styles.zoneCard}>
            <div className={styles.zoneTitle}>{praxisZone || 'No zone selected'}</div>
            <p className="text-sm text-gray-600 mt-1">
              {praxisZone ? 
                `You've selected ${praxisZone}. Recommended delivery methods and tools have been added.` : 
                'You skipped the approach selection. Choose frameworks manually.'}
            </p>
          </div>
        )}
        
        {/* Step 7: Framework Picker */}
        {zoneSelected && (
          <>
            <div className={styles.stepHeading}>
              <div className={styles.stepNumber}>7</div>
              <div className={styles.stepTitle}>Select Frameworks & Tasks</div>
              <span className={styles.stepSkip} onClick={handleSkipFrameworks}>Skip this step</span>
            </div>
            
            <FrameworkPicker 
              selectedFrameworks={selectedFrameworks}
              onFrameworkToggle={handleFrameworkToggle}
              onTaskToggle={handleTaskToggle}
              selectedTasks={selectedTasks}
              onSkip={handleSkipFrameworks}
              onClearAllTasks={handleClearAllTasks}
            />
            
            {/* Custom Framework Editor */}
            <div className="mt-8">
              <CustomFrameworkEditor
                customFrameworks={customFrameworks}
                onCreateFramework={handleCreateCustomFramework}
                onAddTask={handleAddTaskToCustomFramework}
                onRemoveTask={handleRemoveTaskFromCustomFramework}
                onRemoveFramework={handleRemoveCustomFramework}
              />
            </div>
          </>
        )}
        
        {/* Step 8: Review and Generate */}
        {zoneSelected && (
          <>
            <div className={styles.stepHeading}>
              <div className={styles.stepNumber}>8</div>
              <div className={styles.stepTitle}>Review and Generate Checklist</div>
            </div>
            
            <ReviewCard 
              planId={planId || ''}
              onGenerateChecklist={handleGenerateChecklist}
            />
          </>
        )}
        
        <ActionButtons 
          onPrevious={handleBack}
          onNext={handleSkipToChecklist}
          onSave={handleSave}
          onSkip={handleSkipToChecklist}
          onClear={handleClearBlock}
          showSkip={false}
          showClear={true}
          isNextDisabled={false}
        />
      </div>
    </div>
  );
}