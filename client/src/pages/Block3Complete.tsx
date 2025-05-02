import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import ActionButtons from '@/components/plan/ActionButtons';
import IntroAccordion from '@/components/plan/IntroAccordion';
import PraxisSelector from '@/components/plan/PraxisSelector';
import FrameworkPicker from '@/components/plan/FrameworkPicker';
import ReviewCard from '@/components/plan/ReviewCard';
import { Stage, loadPlan, savePlan, createEmptyPlan, setZone, toggleFramework, toggleGpTask, markPlanComplete } from '@/lib/plan-db';
import { getFrameworkByCode } from '@/lib/goodPracticeData';
import styles from '@/lib/styles/gp.module.css';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Block3Complete() {
  const [_, setLocation] = useLocation();
  const [planId, setPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [zoneSelected, setZoneSelected] = useState(false);
  const [praxisZone, setPraxisZone] = useState<string | null>(null);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, Record<Stage, string[]>>>({});
  const { toast } = useToast();
  
  // Define steps for the progress bar
  const steps: Step[] = [
    { id: 'block-1', label: 'Block 1: Discover', completed: true },
    { id: 'block-2', label: 'Block 2: Design', completed: true },
    { id: 'block-3', label: 'Block 3: Complete', completed: false },
  ];
  
  // Load or create plan
  useEffect(() => {
    // Try to load the active plan ID from localStorage
    const savedPlanId = localStorage.getItem('activePlanId');
    
    if (savedPlanId) {
      // Check if the plan exists
      const plan = loadPlan(savedPlanId);
      if (plan) {
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
              stageGoodPractice.tasks.forEach(task => {
                if (!tasksMap[task.frameworkCode]) {
                  tasksMap[task.frameworkCode] = {
                    'Identification': [],
                    'Definition': [],
                    'Delivery': [],
                    'Closure': []
                  };
                }
                
                tasksMap[task.frameworkCode][task.stage].push(task.text);
              });
            }
          });
          
          setSelectedTasks(tasksMap);
        }
        
        setIsLoading(false);
        return;
      }
    }
    
    // Create a new plan if none exists
    const newPlanId = createEmptyPlan();
    setPlanId(newPlanId);
    localStorage.setItem('activePlanId', newPlanId);
    setIsLoading(false);
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
        
        {/* Step 6: Praxis Selector */}
        <div className={styles.stepHeading}>
          <div className={styles.stepNumber}>6</div>
          <div className={styles.stepTitle}>Choose Project Approach</div>
          {!zoneSelected && (
            <span className={styles.stepSkip} onClick={handleSkipPraxis}>Skip this step</span>
          )}
        </div>
        
        {!zoneSelected ? (
          <PraxisSelector 
            onZoneSelected={handleZoneSelected}
            initialZone={praxisZone}
          />
        ) : (
          <div className={styles.zoneCard}>
            <div className={styles.zoneTitle}>{praxisZone || 'No zone selected'}</div>
            <p className="text-sm text-gray-600 mt-1">
              {praxisZone ? 
                `You've selected ${praxisZone}. Recommended frameworks have been added.` : 
                'You skipped the zone selection. Choose frameworks manually.'}
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
            />
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
          showSkip={false}
          isNextDisabled={false}
        />
      </div>
    </div>
  );
}