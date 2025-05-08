import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  ChevronRight, 
  ArrowLeft, 
  Save, 
  FastForward, 
  Info, 
  ArrowRight, 
  Plus,
  Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useProgress } from "@/contexts/ProgressContext";
import { PlanProvider, usePlan } from "@/contexts/PlanContext";
import { useSuccessFactors } from "@/hooks/useSuccessFactors";
import { useResonanceRatings } from "@/hooks/useResonanceRatings";
import ProjectBanner from "@/components/ProjectBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define the success factor resonance options
const RESONANCE_OPTIONS = [
  { value: "1", symbol: '❌', label: "Doesn't land", desc: "I don't feel this…" },
  { value: "2", symbol: '🤔', label: "Unfamiliar", desc: "I've never seen it in action." },
  { value: "3", symbol: '🟡', label: "Seems true", desc: "I believe it's useful." },
  { value: "4", symbol: '✅', label: "Proven", desc: "I've used this and it worked." },
  { value: "5", symbol: '🔥', label: "Hard-won truth", desc: "It's burned into how I work." },
];

console.log('🔧 Block1Discover updated with Resonance');

export default function Block1Discover() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { progress, refreshProgress } = useProgress();
  const { plan, savePlan, saveBlock } = usePlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("overview");
  
  // State for personal heuristics
  const [newHeuristic, setNewHeuristic] = useState({ name: "", description: "" });
  
  // State for success criteria
  const [successCriteria, setSuccessCriteria] = useState("");
  
  // Fetch project details if projectId is provided
  const { 
    data: project, 
    isLoading: projectLoading 
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      console.log(`Fetching project details for: ${projectId}`);
      const res = await apiRequest("GET", `/api/projects-detail/${projectId}`);
      if (!res.ok) {
        console.error("Failed to fetch project details");
        return null;
      }
      return res.json();
    },
    enabled: !!projectId
  });
  
  // Fetch success factors data
  const {
    data: successFactors,
    isLoading: factorsLoading
  } = useQuery({
    queryKey: ['success-factors'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/success-factors");
      if (!res.ok) {
        throw new Error("Failed to fetch success factors");
      }
      return res.json();
    }
  });
  
  // Initialize local state from plan data
  useEffect(() => {
    if (plan) {
      console.log('🔍 Block1Discover - Plan data changed, updating local state');
      
      // Load success criteria
      if (plan.blocks?.block1?.successCriteria) {
        setSuccessCriteria(plan.blocks.block1.successCriteria);
      }
      
      // Load saved success factor ratings into pending ratings
      if (plan.blocks?.block1?.successFactorRatings) {
        const planRatings = plan.blocks.block1.successFactorRatings;
        console.log('🔄 Block1Discover.useEffect - Loading saved ratings into pendingRatings:', planRatings);
        
        // Keep a reference to current pendingRatings to compare
        setPendingRatings(prev => {
          // If pendingRatings is empty or different from plan data, update it
          if (Object.keys(prev).length === 0 || 
              JSON.stringify(prev) !== JSON.stringify(planRatings)) {
            console.log('🔄 Block1Discover - Updating pendingRatings with plan data');
            return planRatings;
          }
          // Otherwise keep existing pendingRatings (user's current selections)
          console.log('🔄 Block1Discover - Keeping existing pendingRatings (no change needed)');
          return prev;
        });
      }
    }
  }, [plan]);
  
  // Save progress mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save just the block1 data
      return saveBlock('block1', {
        successCriteria,
        lastUpdated: new Date().toISOString(),
      });
    },
    onMutate: (newData) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['plan', projectId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          blocks: {
            ...old.blocks,
            block1: {
              ...old.blocks?.block1,
              successCriteria,
              lastUpdated: new Date().toISOString(),
            }
          }
        };
      });
      
      // Display toast immediately to provide instant feedback
      toast({
        title: "Saving progress...",
        description: "Your changes are being saved.",
      });
      
      // Return a context object with the previous plan
      return { previousPlan };
    },
    onSuccess: () => {
      toast({
        title: "Progress saved",
        description: "Your changes have been saved successfully.",
      });
      
      // Refresh plan data to ensure it's in sync with the server
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    },
    onError: (error, _newData, context) => {
      // If the mutation fails, use the context we saved to roll back
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      toast({
        title: "Failed to save progress",
        description: "There was an error saving your changes. Your changes have been reverted.",
        variant: "destructive",
      });
      console.error("Save error:", error);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Guard against invalid state - no project ID available
  if (!projectId) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Select a Project</h2>
        <p className="mb-6">Please select a project from your organisations page first.</p>
        <Button onClick={() => navigate("/organisations")}>
          Go to Organisations
        </Button>
      </div>
    );
  }
  
  // Use resonance ratings hook for server persistence
  const { 
    updateSingleEvaluation,
    updateEvaluations,
    evaluations, 
    isSaving: isRatingsSaving 
  } = useResonanceRatings(projectId);
  
  // Local state for ratings to enable batch saving
  const [pendingRatings, setPendingRatings] = useState<Record<string, string>>({});
  
  // Load server ratings on mount
  useEffect(() => {
    console.log('🔍 Block1Discover - useEffect for evaluations triggered, count:', evaluations?.length);
    if (evaluations && evaluations.length > 0) {
      // Create a map of factorId -> resonance from server evaluations
      const serverRatings = evaluations.reduce((acc: Record<string, string>, curr) => {
        // Safety check to ensure resonance is defined
        if (curr && curr.factorId && curr.resonance !== undefined) {
          acc[curr.factorId] = curr.resonance.toString();
        }
        return acc;
      }, {});
      
      console.log('🔄 Block1Discover - Server ratings loaded:', serverRatings);
      
      // Always merge with plan ratings and make sure they're updated
      const currentRatings = plan?.blocks?.block1?.successFactorRatings || {};
      console.log('🔄 Block1Discover - Current plan ratings:', currentRatings);
      
      const updatedRatings = {
        ...currentRatings,
        ...serverRatings
      };
      
      console.log('🔄 Block1Discover - Merged ratings:', updatedRatings);
      
      // Save to block
      saveBlock('block1', {
        successFactorRatings: updatedRatings,
        lastUpdated: new Date().toISOString(),
      });
      
      // Initialize pending ratings with server values
      setPendingRatings(updatedRatings);
      console.log('🔄 Block1Discover - Updated pending ratings state:', updatedRatings);
    }
  }, [evaluations, projectId, plan]);
  
  // Handle success factor evaluation change
  const handleEvaluationChange = (factorId: string, evaluation: string) => {
    console.log('🔄 Block1Discover.handleEvaluationChange - factorId:', factorId, 'evaluation:', evaluation);
    
    // Update local state with all previous pendingRatings intact
    setPendingRatings(prev => {
      const newState = {
        ...prev,
        [factorId]: evaluation
      };
      console.log('🔄 Block1Discover.pendingRatings - before:', prev, 'after:', newState);
      return newState;
    });
    
    // Get current ratings from plan
    const currentRatings = plan?.blocks?.block1?.successFactorRatings || {};
    console.log('🔄 Block1Discover - current plan ratings:', currentRatings);
    
    // Save directly to the block for immediate UI feedback
    // IMPORTANT: Make sure all previous ratings are preserved by spreading the currentRatings first
    const updatedRatings = {
      ...currentRatings,
      [factorId]: evaluation
    };
    console.log('🔄 Block1Discover - saving updated ratings to plan:', updatedRatings);
    
    saveBlock('block1', {
      successFactorRatings: updatedRatings,
      lastUpdated: new Date().toISOString(),
    });
  };
  
  // Combined function to save both local progress and send to server
  const handleSaveAll = async () => {
    console.log('🔄 Block1Discover.handleSaveAll - starting combined save operation');
    
    try {
      // First make sure our pendingRatings are synced to the plan
      // This ensures what we see in the UI is what we're saving
      const combinedRatings = {
        ...plan?.blocks?.block1?.successFactorRatings || {},
        ...pendingRatings
      };
      
      console.log('🔄 Block1Discover.handleSaveAll - combined ratings:', combinedRatings);
      
      // Save combined ratings to the plan
      await saveBlock('block1', {
        successFactorRatings: combinedRatings,
        lastUpdated: new Date().toISOString(),
      });
      
      // Then save local progress using the mutation
      console.log('🔄 Block1Discover.handleSaveAll - saving local progress first');
      await saveMutation.mutateAsync();
      
      // Convert to array of EvaluationInput objects for server persistence
      console.log('🔄 Block1Discover.handleSaveAll - mapping ratings to API inputs');
      const evaluationInputs: Array<{factorId: string, resonance: number, notes?: string}> = [];
      
      // Process each rating entry
      Object.entries(combinedRatings).forEach(([factorId, resonance]) => {
        // Skip invalid data
        if (!factorId || resonance === undefined || resonance === null) {
          console.warn(`🔸 Block1Discover - Skipping invalid rating for factorId: ${factorId}, resonance: ${resonance}`);
          return;
        }
        
        // Parse resonance safely
        let resonanceNum: number;
        try {
          resonanceNum = typeof resonance === 'number' ? resonance : parseInt(resonance as string);
          // Validate the number is between 1-5
          if (isNaN(resonanceNum) || resonanceNum < 1 || resonanceNum > 5) {
            console.warn(`🔸 Block1Discover - Invalid resonance value: ${resonance}, setting to default 3`);
            resonanceNum = 3; // Default to middle value if invalid
          }
        } catch (parseErr) {
          console.warn(`🔸 Block1Discover - Failed to parse resonance: ${resonance}, setting to default 3`, parseErr);
          resonanceNum = 3; // Default to middle value if parsing fails
        }
        
        evaluationInputs.push({
          factorId,
          resonance: resonanceNum,
          notes: '' // Optional notes field
        });
      });
      
      console.log('🔄 Block1Discover - Prepared evaluation inputs:', evaluationInputs);
      
      if (evaluationInputs.length > 0) {
        // Use the batch update method instead of individual promises
        await updateEvaluations(evaluationInputs);
        console.log('🔄 Block1Discover - All updates completed successfully');
      } else {
        console.warn('⚠️ Block1Discover - No valid ratings to save');
      }
      
      toast({
        title: "All changes saved",
        description: "Your changes have been saved locally and to the server.",
      });
      
      // Refresh queries to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
      
    } catch (error) {
      console.error("🔴 Block1Discover - Error in combined save:", error);
      toast({
        title: "Failed to save changes",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Heuristic add mutation with optimistic UI
  const addHeuristicMutation = useMutation({
    mutationFn: async (newHeuristicData: { name: string, description: string }) => {
      const newHeuristicWithId = { ...newHeuristicData, id: Date.now().toString() };
      const updatedHeuristics = [
        ...(plan?.blocks?.block1?.personalHeuristics || []),
        newHeuristicWithId
      ];
      
      // Save to block1
      return saveBlock('block1', {
        personalHeuristics: updatedHeuristics,
        lastUpdated: new Date().toISOString(),
      });
    },
    onMutate: async (newHeuristicData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      // Create the new heuristic with ID
      const newHeuristicWithId = { ...newHeuristicData, id: Date.now().toString() };
      
      // Optimistically update to the new value
      queryClient.setQueryData(['plan', projectId], (old: any) => {
        if (!old) return old;
        
        const updatedHeuristics = [
          ...(old.blocks?.block1?.personalHeuristics || []),
          newHeuristicWithId
        ];
        
        return {
          ...old,
          blocks: {
            ...old.blocks,
            block1: {
              ...old.blocks?.block1,
              personalHeuristics: updatedHeuristics,
              lastUpdated: new Date().toISOString(),
            }
          }
        };
      });
      
      // Show immediate feedback
      toast({
        title: "Adding heuristic...",
        description: "Your personal heuristic is being saved.",
      });
      
      return { previousPlan, newHeuristicWithId };
    },
    onSuccess: (_result, _variables, context) => {
      setNewHeuristic({ name: "", description: "" });
      
      toast({
        title: "Heuristic added",
        description: "Your personal heuristic has been added successfully.",
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      console.error("🔴 Error adding heuristic:", error);
      toast({
        title: "Error adding heuristic",
        description: "There was an error saving your heuristic. Your changes have been reverted.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Heuristic remove mutation with optimistic UI
  const removeHeuristicMutation = useMutation({
    mutationFn: async (heuristicId: string) => {
      const updatedHeuristics = (plan?.blocks?.block1?.personalHeuristics || [])
        .filter((h: { id: string }) => h.id !== heuristicId);
      
      // Save to block1
      return saveBlock('block1', {
        personalHeuristics: updatedHeuristics,
        lastUpdated: new Date().toISOString(),
      });
    },
    onMutate: async (heuristicId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      // Find the heuristic being removed for potential restore
      const heuristicToRemove = plan?.blocks?.block1?.personalHeuristics?.find(
        (h: { id: string }) => h.id === heuristicId
      );
      
      // Optimistically update to the new value
      queryClient.setQueryData(['plan', projectId], (old: any) => {
        if (!old) return old;
        
        const updatedHeuristics = (old.blocks?.block1?.personalHeuristics || [])
          .filter((h: { id: string }) => h.id !== heuristicId);
        
        return {
          ...old,
          blocks: {
            ...old.blocks,
            block1: {
              ...old.blocks?.block1,
              personalHeuristics: updatedHeuristics,
              lastUpdated: new Date().toISOString(),
            }
          }
        };
      });
      
      // Show immediate feedback
      toast({
        title: "Removing heuristic...",
        description: "The personal heuristic is being removed.",
      });
      
      return { previousPlan, heuristicToRemove };
    },
    onSuccess: () => {
      toast({
        title: "Heuristic removed",
        description: "The personal heuristic has been removed successfully.",
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      console.error("🔴 Error removing heuristic:", error);
      toast({
        title: "Error removing heuristic",
        description: "There was an error removing the heuristic. Your changes have been reverted.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Handle adding a new personal heuristic
  const handleAddHeuristic = async () => {
    if (!newHeuristic.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name for the heuristic.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('🔄 Block1Discover.handleAddHeuristic - Adding new personal heuristic:', newHeuristic);
    
    try {
      // Use the mutation with optimistic updates
      await addHeuristicMutation.mutateAsync(newHeuristic);
    } catch (error) {
      console.error("🔴 Block1Discover.handleAddHeuristic - Error saving heuristic:", error);
      // Error handling is done in the mutation callbacks
    }
  };
  
  // Handle removing a personal heuristic
  const handleRemoveHeuristic = async (id: string) => {
    console.log('🔄 Block1Discover.handleRemoveHeuristic - Removing heuristic with id:', id);
    
    try {
      // Use the mutation with optimistic updates
      await removeHeuristicMutation.mutateAsync(id);
    } catch (error) {
      console.error("🔴 Block1Discover.handleRemoveHeuristic - Error removing heuristic:", error);
      // Error handling is done in the mutation callbacks
    }
  };
  
  // Handle saving the success criteria
  const handleSuccessCriteriaChange = (value: string) => {
    setSuccessCriteria(value);
  };
  
  // Mark block as complete and go to next block
  const handleCompleteBlock = async () => {
    try {
      // Save current progress first
      await saveMutation.mutateAsync();
      
      // Mark block as complete in tool progress
      const res = await apiRequest("POST", `/api/tool-progress/${projectId}/block1`, {
        completed: true
      });
      
      if (!res.ok) {
        throw new Error("Failed to mark block as complete");
      }
      
      // Refresh progress data
      await refreshProgress();
      
      // Navigate to next block
      navigate(`/make-a-plan/${projectId}/block-2`);
      
      toast({
        title: "Block 1 completed",
        description: "You're now ready to move to Block 2: Design.",
      });
    } catch (error) {
      console.error("Error completing block:", error);
      toast({
        title: "Error",
        description: "Failed to complete this block. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    let completedItems = 0;
    let totalItems = 0;
    
    // Check success factor evaluations
    if (successFactors?.length > 0) {
      totalItems += successFactors.length;
      const evaluationsCount = Object.keys(plan?.blocks?.block1?.successFactorRatings || {}).length;
      completedItems += evaluationsCount;
    }
    
    // Check personal heuristics
    totalItems += 1; // At least one personal heuristic is recommended
    if ((plan?.blocks?.block1?.personalHeuristics || []).length > 0) {
      completedItems += 1;
    }
    
    // Check success criteria
    totalItems += 1;
    if (successCriteria?.trim()) {
      completedItems += 1;
    }
    
    return Math.round((completedItems / totalItems) * 100);
  };
  
  const completionPercentage = calculateCompletionPercentage();
  
  return (
    <PlanProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Project Banner */}
        <ProjectBanner />
        
        {/* Main content */}
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <Button 
            variant="outline" 
            onClick={() => navigate(`/make-a-plan/${projectId}`)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make a Plan
          </Button>
          
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-tcof-dark">Block 1: Discover</h1>
                <p className="text-gray-600 mt-1">Define project scope and success criteria</p>
              </div>
              
              {/* Completion status */}
              <div className="mt-4 sm:mt-0 bg-tcof-light rounded-lg px-4 py-2 flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-4 mr-3">
                  <div 
                    className="bg-tcof-teal h-4 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-tcof-dark">
                  {completionPercentage}% Complete
                </span>
              </div>
            </div>
            
            {/* Tabs navigation */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full max-w-4xl mx-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="successFactors">Success Factors</TabsTrigger>
                <TabsTrigger value="personalHeuristics">Personal Heuristics</TabsTrigger>
                <TabsTrigger value="summary">Summary & Next Steps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="pt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Welcome to Block 1: Discover</h2>
                    <p className="mb-4">
                      In this first block, you'll define what success looks like for your project by:
                    </p>
                    <ol className="list-decimal list-inside space-y-3 mb-6">
                      <li className="pl-2">
                        <span className="font-medium">Evaluating TCOF Success Factors</span>
                        <p className="text-sm text-gray-600 mt-1 ml-7">
                          Indicate how each of the 12 standard success factors resonates with you 
                          based on your experience and project context.
                        </p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">Adding Personal Heuristics</span>
                        <p className="text-sm text-gray-600 mt-1 ml-7">
                          Define any additional success criteria or "rules of thumb" that are 
                          important for your specific organizational context.
                        </p>
                      </li>
                      <li className="pl-2">
                        <span className="font-medium">Defining Success Criteria</span>
                        <p className="text-sm text-gray-600 mt-1 ml-7">
                          Articulate how you'll measure success at the end of your project.
                        </p>
                      </li>
                    </ol>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Info className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            Your progress is automatically saved as you work through each section.
                            You can always come back later to finish or make changes.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <Button
                        onClick={() => setActiveTab("successFactors")}
                        className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                      >
                        Begin with Success Factors <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="successFactors" className="pt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">Evaluate TCOF Success Factors</h2>
                    <p className="text-gray-600 mb-6">
                      For each success factor, indicate how it resonates with your experience and project context. 
                      This will help prioritize tasks in your plan.
                    </p>
                    
                    {factorsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-tcof-teal border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableCaption>TCOF success factors resonance evaluation</TableCaption>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[300px]">Factor</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-[300px]">Resonance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {successFactors?.map((factor: { id: string; factor: string; description: string }) => (
                              <TableRow key={factor.id}>
                                <TableCell className="font-medium">
                                  {factor.factor}
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help">{factor.description.substring(0, 100)}...</div>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-md">
                                        <p>{factor.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col space-y-2">
                                    <div className="flex space-x-2">
                                      {RESONANCE_OPTIONS.map((option) => {
                                        // Check both pending ratings (unsaved) and plan ratings (saved to server)
                                        const isSelected = pendingRatings?.[factor.id] === option.value;
                                        
                                        return (
                                          <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleEvaluationChange(factor.id, option.value)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 
                                              ${isSelected 
                                                ? 'bg-tcof-teal text-white ring-2 ring-tcof-dark scale-110 shadow-md transform' 
                                                : 'bg-gray-100 hover:bg-gray-200 hover:shadow hover:scale-105'
                                              }
                                              focus:outline-none focus:ring-2 focus:ring-tcof-teal focus:ring-opacity-50
                                              active:scale-95 active:transform
                                            `}
                                            title={`${option.label} – ${option.desc}`}
                                            aria-label={`Rate as ${option.label}: ${option.desc}`}
                                          >
                                            <span className="text-lg">{option.symbol}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    
                                    {pendingRatings?.[factor.id] && (
                                      <div className="text-sm mt-2 font-medium text-tcof-dark bg-tcof-light/30 p-2 rounded-md">
                                        <span className="font-bold">Selected: </span>
                                        {RESONANCE_OPTIONS.find(opt => opt.value === pendingRatings?.[factor.id])?.label} — 
                                        {RESONANCE_OPTIONS.find(opt => opt.value === pendingRatings?.[factor.id])?.desc}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    <div className="flex justify-between mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("overview")}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleSaveAll}
                          disabled={isRatingsSaving || saveMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isRatingsSaving || saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
                        </Button>
                        <Button
                          onClick={() => setActiveTab("personalHeuristics")}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        >
                          Next: Personal Heuristics <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="personalHeuristics" className="pt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">Add Personal Heuristics</h2>
                    <p className="text-gray-600 mb-6">
                      Personal heuristics are your organization's "rules of thumb" for project success. 
                      Add any specific success criteria that aren't covered by the standard TCOF factors.
                    </p>
                    
                    {/* Existing personal heuristics */}
                    {(plan?.blocks?.block1?.personalHeuristics?.length || 0) > 0 ? (
                      <div className="mb-8">
                        <h3 className="text-lg font-medium mb-3">Your Personal Heuristics</h3>
                        <div className="space-y-3">
                          {plan?.blocks?.block1?.personalHeuristics?.map((heuristic: { id: string; name: string; description: string }) => (
                            <div 
                              key={heuristic.id} 
                              className="bg-white border rounded-md p-4 flex justify-between items-start"
                            >
                              <div>
                                <h4 className="font-medium text-tcof-dark">{heuristic.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{heuristic.description}</p>
                              </div>
                              <Button
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveHeuristic(heuristic.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-6 text-center mb-8">
                        <p className="text-gray-500">
                          No personal heuristics added yet. Use the form below to add your first one.
                        </p>
                      </div>
                    )}
                    
                    {/* Add new personal heuristic form */}
                    <div className="bg-gray-50 rounded-md p-4 mb-6">
                      <h3 className="text-lg font-medium mb-3">Add New Heuristic</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="heuristicName">Name</Label>
                          <Input
                            id="heuristicName"
                            placeholder="e.g., Regular stakeholder check-ins"
                            value={newHeuristic.name}
                            onChange={(e) => setNewHeuristic({...newHeuristic, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="heuristicDescription">Description</Label>
                          <Textarea
                            id="heuristicDescription"
                            placeholder="Describe this heuristic and why it's important..."
                            value={newHeuristic.description}
                            onChange={(e) => setNewHeuristic({...newHeuristic, description: e.target.value})}
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleAddHeuristic}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Heuristic
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("successFactors")}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleSaveAll}
                          disabled={isRatingsSaving || saveMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isRatingsSaving || saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
                        </Button>
                        <Button
                          onClick={() => setActiveTab("summary")}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        >
                          Next: Summary & Success Criteria <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="summary" className="pt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">Summary & Success Criteria</h2>
                    <p className="text-gray-600 mb-6">
                      Review your work so far and define the overall success criteria for your project.
                    </p>
                    
                    {/* Success Criteria */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-3">Define Success Criteria</h3>
                      <p className="text-gray-600 mb-4">
                        How will you know if this project is successful? Define clear, measurable success criteria.
                      </p>
                      <Textarea
                        placeholder="Describe what success looks like for this project..."
                        value={successCriteria}
                        onChange={(e) => handleSuccessCriteriaChange(e.target.value)}
                        rows={6}
                        className="w-full mb-2"
                      />
                      <p className="text-sm text-gray-500">
                        Think about both objective metrics and subjective indicators of success.
                      </p>
                    </div>
                    
                    {/* Summary */}
                    <div className="bg-gray-50 rounded-md p-6 mb-6">
                      <h3 className="text-lg font-medium mb-3">Block 1 Summary</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">Success Factors Evaluated:</h4>
                          <p className="text-sm text-gray-600">
                            {Object.keys(plan?.blocks?.block1?.successFactorRatings || {}).length} of {successFactors?.length || 0} factors evaluated for resonance
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Personal Heuristics Added:</h4>
                          <p className="text-sm text-gray-600">
                            {plan?.blocks?.block1?.personalHeuristics?.length || 0} heuristics
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Success Criteria:</h4>
                          <p className="text-sm text-gray-600">
                            {successCriteria ? 'Defined' : 'Not yet defined'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Info className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            In Block 2, you'll build on this foundation to create tasks and map stakeholders.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("personalHeuristics")}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleSaveAll}
                          disabled={isRatingsSaving || saveMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isRatingsSaving || saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
                        </Button>
                        <Button
                          onClick={handleCompleteBlock}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                          disabled={completionPercentage < 60}
                        >
                          {completionPercentage < 60 ? (
                            "Complete more sections before proceeding"
                          ) : (
                            <>Complete and Continue to Block 2 <ChevronRight className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Action buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => navigate(`/make-a-plan/${projectId}/full`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> View Full Journey
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
                >
                  Skip to Block 2 <FastForward className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlanProvider>
  );
}