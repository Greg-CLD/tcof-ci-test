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
import { useBlockSave } from "@/hooks/useBlockSave";
import { usePersonalHeuristics } from "@/hooks/usePersonalHeuristics";
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

// Define the success factor resonance options with numeric values
const RESONANCE_OPTIONS = [
  { value: 1, symbol: '❌', label: "Doesn't land", desc: "I don't feel this…" },
  { value: 2, symbol: '🤔', label: "Unfamiliar", desc: "I've never seen it in action." },
  { value: 3, symbol: '🟡', label: "Seems true", desc: "I believe it's useful." },
  { value: 4, symbol: '✅', label: "Proven", desc: "I've used this and it worked." },
  { value: 5, symbol: '🔥', label: "Hard-won truth", desc: "It's burned into how I work." },
];

export default function Block1Discover() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { progress, refreshProgress } = useProgress();
  const { plan, savePlan, saveBlock: saveBlockFromContext } = usePlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active tab state
  const [activeTab, setActiveTab] = useState("overview");

  // State for new heuristic input
  const [newHeuristic, setNewHeuristic] = useState({ name: "", description: "" });
  
  // Use personal heuristics hook for server persistence
  const {
    heuristics: personalHeuristics = [],
    createHeuristic,
    updateHeuristic,
    deleteHeuristic,
    toggleFavorite,
    isLoading: isLoadingHeuristics
  } = usePersonalHeuristics(projectId);

  // State for success criteria
  const [successCriteria, setSuccessCriteria] = useState("");

  // Local state for ratings - using number types for values
  const [ratings, setRatings] = useState<Record<string, number>>({});

  // State for tracking the UI
  // (Removed debug panel tracking)

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

      // Load saved success factor ratings into ratings
      if (plan.blocks?.block1?.successFactorRatings) {
        const planRatings = plan.blocks.block1.successFactorRatings;
        console.log('🔄 Block1Discover.useEffect - Loading saved ratings:', planRatings);

        // Convert string values to numbers if needed
        const numericalRatings: Record<string, number> = {};
        Object.entries(planRatings).forEach(([factorId, value]) => {
          numericalRatings[factorId] = typeof value === 'number' 
            ? value 
            : parseInt(String(value), 10);
        });

        setRatings(numericalRatings);
      }

      // Load personal heuristics if available
      if (plan.blocks?.block1?.personalHeuristics) {
        console.log('🔄 Block1Discover.useEffect - Personal heuristics found in plan:', 
          plan.blocks.block1.personalHeuristics.length);

        // Log the raw data that's going to be passed to the state setter
        console.log(`%c[STATE UPDATE] Raw personal heuristics from plan (BEFORE formatting):`, 'color: #0ea5e9; font-weight: bold;');
        console.log(JSON.stringify(plan.blocks.block1.personalHeuristics, null, 2));

        // Now actually load the personal heuristics from the plan
        const heuristics = plan.blocks.block1.personalHeuristics;

        // Ensure each personal heuristic has a consistent structure
        const formattedHeuristics = heuristics.map(h => {
          // Handle string or object format for backward compatibility
          if (typeof h === 'string') {
            return { 
              id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              text: h,
              name: h,
              notes: '',
              description: '',
              favourite: false
            };
          } else {
            // Ensure all fields exist for consistency
            return {
              id: h.id || `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              text: h.text || h.name || '',
              name: h.name || h.text || '',
              notes: h.notes || h.description || '',
              description: h.description || h.notes || '',
              favourite: !!h.favourite
            };
          }
        });

        console.log('🔄 Block1Discover.useEffect - Found personal heuristics in plan:', JSON.stringify(formattedHeuristics, null, 2));
        console.log('🔄 Block1Discover.useEffect - COMPLETE BLOCK DATA BEING LOADED:', JSON.stringify(plan.blocks.block1, null, 2));
        
        // Create server heuristics from plan data if they don't exist yet
        if (formattedHeuristics.length > 0 && personalHeuristics.length === 0) {
          console.log('🔄 Block1Discover.useEffect - Creating server heuristics from plan data');
          formattedHeuristics.forEach(async (h) => {
            try {
              await createHeuristic({
                name: h.name,
                description: h.description,
                favourite: h.favourite
              });
            } catch (err) {
              console.error('Error creating heuristic from plan data:', err);
            }
          });
        }
      } else {
        console.log('🔄 Block1Discover.useEffect - No personal heuristics found in plan');
      }
    }
  }, [plan]);

  // Save progress mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: async () => {
      console.info(`[SAVE] Block1Discover.saveMutation - Saving block1 for project ${projectId}`);
      console.info(`[SAVE] Block1Discover.saveMutation - Current plan ID: ${plan?.id || 'null'}`);
      console.info(`[SAVE] Block1Discover.saveMutation - Success criteria length: ${successCriteria?.length || 0}`);
      console.info(`[SAVE] Block1Discover.saveMutation - Rating keys: ${Object.keys(ratings).join(', ')}`);

      // If no plan ID exists, this may be our first save
      if (!plan?.id) {
        console.info(`[SAVE] Block1Discover.saveMutation - No plan ID detected, ensuring plan exists`);

        try {
          // Create a minimal plan to ensure we have an ID
          const response = await apiRequest(
            "POST", 
            "/api/plans", 
            { 
              projectId, 
              blocks: {
                block1: {
                  successCriteria,
                  successFactorRatings: ratings
                }
              }
            }
          );

          if (!response.ok) {
            console.error(`[SAVE] Block1Discover.saveMutation - Failed to create plan: ${response.status} ${response.statusText}`);
          } else {
            const result = await response.json();
            console.info(`[SAVE] Block1Discover.saveMutation - Created new plan with ID: ${result.id}`);
          }
        } catch (error) {
          console.error(`[SAVE] Block1Discover.saveMutation - Error creating plan:`, error);
        }
      }

      // Include success criteria, ratings, AND personal heuristics in the save
      console.info(`[SAVE] Block1Discover.saveMutation - Including ${personalHeuristics.length} heuristics in save`);

      // Log the exact personal heuristics that will be saved
      console.log(`%c[SAVE] BLOCK1 SAVE - Personal heuristics being saved (${personalHeuristics.length}):`, 'color: #0ea5e9; font-weight: bold;');
      console.log(JSON.stringify(personalHeuristics, null, 2));

      const blockData = {
        successCriteria,
        successFactorRatings: ratings,
        personalHeuristics: personalHeuristics, // Add personal heuristics to every save
        lastUpdated: new Date().toISOString(),
      };

      // Log the PATCH payload
      console.log('PATCH payload →', blockData);

      // Log the FULL block data being passed to the save function
      console.log(`%c[SAVE] BLOCK1 SAVE - Complete block data being saved:`, 'color: #a855f7; font-weight: bold;');
      console.log(JSON.stringify(blockData, null, 2));

      return saveBlockFromContext('block1', blockData);
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
    updateEvaluations,
    evaluations,
    getEvaluationForFactor,
    isSaving: isRatingsSaving 
  } = useResonanceRatings(projectId);

  // Load server ratings on mount
  useEffect(() => {
    console.log('🔍 Block1Discover - useEffect for evaluations triggered, count:', evaluations?.length);
    if (evaluations && evaluations.length > 0) {
      // Create a map of factorId -> resonance from server evaluations
      const serverRatings = evaluations.reduce((acc: Record<string, number>, curr) => {
        // Safety check to ensure resonance is defined
        if (curr && curr.factorId && curr.resonance !== undefined) {
          // Parse the resonance value to a number
          acc[curr.factorId] = typeof curr.resonance === 'number' 
            ? curr.resonance 
            : parseInt(String(curr.resonance), 10);
        }
        return acc;
      }, {});

      console.log('🔄 Block1Discover - Server ratings loaded:', serverRatings);

      // Set our local state with server values
      setRatings(serverRatings);
      console.log('🔄 Block1Discover - Updated ratings state:', serverRatings);

      // Also save to the plan for persistence
      saveBlockFromContext('block1', {
        successFactorRatings: serverRatings,
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [evaluations, projectId, saveBlockFromContext]);

  // Handle success factor evaluation change - updates only the specified factor
  const handleEvaluationChange = async (factorId: string, value: number) => {
    console.log('🔄 Block1Discover.handleEvaluationChange - factorId:', factorId, 'value:', value);

    // Get existing rating if any
    const existingRating = getEvaluationForFactor(factorId);

    // Optimistic update
    setRatings(prev => ({ ...prev, [factorId]: value }));

    // User feedback
    toast({
      title: "Rating updated", 
      description: `Changed rating for factor: ${factorId}`,
      duration: 1500,
    });

    // Persist to server
    try {
      interface RatingPayload {
        factorId: string;
        resonance: number;
        id?: string;
      }
      const payloadItem: RatingPayload = { factorId, resonance: value };
      if (existingRating?.id) payloadItem.id = existingRating.id;
      await updateEvaluations([payloadItem]);
      console.log('🔄 Single rating PATCH succeeded');
    } catch (err) {
      console.error('🔴 Single rating PATCH failed', err);
      toast({
        title: "Save failed",
        description: "Could not save rating to server.",
        variant: "destructive",
      });
    }
  };

  // Function to save resonance ratings to server with preview feedback
  const handleConfirmAndSave = async () => {
    console.log('🔄 Block1Discover.handleConfirmAndSave - Starting save operation');

    try {
      // Validation: Ensure we have ratings to save
      if (Object.keys(ratings).length === 0) {
        toast({
          title: "No ratings to save",
          description: "Please rate at least one success factor first.",
          variant: "destructive",
        });
        return;
      }

      // First save ratings to local plan for persistence
      console.log('🔄 Block1Discover.handleConfirmAndSave - Saving ratings to local plan:', ratings);
      const now = new Date().toISOString();
      // Removed debug timestamp tracking
      await saveBlockFromContext('block1', {
        successFactorRatings: ratings,
        lastUpdated: now,
      });

      // Map ratings to the payload format expected by the API and filter out undefined factorIds
      const payload = Object.entries(ratings)
        .filter(([factorId, value]) => factorId && factorId !== 'undefined')
        .map(([factorId, value]) => ({ 
          factorId, 
          resonance: typeof value === 'number' ? value : parseInt(String(value), 10)
        }));

      console.log('🔄 Block1Discover.handleConfirmAndSave - Mapped payload:', payload);
      console.log('🔄 Block1Discover.handleConfirmAndSave - Sending ratings for project:', projectId);

      // Show a pending toast while saving
      toast({
        title: "Saving ratings...",
        description: `Saving ${payload.length} factor evaluations to the server.`,
      });

      // Send the ratings to the server
      await updateEvaluations(payload);

      // Show success message
      toast({
        title: "Ratings saved",
        description: "Your factor evaluations have been saved successfully.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'success-factor-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['resonanceRatings', projectId] });

      console.log('🔄 Block1Discover.handleConfirmAndSave - Save completed successfully');
    } catch (error) {
      console.error("🔴 Block1Discover.handleConfirmAndSave - Error:", error);
      toast({
        title: "Failed to save ratings",
        description: "There was an error saving your evaluations. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Combined function to save both local progress and send to server
  const handleSaveAll = async () => {
    console.log('🔄 Block1Discover.handleSaveAll - starting combined save operation');

    try {
      // Save local progress using the mutation
      console.log('🔄 Block1Discover.handleSaveAll - saving local progress first');
      await saveMutation.mutateAsync();

      // Use the new handler to save ratings to the server
      await handleConfirmAndSave();

      toast({
        title: "All changes saved",
        description: "Your changes have been saved locally and to the server.",
      });

      // Refresh queries to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
      
      // Also invalidate the personal heuristics query to ensure the latest data is displayed
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/heuristics`] });

    } catch (error) {
      console.error("🔴 Block1Discover - Error in combined save:", error);
      toast({
        title: "Failed to save changes",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get the block save hook to use consistent API pattern
  const { saveBlock: saveBlockWithHook, isLoading: isSavingBlock } = useBlockSave();

  // Heuristic add mutation with optimistic UI
  const addHeuristicMutation = useMutation({
    mutationFn: async (newHeuristicData: { 
      text: string;
      notes: string;
      id: string;
      name: string;
      description: string;
      favourite: boolean;
    }) => {
      console.info(`[SAVE] Block1Discover.addHeuristicMutation - Adding new heuristic for project ${projectId}`);
      console.info(`[SAVE] Block1Discover.addHeuristicMutation - Current plan ID: ${plan?.id || 'null'}`);
      console.info(`[SAVE] Block1Discover.addHeuristicMutation - Data:`, newHeuristicData);

      // If no plan ID exists, this may be our first save
      if (!plan?.id) {
        console.info(`[SAVE] Block1Discover.addHeuristicMutation - No plan ID detected, ensuring plan exists`);

        try {
          // Create a minimal plan to ensure we have an ID
          const response = await apiRequest(
            "POST", 
            "/api/plans", 
            { 
              projectId, 
              blocks: {
                block1: {
                  personalHeuristics: []
                }
              }
            }
          );

          if (!response.ok) {
            console.error(`[SAVE] Block1Discover.addHeuristicMutation - Failed to create plan: ${response.status} ${response.statusText}`);
          } else {
            const result = await response.json();
            console.info(`[SAVE] Block1Discover.addHeuristicMutation - Created new plan with ID: ${result.id}`);
            // Invalidate queries to ensure we have the new plan ID
            queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
          }
        } catch (error) {
          console.error(`[SAVE] Block1Discover.addHeuristicMutation - Error creating plan:`, error);
        }
      }

      // Get existing heuristics or empty array if none
      const existingHeuristics = plan?.blocks?.block1?.personalHeuristics || [];
      console.info(`[SAVE] Block1Discover.addHeuristicMutation - Current heuristics count: ${existingHeuristics.length}`);

      // Make sure the ID is always defined
      const heuristicId = newHeuristicData.id || `h-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Ensure we have a properly formatted heuristic with ALL field variants for maximum compatibility
      // This helps with both the UI rendering and server persistence
      const heuristicToSave = {
        id: heuristicId,
        // Include both naming conventions to ensure compatibility with all components
        text: newHeuristicData.text || newHeuristicData.name || '',
        notes: newHeuristicData.notes || newHeuristicData.description || '',
        name: newHeuristicData.name || newHeuristicData.text || '',
        description: newHeuristicData.description || newHeuristicData.notes || '',
        favourite: !!newHeuristicData.favourite
      };

      // Add the new heuristic using the server persistence hook
      console.info(`[SAVE] Block1Discover.addHeuristicMutation - Creating heuristic with server hook`);
      await createHeuristic({
        name: heuristicToSave.name,
        description: heuristicToSave.description,
        favourite: heuristicToSave.favourite
      });

      // Log the new heuristic being added for debugging
      console.log(`%c[HEURISTIC ADD] New heuristic being added:`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(heuristicToSave, null, 2));

      // Log the server-persisted heuristics array for debugging
      console.log(`%c[HEURISTIC ADD] Server-persisted personalHeuristics (${personalHeuristics.length}):`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(personalHeuristics, null, 2));

      // Build the block data with consistent structure
      const blockData = {
        personalHeuristics: personalHeuristics,
        // Maintain any existing data to avoid overwriting
        successFactorRatings: ratings || {},
        successCriteria: successCriteria || "",
        lastUpdated: new Date().toISOString()
      };

      // Log the complete block data being saved
      console.log(`%c[HEURISTIC ADD] Complete block data being saved:`, 'color: #a855f7; font-weight: bold;');
      console.log(JSON.stringify(blockData, null, 2));

      // Use the context save method to ensure consistent saving
      const result = await saveBlockFromContext('block1', blockData);

      console.info(`[SAVE] Block1Discover.addHeuristicMutation - Save successful, result:`, result);
      return result;
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
      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Removing heuristic ${heuristicId} for project ${projectId}`);
      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Current plan ID: ${plan?.id || 'null'}`);

      // If no plan ID exists, this may be our first save
      if (!plan?.id) {
        console.info(`[SAVE] Block1Discover.removeHeuristicMutation - No plan ID detected, ensuring plan exists`);

        try {
          // Create a minimal plan to ensure we have an ID
          const response = await apiRequest(
            "POST", 
            "/api/plans", 
            { 
              projectId, 
              blocks: {
                block1: {
                  personalHeuristics: []
                }
              }
            }
          );

          if (!response.ok) {
            console.error(`[SAVE] Block1Discover.removeHeuristicMutation - Failed to create plan: ${response.status} ${response.statusText}`);
          } else {
            const result = await response.json();
            console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Created new plan with ID: ${result.id}`);
            // Invalidate queries to ensure we have the new plan ID
            queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
          }
        } catch (error) {
          console.error(`[SAVE] Block1Discover.removeHeuristicMutation - Error creating plan:`, error);
        }
      }

      // We don't need to get existing heuristics as we're using server-side persistence
      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Deleting heuristic directly from server`);

      // Delete the heuristic using the server hook
      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Deleting heuristic with server hook: ${heuristicId}`);
      await deleteHeuristic(heuristicId);
      
      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Heuristic deleted successfully`);

      // Log the server-persisted heuristics array after removal
      console.log(`%c[HEURISTIC REMOVE] Server-persisted personalHeuristics:`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(personalHeuristics, null, 2));

      // Build the block data with consistent structure
      const blockData = {
        personalHeuristics: personalHeuristics,
        // Maintain any existing data to avoid overwriting
        successFactorRatings: ratings || {},
        successCriteria: successCriteria || "",
        lastUpdated: new Date().toISOString()
      };

      // Log the complete block data being saved
      console.log(`%c[HEURISTIC REMOVE] Complete block data being saved:`, 'color: #a855f7; font-weight: bold;');
      console.log(JSON.stringify(blockData, null, 2));

      // Save using consistent context method
      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Saving to block1 for project ${projectId}`);
      const result = await saveBlockFromContext('block1', blockData);

      console.info(`[SAVE] Block1Discover.removeHeuristicMutation - Save successful, result:`, result);
      return result;
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
      // Format personal heuristic for compatibility with HeuristicList component
      const formattedHeuristic = {
        name: newHeuristic.name,
        description: newHeuristic.description,
        // For compatibility with the HeuristicList component
        text: newHeuristic.name,
        notes: newHeuristic.description,
        id: Date.now().toString(),
        favourite: false
      };

      console.log('🔄 Block1Discover.handleAddHeuristic - Formatted heuristic:', formattedHeuristic);

      // Use the mutation with optimistic updates
      await addHeuristicMutation.mutateAsync(formattedHeuristic);
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
    console.log(`%c[SUCCESS CRITERIA] Updating success criteria value:`, 'color: #0ea5e9; font-weight: bold;');
    console.log(value);

    setSuccessCriteria(value);

    //    // Create block data with all required fields
    const blockData = {
      successCriteria: value,
      personalHeuristics: personalHeuristics,
      successFactorRatings: ratings || {},
      lastUpdated: new Date().toISOString()
    };

    // Log the block data that includes personal heuristics
    console.log(`%c[SUCCESS CRITERIA] Saving block data with ${personalHeuristics.length} personalheuristics:`, 'color: #a855f7; font-weight: bold;');
    console.log(JSON.stringify(blockData, null, 2));

    // Save success criteria with personal heuristics to ensure they're preserved
    saveBlockFromContext('block1', blockData);
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

  // (Removed completion percentage calculation)

  // Helper function to get emoji option details by value with additional safety checks
  const getOptionByValue = (value?: number | null) => {
    if (value === undefined || value === null) return null;
    // Handle both numeric values and string values that need conversion
    const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
    return isNaN(numericValue) ? null : RESONANCE_OPTIONS.find(opt => opt.value === numericValue) || null;
  };

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

          {/* Removed Debug Panel */}

          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-tcof-dark">Block 1: Discover</h1>
                <p className="text-gray-600 mt-1">Define project scope and success criteria</p>
              </div>

              {/* Removed completion percentage bar */}
            </div>

            {/* Tabs navigation */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full max-w-4xl mx-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="successFactors">Success Factors</TabsTrigger>
                <TabsTrigger value="personalHeuristics">Personal Heuristics</TabsTrigger>
              </TabsList>

              {/* Overview tab content */}
              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold mb-4">Block 1: Discover & Define</h2>
                    <p className="mb-4">
                      The first block of the Make a Plan tool helps you discover what makes a technology project successful 
                      and define what success means for your specific project.
                    </p>

                    <div className="space-y-6 mt-8">
                      <div className="flex items-start">
                        <div className="bg-tcof-light rounded-full w-10 h-10 flex items-center justify-center mr-4 shrink-0">
                          <span className="text-tcof-teal font-bold">1</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Evaluate TCOF Success Factors</h3>
                          <p className="text-gray-600">
                            Rate how much each of the 12 TCOF success factors resonates with your project 
                            and experience. This helps identify which factors are most relevant.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-tcof-light rounded-full w-10 h-10 flex items-center justify-center mr-4 shrink-0">
                          <span className="text-tcof-teal font-bold">2</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Add Personal Heuristics</h3>
                          <p className="text-gray-600">
                            Include your own personal success criteria or "rules of thumb" that aren't 
                            covered by the TCOF factors but are important for your specific project context.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-tcof-light rounded-full w-10 h-10 flex items-center justify-center mr-4 shrink-0">
                          <span className="text-tcof-teal font-bold">3</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Define Success Criteria</h3>
                          <p className="text-gray-600">
                            Summarize what success will look like for your project, incorporating both TCOF
                            factors and your personal heuristics to create a comprehensive success definition.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("successFactors")}
                        className="flex items-center"
                      >
                        Start with Success Factors <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Success Factors tab content */}
              <TabsContent value="successFactors" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("overview")}
                        className="mr-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleConfirmAndSave}
                          disabled={isRatingsSaving}
                          className="flex items-center"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isRatingsSaving ? 'Saving...' : 'Confirm & Save'}
                        </Button>
                        <Button
                          onClick={() => setActiveTab("personalHeuristics")}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        >
                          Next: Personal Heuristics <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <h2 className="text-2xl font-semibold mb-4">Evaluate Success Factors</h2>
                    <p className="mb-6">
                      Rate how much each of the 12 TCOF success factors resonates with your experience. 
                      This will help identify which factors are most relevant to your project's context.
                    </p>

                    {factorsLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tcof-teal"></div>
                      </div>
                    ) : (
                      <>
                        {/* Success factors table */}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-1/3">Success Factor</TableHead>
                                <TableHead className="w-1/3">Description</TableHead>
                                <TableHead className="text-center">Resonance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {successFactors?.map((factor: any) => (
                                <TableRow key={factor.id}>
                                  <TableCell className="font-medium">
                                    {factor.title}
                                  </TableCell>
                                  <TableCell>
                                    {factor.description}
                                  </TableCell>
                                  <TableCell className="px-3 py-2 text-center">
                                    <div className="flex flex-wrap justify-center gap-2">
                                      {RESONANCE_OPTIONS.map((option) => (
                                        <TooltipProvider key={option.value}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                                                  ${ratings[factor.id] === option.value
                                                    ? 'bg-tcof-teal text-white ring-2 ring-offset-2 ring-tcof-teal'
                                                    : 'bg-gray-100 hover:bg-gray-200'
                                                  }`}
                                                onClick={() => handleEvaluationChange(factor.id, option.value)}
                                              >
                                                {option.symbol}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p><strong>{option.label}</strong>: {option.desc}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Enhanced Live Ratings Preview Panel */}
                        <div className="mt-8 p-4 bg-gray-50 border rounded-md shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Live Preview: Your Ratings</h3>
                            <div className="text-sm text-gray-500">
                              {Object.keys(ratings).length} of {successFactors?.length || 0} factors rated
                            </div>
                          </div>

                          {Object.keys(ratings).length > 0 ? (
                            <div className="space-y-3">
                              {successFactors?.map((factor: any) => {
                                const ratingValue = ratings[factor.id];
                                const option = getOptionByValue(ratingValue);

                                // Display all factors, but highlight those with ratings
                                return (
                                  <div 
                                    key={factor.id} 
                                    className={`p-2 rounded-md transition-all duration-300 ${
                                      ratingValue ? 'bg-white border border-tcof-teal/20' : 'opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                                        ${ratingValue 
                                          ? 'bg-tcof-teal text-white' 
                                          : 'bg-gray-100 text-gray-400'
                                        }`}
                                      >
                                        {option?.symbol || '?'}
                                      </div>
                                      <div className="ml-3 flex-1">
                                        <div className="font-medium text-sm">{factor.title}</div>
                                        {ratingValue ? (
                                          <div className="text-sm flex items-center mt-1">
                                            <span className="text-tcof-blue font-medium">{option?.label}</span>
                                            <span className="ml-2 text-gray-500 text-xs italic">{option?.desc}</span>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400 italic mt-1">Not yet rated</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-6 text-center bg-white rounded-md border border-dashed border-gray-300">
                              <div className="text-3xl mb-2">👆</div>
                              <p className="text-gray-500">No ratings selected yet.</p>
                              <p className="text-gray-400 text-sm mt-1">Click on the emoji buttons above to rate factors.</p>
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              Ratings are automatically previewed here but will only be saved when you click "Confirm & Save".
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-4">
                          <Button
                            variant="outline"
                            onClick={handleConfirmAndSave}
                            disabled={isRatingsSaving}
                            className="flex items-center"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            {isRatingsSaving ? 'Saving...' : 'Confirm & Save'}
                          </Button>
                          <Button
                            onClick={() => setActiveTab("personalHeuristics")}
                            className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                          >
                            Next: Personal Heuristics <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Personal Heuristics tab content */}
              <TabsContent value="personalHeuristics" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("successFactors")}
                        className="mr-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleSaveAll}
                          disabled={saveMutation.isPending}
                          className="flex items-center"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {saveMutation.isPending ? 'Saving...' : 'Save Progress'}
                        </Button>
                        <Button
                          onClick={() => setActiveTab("summary")}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        >
                          Next: Summary <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <h2 className="text-2xl font-semibold mb-4">Personal Heuristics</h2>
                    <p className="mb-6">
                      Add your own personal success criteria or "rules of thumb" that aren't covered by the TCOF factors 
                      but are important for your specific project context.
                    </p>

                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-3">Add a New Heuristic</h3>
                      <div className="grid grid-cols-1 gap-4 mb-4">
                        <div>
                          <Label htmlFor="heuristicName">Heuristic Name</Label>
                          <Input
                            id="heuristicName"
                            placeholder="e.g., Engagement before features"
                            value={newHeuristic.name}
                            onChange={(e) => setNewHeuristic(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="heuristicDescription">Description</Label>
                          <Textarea
                            id="heuristicDescription"
                            placeholder="e.g., Always prioritize user engagement over new features"
                            value={newHeuristic.description}
                            onChange={(e) => setNewHeuristic(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleAddHeuristic}
                        className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        disabled={addHeuristicMutation.isPending}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {addHeuristicMutation.isPending ? 'Adding...' : 'Add Heuristic'}
                      </Button>
                    </div>

                    <p className="text-gray-600 mb-4">
                      Add any specific success criteria that aren't covered by the standard TCOF factors.
                    </p>

                    {/* Existing personal heuristics */}
                    {isLoadingHeuristics ? (
                      <div className="bg-white border rounded-md p-4 flex justify-center">
                        <div className="animate-spin w-6 h-6 border-4 border-tcof-teal border-t-transparent rounded-full"></div>
                      </div>
                    ) : personalHeuristics.length > 0 ? (
                      <div className="mb-8">
                        <h3 className="text-lg font-medium mb-3">Your Personal Heuristics</h3>
                        <div className="space-y-3">
                          {personalHeuristics.map((heuristic: any) => {
                            // Support both old and new data formats
                            const displayName = heuristic.name || heuristic.text || 'Unnamed Heuristic';
                            const displayDescription = heuristic.description || heuristic.notes || '';
                            const heuristicId = heuristic.id || String(Date.now());

                            console.log('🔄 Rendering heuristic from server:', { 
                              id: heuristicId, 
                              displayName, 
                              displayDescription,
                              originalFields: Object.keys(heuristic)
                            });

                            return (
                              <div 
                                key={heuristicId} 
                                className="bg-white border rounded-md p-4 flex justify-between items-start"
                              >
                                <div>
                                  <h4 className="font-medium text-tcof-dark">{displayName}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{displayDescription}</p>
                                </div>
                                <Button
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRemoveHeuristic(heuristicId)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-tcof-light/30 border border-dashed border-tcof-teal/30 rounded-md p-6 text-center mb-8">
                        <Info className="h-8 w-8 text-tcof-teal mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">No Personal Heuristics Added Yet</h3>
                        <p className="text-gray-600 mb-3">
                          Add your own success criteria that are specific to your project.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-4">
                      <Button
                        variant="outline"
                        onClick={handleSaveAll}
                        disabled={saveMutation.isPending}
                        className="flex items-center"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Progress'}
                      </Button>
                      <Button
                        onClick={() => setActiveTab("summary")}
                        className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                      >
                        Next: Summary <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary tab content removed */}
                    <div className="flex items-center mb-6">
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("personalHeuristics")}
                        className="mr-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleConfirmAndSave}
                          disabled={isRatingsSaving}
                          className="flex items-center"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isRatingsSaving ? 'Saving...' : 'Confirm & Save'}
                        </Button>
                        <Button
                          onClick={handleCompleteBlock}
                          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                          disabled={completionPercentage < 60}
                        >
                          Complete Block 1 <FastForward className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <h2 className="text-2xl font-semibold mb-4">Summary & Next Steps</h2>
                    <p className="mb-6">
                      Now that you've evaluated success factors and added personal heuristics, define your overall
                      success criteria and complete this block to move forward in your planning process.
                    </p>

                    {/* Success Criteria */}
                    <div className="mb-8">
                      <Label htmlFor="successCriteria" className="text-lg font-medium">
                        Define Your Success Criteria
                      </Label>
                      <p className="text-gray-600 mt-1 mb-3">
                        Based on the success factors and heuristics you've identified, write a brief summary of
                        what success will look like for your project.
                      </p>
                      <Textarea
                        id="successCriteria"
                        value={successCriteria}
                        onChange={(e) => handleSuccessCriteriaChange(e.target.value)}
                        rows={6}
                        className="mb-2"
                        placeholder="e.g., Our project will be successful when users can easily access and use our service, we've delivered on time and on budget, and we've established a sustainable operating model."
                      />
                    </div>

                    {/* Block completion progress */}
                    <div className="bg-tcof-light p-4 rounded-md mb-8">
                      <h3 className="font-medium text-lg mb-2">Block 1 Completion: {completionPercentage}%</h3>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                        <div 
                          className="bg-tcof-teal h-4 rounded-full"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>

                      <ul className="space-y-2">
                        <li className="flex items-center">
                          {Object.keys(ratings).length > 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          ) : (
                            <div className="h-5 w-5 border border-gray-400 rounded-full mr-2"></div>
                          )}
                          <span>Evaluate Success Factors</span>
                        </li>
                        <li className="flex items-center">
                          {(plan?.blocks?.block1?.personalHeuristics?.length || 0) > 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          ) : (
                            <div className="h-5 w-5 border border-gray-400 rounded-full mr-2"></div>
                          )}
                          <span>Add Personal Heuristics</span>
                        </li>
                        <li className="flex items-center">
                          {successCriteria?.trim() ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          ) : (
                            <div className="h-5 w-5 border border-gray-400 rounded-full mr-2"></div>
                          )}
                          <span>Define Success Criteria</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex justify-between gap-4">
                      <Button
                        variant="outline"
                        onClick={handleSaveAll}
                        disabled={saveMutation.isPending}
                        className="flex items-center"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saveMutation.isPending ? 'Saving...' : 'Save Progress'}
                      </Button>
                      <Button
                        onClick={handleCompleteBlock}
                        className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                        disabled={completionPercentage < 60}
                      >
                        {completionPercentage < 60 
                          ? 'Complete more items to proceed' 
                          : 'Complete Block 1'} 
                        <FastForward className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PlanProvider>
  );
}