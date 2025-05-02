import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { getLatestPlanId } from '@/lib/planHelpers';
import { loadPlan, savePlan, SuccessFactorRating, PersonalHeuristic, PlanRecord } from '@/lib/plan-db';
import IntroAccordion from '@/components/plan/IntroAccordion';
import SuccessFactorTable from '@/components/plan/SuccessFactorTable';
import HeuristicList from '@/components/plan/HeuristicList';
import ActionButtons from '@/components/plan/ActionButtons';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import debounce from 'lodash.debounce';

export default function Block1Discover() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State for the plan data
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [successFactorRatings, setSuccessFactorRatings] = useState<Record<string, SuccessFactorRating>>({});
  const [personalHeuristics, setPersonalHeuristics] = useState<PersonalHeuristic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track total favourites across both lists
  const totalSuccessFactorFavourites = Object.values(successFactorRatings).filter(r => r.favourite).length;
  const totalPersonalHeuristicFavourites = personalHeuristics.filter(h => h.favourite).length;
  const totalFavourites = totalSuccessFactorFavourites + totalPersonalHeuristicFavourites;
  
  // Navigation validation
  const hasRatings = Object.keys(successFactorRatings).length > 0;
  const hasHeuristics = personalHeuristics.length > 0;
  const canProceed = hasRatings && hasHeuristics;
  
  // Define steps for the progress bar
  const steps: Step[] = [
    { id: 'block-1', label: 'Block 1: Discover', completed: false },
    { id: 'block-2', label: 'Block 2: Design', completed: false },
    { id: 'block-3', label: 'Block 3: Deliver', completed: false },
  ];
  
  // Load the plan when component mounts
  useEffect(() => {
    async function loadPlanData() {
      try {
        const id = getLatestPlanId();
        if (!id) {
          // No plan found, redirect to /make-a-plan
          setLocation('/make-a-plan');
          return;
        }
        
        setPlanId(id);
        const loadedPlan = await loadPlan(id);
        
        if (!loadedPlan) {
          setLocation('/make-a-plan');
          return;
        }
        
        setPlan(loadedPlan);
        
        // Extract success factor ratings and personal heuristics
        if (loadedPlan.stages.Identification.successFactorRatings) {
          setSuccessFactorRatings(loadedPlan.stages.Identification.successFactorRatings);
        }
        
        if (loadedPlan.stages.Identification.personalHeuristics) {
          setPersonalHeuristics(loadedPlan.stages.Identification.personalHeuristics);
        }
      } catch (error) {
        console.error('Error loading plan:', error);
        toast({
          title: "Error Loading Plan",
          description: "There was a problem loading your plan. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadPlanData();
  }, []);
  
  // Create a debounced save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (id: string, data: any) => {
      try {
        await savePlan(id, data);
        console.log('Progress auto-saved');
      } catch (error) {
        console.error('Error auto-saving plan:', error);
      }
    }, 500),
    []
  );
  
  // Save the current plan data
  const saveCurrentPlan = async () => {
    if (!planId || !plan) return false;
    
    const updatedPlan = {
      ...plan,
      stages: {
        ...plan.stages,
        Identification: {
          ...plan.stages.Identification,
          successFactorRatings,
          personalHeuristics
        }
      }
    };
    
    try {
      return await savePlan(planId, updatedPlan);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Save Failed",
        description: "There was a problem saving your plan. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Handle success factor rating change
  const handleSuccessFactorChange = (factorId: string, rating: SuccessFactorRating) => {
    const updatedRatings = {
      ...successFactorRatings,
      [factorId]: rating
    };
    
    setSuccessFactorRatings(updatedRatings);
    
    if (planId) {
      debouncedSave(planId, {
        stages: {
          ...plan?.stages,
          Identification: {
            ...plan?.stages.Identification,
            successFactorRatings: updatedRatings,
            personalHeuristics
          }
        }
      });
    }
  };
  
  // Handle personal heuristics change
  const handlePersonalHeuristicsChange = (heuristics: PersonalHeuristic[]) => {
    setPersonalHeuristics(heuristics);
    
    if (planId) {
      debouncedSave(planId, {
        stages: {
          ...plan?.stages,
          Identification: {
            ...plan?.stages.Identification,
            successFactorRatings,
            personalHeuristics: heuristics
          }
        }
      });
    }
  };
  
  // Navigation handlers
  const handleBack = async () => {
    await saveCurrentPlan();
    setLocation('/make-a-plan');
  };
  
  const handleNext = async () => {
    const saved = await saveCurrentPlan();
    if (saved) {
      setLocation('/make-a-plan/full/block-2');
    }
  };
  
  const handleSave = async () => {
    const saved = await saveCurrentPlan();
    if (saved) {
      toast({
        title: "Progress saved",
        description: "Your plan has been saved successfully.",
      });
    }
  };
  
  const handleSkipToChecklist = async () => {
    await saveCurrentPlan();
    setLocation('/checklist');
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading your plan...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <ProgressNav steps={steps} currentStepId="block-1" />
        
        <h1 className="text-3xl font-bold text-tcof-dark mb-6">Block 1: Discover & Reflect</h1>
        
        <IntroAccordion title="Why start here?">
          <p className="mb-4">
            Simpler rules beat complicated plans. TCOF gives you 12 proven "rules of thumb". 
            First, rate how strongly they feel true for you. Then add your own hard-won heuristics. 
            These become the foundations of a checklist you'll keep refining in later blocks.
          </p>
          <p className="mb-4">
            Each heuristic provides a eureka moment someone else paid for dearly. By reflecting on these
            patterns and adding your own, you'll build a checklist that speeds up delivery and reduces problems.
          </p>
          <p>
            <strong>The 3-block journey:</strong>
            <ol className="list-decimal list-inside ml-4 mt-2">
              <li>Discover & Reflect: Identify what matters most</li>
              <li>Design: Connect the dots into a coherent plan</li>
              <li>Deliver: Create actionable tasks and tracking</li>
            </ol>
          </p>
        </IntroAccordion>
        
        <div className="bg-white p-6 rounded-lg border mb-8">
          <SuccessFactorTable 
            ratings={successFactorRatings} 
            onChange={handleSuccessFactorChange}
            totalFavourites={totalFavourites}
          />
          
          <hr className="my-8" />
          
          <HeuristicList 
            heuristics={personalHeuristics}
            onChange={handlePersonalHeuristicsChange}
            totalFavourites={totalFavourites}
          />
        </div>
        
        <ActionButtons 
          onPrevious={handleBack}
          onNext={handleNext}
          onSave={handleSave}
          onSkip={handleSkipToChecklist}
          showSkip={true}
          isNextDisabled={!canProceed}
        />
      </div>
    </div>
  );
}