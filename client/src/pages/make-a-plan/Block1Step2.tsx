import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlan } from "@/contexts/PlanContext";
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { ArrowLeft, ChevronRight, Plus, X, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PersonalHeuristic } from "@shared/types/personal-heuristics";

export default function Block1Step2() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Input ref for returning focus after adding
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local state for new heuristic
  const [newHeuristic, setNewHeuristic] = useState("");
  
  // Local state for heuristics list
  const [heuristics, setHeuristics] = useState<PersonalHeuristic[]>([]);
  
  // Initialize local state from plan data
  useEffect(() => {
    console.log(`%c[HEURISTICS INIT] Plan data received for block1:`, 'color: #0ea5e9; font-weight: bold;');
    console.log(plan?.blocks?.block1);
    
    if (plan?.blocks?.block1?.personalHeuristics) {
      const rawHeuristics = plan.blocks.block1.personalHeuristics;
      console.log(`%c[HEURISTICS INIT] Raw personal heuristics (${rawHeuristics.length}):`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(rawHeuristics, null, 2));
      
      // Ensure we have an array of normalized PersonalHeuristic objects with consistent fields
      const normalizedHeuristics = rawHeuristics.map(h => {
        // Base object with default values
        const normalizedH: PersonalHeuristic = {
          id: '', 
          name: '',
          description: '',
          // Include any other required fields with default values
        };
        
        // Handle various input formats
        if (typeof h === 'string') {
          // Simple string format
          normalizedH.name = h;
          normalizedH.id = `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        } else if (typeof h === 'object' && h !== null) {
          // Object format - prioritize standard field names but fall back to alternates
          normalizedH.id = h.id || `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          // Handle name field (might be 'text' in some implementations)
          normalizedH.name = h.name || h.text || '';
          
          // Handle description field (might be 'notes' in some implementations)
          normalizedH.description = h.description || h.notes || '';
          
          // Copy any other fields
          Object.assign(normalizedH, h);
        }
        
        return normalizedH;
      });
      
      console.log(`%c[HEURISTICS INIT] Normalized heuristics (${normalizedHeuristics.length}):`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(normalizedHeuristics, null, 2));
      
      setHeuristics(normalizedHeuristics);
    } else {
      console.log(`%c[HEURISTICS INIT] No personal heuristics found in plan data`, 'color: #dc2626; font-weight: bold;');
    }
  }, [plan]);
  
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
  
  // Add heuristic mutation with optimistic UI
  const addHeuristicMutation = useMutation({
    mutationFn: async (newHeuristicText: string) => {
      // Create new heuristic object with an ID
      const heuristicId = `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create properly structured heuristic object
      const newHeuristicObj: PersonalHeuristic = { 
        id: heuristicId,
        name: newHeuristicText,
        description: "",
        // Also include text/notes fields for compatibility with HeuristicList component
        text: newHeuristicText,
        notes: ""
      };
      
      console.log(`%c[ADD HEURISTIC] Creating new heuristic with ID ${heuristicId}:`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(newHeuristicObj, null, 2));
      
      const updatedHeuristics = [...heuristics, newHeuristicObj];
      
      console.log(`%c[ADD HEURISTIC] Saving ${updatedHeuristics.length} heuristics:`, 'color: #0ea5e9; font-weight: bold;');
      console.log(JSON.stringify(updatedHeuristics, null, 2));
      
      // Save to block1, including both name/description and text/notes field formats
      return saveBlock('block1', {
        personalHeuristics: updatedHeuristics,
        lastUpdated: new Date().toISOString(),
      });
    },
    onMutate: async (newHeuristicText) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      // Create new heuristic object with an ID
      const heuristicId = `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create properly structured heuristic object
      const newHeuristicObj: PersonalHeuristic = { 
        id: heuristicId,
        name: newHeuristicText,
        description: "",
        // Also include text/notes fields for compatibility with HeuristicList component
        text: newHeuristicText,
        notes: ""
      };
      
      // Optimistically update to the new value
      queryClient.setQueryData(['plan', projectId], (old: any) => {
        if (!old) return old;
        
        const currentHeuristics = old.blocks?.block1?.personalHeuristics || [];
        
        // Ensure all existing heuristics are properly formatted objects
        const normalizedHeuristics = currentHeuristics.map((h: any) => {
          if (typeof h === 'string') {
            return { 
              id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: h, 
              description: "",
              text: h,
              notes: ""
            };
          } else if (h && typeof h === 'object') {
            // Create a normalized object with all required fields
            return {
              id: h.id || `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: h.name || h.text || "",
              description: h.description || h.notes || "",
              text: h.text || h.name || "",
              notes: h.notes || h.description || ""
            };
          }
          // Fallback for unknown formats
          return { 
            id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: String(h), 
            description: "",
            text: String(h),
            notes: ""
          };
        });
        
        const updatedHeuristics = [...normalizedHeuristics, newHeuristicObj];
        
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
      
      // Update local state for UI
      setHeuristics(prev => [...prev, newHeuristicObj]);
      
      // Show immediate feedback
      toast({
        title: "Adding heuristic...",
        description: "Your personal heuristic is being saved.",
      });
      
      return { previousPlan };
    },
    onSuccess: () => {
      // Clear input and return focus
      setNewHeuristic("");
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
      toast({
        title: "Heuristic added",
        description: "Your custom heuristic has been added successfully."
      });
    },
    onError: (error, _variables, context) => {
      // If the mutation fails, use the context we saved to roll back
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
        
        // Also reset local state from the plan
        const prevPlan = context.previousPlan as any;
        if (prevPlan?.blocks?.block1?.personalHeuristics) {
          setHeuristics(prevPlan.blocks.block1.personalHeuristics);
        }
      }
      
      console.error("Error adding heuristic:", error);
      toast({
        title: "Failed to add heuristic",
        description: "There was an error saving your heuristic. Your changes have been reverted.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Remove heuristic mutation with optimistic UI
  const removeHeuristicMutation = useMutation({
    mutationFn: async (index: number) => {
      const updatedHeuristics = heuristics.filter((_, i) => i !== index);
      
      // Save to block1
      return saveBlock('block1', {
        personalHeuristics: updatedHeuristics,
        lastUpdated: new Date().toISOString(),
      });
    },
    onMutate: async (index) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot the previous values
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      const previousHeuristics = [...heuristics];
      
      // Calculate new heuristics
      const updatedHeuristics = heuristics.filter((_, i) => i !== index);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['plan', projectId], (old: any) => {
        if (!old) return old;
        
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
      
      // Update local state for UI
      setHeuristics(updatedHeuristics);
      
      // Show immediate feedback
      toast({
        title: "Removing heuristic...",
        description: "Your heuristic is being removed."
      });
      
      return { previousPlan, previousHeuristics };
    },
    onSuccess: () => {
      toast({
        title: "Heuristic removed",
        description: "Your custom heuristic has been removed successfully."
      });
    },
    onError: (error, _variables, context) => {
      // Revert to previous plan data
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      // Revert local state
      if (context?.previousHeuristics) {
        setHeuristics(context.previousHeuristics);
      }
      
      console.error("Error removing heuristic:", error);
      toast({
        title: "Failed to remove heuristic",
        description: "There was an error removing your heuristic. Your changes have been reverted.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Save all heuristics mutation with optimistic UI
  const saveHeuristicsMutation = useMutation({
    mutationFn: async () => {
      return saveBlock('block1', {
        personalHeuristics: heuristics,
        lastUpdated: new Date().toISOString(),
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot the previous value
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      // Show immediate feedback
      toast({
        title: "Saving heuristics...",
        description: "Your custom heuristics are being saved."
      });
      
      return { previousPlan };
    },
    onSuccess: () => {
      toast({
        title: "Heuristics saved",
        description: "Your custom heuristics have been saved successfully."
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      console.error("Error saving heuristics:", error);
      toast({
        title: "Failed to save heuristics",
        description: "There was an error saving your heuristics. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Handle adding a new heuristic
  const handleAddHeuristic = () => {
    const trimmedHeuristic = newHeuristic.trim();
    
    if (!trimmedHeuristic) {
      toast({
        variant: "destructive",
        title: "Empty heuristic",
        description: "Please enter some text for your heuristic."
      });
      return;
    }
    
    // Use the mutation with optimistic updates
    addHeuristicMutation.mutate(trimmedHeuristic);
  };
  
  // Handle removing a heuristic
  const handleRemoveHeuristic = (index: number) => {
    // Use the mutation with optimistic updates
    removeHeuristicMutation.mutate(index);
  };
  
  // Handle save button click
  const handleSave = () => {
    // Use the mutation with optimistic updates
    saveHeuristicsMutation.mutate();
  };
  
  // Handle pressing Enter in the input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHeuristic();
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Banner */}
      <ProjectBanner />
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button 
          variant="outline" 
          onClick={() => navigate(`/make-a-plan/${projectId}/block-1/step-1`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 1
        </Button>
        
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col mb-6">
            <h1 className="text-3xl font-bold text-tcof-dark">Block 1: Define Personal Heuristics</h1>
            <p className="text-gray-600 mt-1">
              Add your own custom heuristics to guide your project thinking
            </p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Custom Heuristics Builder</h2>
              <p className="text-gray-600 mb-6">
                Heuristics are mental shortcuts or rules of thumb that help guide decision-making.
                Add your own personal or project-specific heuristics that will help you evaluate options.
              </p>
              
              {/* Add heuristic form */}
              <div className="flex gap-3 mb-8">
                <div className="flex-grow">
                  <Input
                    ref={inputRef}
                    placeholder="Enter a custom heuristic..."
                    value={newHeuristic}
                    onChange={(e) => setNewHeuristic(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleAddHeuristic}>
                  <Plus className="mr-2 h-4 w-4" /> Add Heuristic
                </Button>
              </div>
              
              {/* Heuristics list */}
              <div className="border rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="font-medium">Your Custom Heuristics</h3>
                </div>
                <div className="max-h-[300px] overflow-auto p-2">
                  {heuristics.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No custom heuristics added yet. Use the form above to add some.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {heuristics.map((heuristic, index) => (
                        <li 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50"
                        >
                          <span>{typeof heuristic === 'string' ? heuristic : heuristic.name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveHeuristic(index)}
                            aria-label="Remove heuristic"
                          >
                            <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-1/step-1`)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save Heuristics
                  </Button>
                  <Button
                    onClick={() => navigate(`/make-a-plan/${projectId}/block-1`)}
                    className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  >
                    Next: Block 1 Summary <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}