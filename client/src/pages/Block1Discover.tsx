import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { getLatestPlanId, quickStartPlan } from '@/lib/planHelpers';
import { loadPlan, savePlan, SuccessFactorRating, PersonalHeuristic, PlanRecord } from '@/lib/plan-db';
import { useBlockSave, BlockData, getLocalStorageBlock, saveLocalStorageBlock } from '@/hooks/useBlockSave';
import { useQuery } from "@tanstack/react-query";
import IntroAccordion from '@/components/plan/IntroAccordion';
import SuccessFactorTable from '@/components/plan/SuccessFactorTable';
import HeuristicList from '@/components/plan/HeuristicList';
import ActionButtons from '@/components/plan/ActionButtons';
import ProgressNav, { Step } from '@/components/plan/ProgressNav';
import debounce from 'lodash.debounce';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Block1Discover() {
  const [_, setLocation] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { toast } = useToast();
  
  // Use our new reliable save hook
  const { saveBlock, isSaving } = useBlockSave("block1", projectId);
  
  // State for the plan data
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [successFactorRatings, setSuccessFactorRatings] = useState<Record<string, SuccessFactorRating>>({});
  const [personalHeuristics, setPersonalHeuristics] = useState<PersonalHeuristic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  
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
  
  // Use React Query for data fetching with localStorage fallback
  const { data: blockData, isLoading: isBlockLoading, error: blockError } = useQuery({
    queryKey: projectId ? [`/api/plans/${projectId}/block/block1`] : [],
    queryFn: async () => {
      if (!projectId) throw new Error("No project ID available");
      
      try {
        console.log('🔄 Fetching block1 data for project:', projectId);
        const response = await fetch(`/api/plans/${projectId}/block/block1`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch block1 data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Block1 data loaded from API:', data);
        return data;
      } catch (error) {
        console.warn('⚠️ Could not load block1 data from API:', error);
        // Try to get from localStorage as fallback
        const localData = getLocalStorageBlock("block1", projectId);
        
        if (localData) {
          console.log('✅ Block1 data loaded from localStorage fallback');
          return localData;
        }
        
        // If we don't have local data either, throw the original error
        throw error;
      }
    },
    // Only run the query if we have a projectId
    enabled: !!projectId,
    // If we get an error, retry once
    retry: 1,
    // Handle stale data
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Always refetch on window focus
    refetchOnWindowFocus: true
  });
  
  // Use the block data to set our local state
  useEffect(() => {
    if (blockData) {
      console.log('🔄 Updating state from loaded block data');
      
      // Extract success factor ratings
      if (blockData.successFactorRatings) {
        console.log('🔄 Setting success factor ratings:', 
          Object.keys(blockData.successFactorRatings).length, 'ratings');
        setSuccessFactorRatings(blockData.successFactorRatings);
      }
      
      // Extract personal heuristics
      if (blockData.personalHeuristics) {
        console.log('🔄 Setting personal heuristics:', 
          blockData.personalHeuristics.length, 'heuristics');
        console.log('Heuristics data:', JSON.stringify(blockData.personalHeuristics));
        setPersonalHeuristics(blockData.personalHeuristics);
      }
    }
  }, [blockData]);
  
  // If we have no block data, fall back to legacy plan loading
  useEffect(() => {
    async function loadLegacyPlan() {
      if (!projectId || blockData || isBlockLoading) return;
      
      try {
        console.log('ℹ️ No block data found, falling back to legacy plan loading');
        
        // Get the plan ID if it exists, or create a new one if not
        let id = getLatestPlanId();
        
        // If we came from the intro page and don't have a plan yet, create one
        if (!id) {
          // Show a loading toast
          toast({
            title: "Creating new plan",
            description: "Setting up your plan, please wait...",
          });
          
          // Create a new quick start plan
          id = await quickStartPlan();
          
          if (!id) {
            // Failed to create a plan, redirect back
            toast({
              title: "Error",
              description: "Failed to create a new plan. Please try again.",
              variant: "destructive"
            });
            setLocation('/make-a-plan');
            return;
          }
          
          // Success toast for new plan
          toast({
            title: "Plan created!",
            description: "Your new plan is ready to customize.",
          });
        }
        
        setPlanId(id);
        const loadedPlan = await loadPlan(id);
        
        if (!loadedPlan) {
          toast({
            title: "Error",
            description: "Could not load the plan data. Please try again.",
            variant: "destructive"
          });
          setLocation('/make-a-plan');
          return;
        }
        
        setPlan(loadedPlan);
        
        // Extract success factor ratings and personal heuristics
        if (loadedPlan.stages.Identification.successFactorRatings) {
          console.log('🔄 Setting success factor ratings from legacy plan');
          setSuccessFactorRatings(loadedPlan.stages.Identification.successFactorRatings);
        }
        
        if (loadedPlan.stages.Identification.personalHeuristics) {
          console.log('🔄 Setting personal heuristics from legacy plan:',
            JSON.stringify(loadedPlan.stages.Identification.personalHeuristics));
          setPersonalHeuristics(loadedPlan.stages.Identification.personalHeuristics);
        }
      } catch (error) {
        console.error('❌ Error loading legacy plan:', error);
        toast({
          title: "Error Loading Plan",
          description: "There was a problem loading your plan. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadLegacyPlan();
  }, [projectId, blockData, isBlockLoading, setLocation, toast]);
  
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
  
  // Save the current plan data using our new reliable save pattern
  const saveCurrentPlan = async () => {
    if (!planId || !plan) return false;
    
    // Prepare block data to save
    const blockData = {
      successFactorRatings,
      personalHeuristics
    };
    
    // Use our new reliable save pattern that saves to both API and localStorage
    try {
      return await saveBlock(blockData);
    } catch (error) {
      console.error('Error saving plan:', error);
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
    
    // Auto-save debounced (don't show toast for interim saves)
    if (projectId) {
      // Prepare and save data
      const blockData = {
        successFactorRatings: updatedRatings,
        personalHeuristics
      };
      
      // We're not awaiting here intentionally - this is just an auto-save
      saveBlock(blockData).catch(err => {
        console.error('Error auto-saving after rating change:', err);
      });
    }
  };
  
  // Handle personal heuristics change
  const handlePersonalHeuristicsChange = async (heuristics: PersonalHeuristic[]) => {
    console.log('🔄 handlePersonalHeuristicsChange called with:', JSON.stringify(heuristics));
    
    // Store a deep clone of the heuristics to avoid reference issues
    const clonedHeuristics = JSON.parse(JSON.stringify(heuristics));
    setPersonalHeuristics(clonedHeuristics);
    
    // We'll explicitly save with a full saveBlock call to ensure reliability
    // Auto-saves aren't sufficient for this critical data
    if (projectId) {
      try {
        console.log('🔄 Saving personal heuristics to backend:', clonedHeuristics);
        
        // Show a toast that we're saving
        toast({
          title: "Saving heuristics...",
          description: "Updating your personal heuristics",
        });
        
        // Prepare block data with current ratings and updated heuristics
        const blockData = {
          successFactorRatings,
          personalHeuristics: clonedHeuristics
        };
        
        // We explicitly save here and wait for the result
        console.log('🔄 Calling saveBlock with data:', JSON.stringify(blockData));
        const saved = await saveBlock(blockData);
        
        if (saved) {
          console.log('✅ Successfully saved personal heuristics');
          toast({
            title: "Heuristics saved",
            description: "Your personal heuristics have been saved",
          });
        } else {
          console.warn('⚠️ Failed to save personal heuristics, check saveBlock implementation');
          toast({
            title: "Save failed",
            description: "Could not save your heuristics. Please try again.",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('❌ Error saving heuristics:', err);
        toast({
          title: "Error",
          description: "Failed to save heuristics: " + (err as Error).message,
          variant: "destructive"
        });
      }
    } else {
      console.warn('⚠️ No projectId available, cannot save heuristics');
      toast({
        title: "Cannot save",
        description: "No project selected for saving heuristics",
        variant: "destructive"
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
  
  // Explicit save handler - this shows a toast notification
  const handleSave = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare block data with all current state
    const blockData = {
      successFactorRatings,
      personalHeuristics
    };
    
    // Save using new reliable pattern with localStorage backup
    await saveBlock(blockData);
  };
  
  const handleSkipToChecklist = async () => {
    await saveCurrentPlan();
    setLocation('/checklist');
  };
  
  // Open confirmation dialog for clearing Block 1
  const handleClearBlockRequest = () => {
    setClearConfirmOpen(true);
  };
  
  // Clear Block 1 data after confirmation
  const handleClearBlockConfirmed = async () => {
    if (!projectId) return;
    
    try {
      // Create empty block data to clear existing data
      const emptyBlockData = {
        successFactorRatings: {},
        personalHeuristics: []
      };
      
      // Save the empty block data using our reliable save pattern
      const success = await saveBlock(emptyBlockData);
      
      if (success) {
        // Update local state
        setSuccessFactorRatings({});
        setPersonalHeuristics([]);
        
        toast({
          title: "Block cleared",
          description: "All data for Block 1 has been reset",
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
    } finally {
      setClearConfirmOpen(false);
    }
  };
  
  // Show loading state while either the block data or legacy plan is loading
  if (isLoading || isBlockLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading your plan...</p>
        {isBlockLoading && <p className="text-sm text-gray-500 mt-2">Fetching your saved data...</p>}
      </div>
    );
  }
  
  // Show error state if we have one
  if (blockError && !blockData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-4">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Data</h3>
          <p className="text-red-700">{(blockError as Error).message}</p>
          <p className="mt-2">
            <button 
              onClick={() => window.location.reload()} 
              className="text-red-700 underline"
            >
              Refresh the page
            </button> to try again.
          </p>
        </div>
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
          {/* Step 1 - Rate TCOF Success Factors */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-tcof-dark mb-3">Step 1: Rate TCOF Success Factors</h3>
            <div className="bg-tcof-bg p-4 rounded-md mb-4">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>What</strong> - Review each TCOF Success Factor, reflect on how strongly they resonate with you?</li>
                <li><strong>Why</strong> - Some of these heuristics may feel deeply familiar. Others might not land at all. That's normal. If you're not "feeling" some heuristics, it may simply be because you haven't experienced using this way of working before.</li>
                <li><strong>When</strong> - Do this now, use the scale below to reflect on how much each one feels true to you.</li>
                <li><strong>How</strong> - Be honest, this helps you build your own working set</li>
              </ul>
            </div>
          </div>
          
          <SuccessFactorTable 
            ratings={successFactorRatings} 
            onChange={handleSuccessFactorChange}
            totalFavourites={totalFavourites}
          />
          
          <hr className="my-8" />
          
          {/* Step 2 - Add Personal Heuristics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-tcof-dark mb-3">Step 2: Add Your Personal Heuristics</h3>
            <div className="bg-tcof-bg p-4 rounded-md mb-4">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>What</strong> - Think about things you've learned through your experience. What rules help you deliver change, projects or big ideas?</li>
                <li><strong>Why</strong> - You have important learned experience, that's wisdom. Writing this down using heuristics is going to allow you and others to ensure this hard won learning is applied.</li>
                <li><strong>When</strong> - It's best to do this before we get into the detail of selecting good practice and the delivery approach, that can be confusing, whereas your wisdom in heuristics is a fast, frugal shortcut to success</li>
                <li><strong>How</strong> - Write down 5–10 of your own. Keep them short, memorable, and practical. Follow these guidelines:</li>
              </ul>
              <ol className="list-decimal pl-8 mt-2 space-y-2">
                <li><strong>Be inspired, not copied:</strong> You may reflect on the TCOF goals, which are written as heuristics. It's fine to be inspired by them—but don't copy them. We're looking for your original insights based on your own lived experience.</li>
                <li><strong>Your goal:</strong> Identify the personal rules of thumb you actually use to deliver results—your own heuristics for success.</li>
                <li><strong>How to write a heuristic:</strong>
                  <ul className="list-disc pl-8 mt-1">
                    <li>Keep it short, clear, and easy to remember.</li>
                    <li>Think in phrases, not paragraphs.</li>
                    <li>Aim for 5 to 10 strong heuristics that reflect your real-world experience.</li>
                    <li>Test whether you could explain each one to a colleague in a sentence.</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
          
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
          onClear={handleClearBlockRequest}
          showSkip={true}
          showClear={true}
          isNextDisabled={!canProceed}
        />
        
        {/* Clear Block Confirmation Dialog */}
        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Block 1 Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all your success factor ratings and personal heuristics from Block 1.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearBlockConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Clear Block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}