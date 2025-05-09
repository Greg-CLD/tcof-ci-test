import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePlan } from "@/contexts/PlanContext";
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { ArrowLeft, ChevronRight, Plus, X, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PersonalHeuristic } from "@shared/types/personal-heuristics";
import { v4 as uuid } from "uuid";

export default function Block1Step2() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Input refs for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // State for new heuristic fields
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  
  // Local state for existing heuristics
  const [heuristics, setHeuristics] = useState<PersonalHeuristic[]>([]);
  
  // Load existing heuristics from plan data on component mount
  useEffect(() => {
    console.log(`%c[HEURISTICS INIT] Loading heuristics from plan:`, 'color: #0ea5e9; font-weight: bold;');
    console.log(plan?.blocks?.block1);
    
    const existingHeuristics = plan?.blocks?.block1?.personalHeuristics || [];
    
    if (existingHeuristics.length > 0) {
      console.log(`%c[HEURISTICS INIT] Found ${existingHeuristics.length} heuristics:`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(existingHeuristics, null, 2));
      
      // Normalize all heuristics to ensure consistent field structure
      const normalizedHeuristics = existingHeuristics.map(h => {
        if (typeof h === 'string') {
          // Convert string format to proper object
          return {
            id: uuid(),
            name: h,
            text: h,          // Alias for name in some components
            description: '',
            notes: '',        // Alias for description in some components
            favourite: false
          } as PersonalHeuristic;
        } else if (h && typeof h === 'object') {
          // Ensure all object-based heuristics have consistent structure
          return {
            id: h.id || uuid(),
            name: h.name || h.text || '',
            text: h.text || h.name || '',
            description: h.description || h.notes || '',
            notes: h.notes || h.description || '',
            favourite: h.favourite || false
          } as PersonalHeuristic;
        }
        
        // Fallback for any other formats
        return {
          id: uuid(),
          name: String(h),
          text: String(h),
          description: '',
          notes: '',
          favourite: false
        } as PersonalHeuristic;
      });
      
      console.log(`%c[HEURISTICS INIT] Normalized to consistent format:`, 'color: #059669; font-weight: bold;');
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
  
  // Single function to save heuristics
  const saveHeuristics = async (updatedHeuristics: PersonalHeuristic[]) => {
    console.log(`%c[SAVE HEURISTICS] Saving ${updatedHeuristics.length} heuristics:`, 'color: #059669; font-weight: bold;');
    console.log(JSON.stringify(updatedHeuristics, null, 2));
    
    // Use a single, consistent save path for all heuristic operations
    return saveBlock('block1', {
      personalHeuristics: updatedHeuristics,
      lastUpdated: new Date().toISOString(),
    });
  };
  
  // Add heuristic mutation 
  const addHeuristicMutation = useMutation({
    mutationFn: async () => {
      // Build complete heuristic object with all required fields
      const newHeuristic: PersonalHeuristic = {
        id: uuid(),
        name: newName.trim(),
        text: newName.trim(),       // Alias for name
        description: newNotes.trim(),
        notes: newNotes.trim(),     // Alias for description
        favourite: false
      };
      
      console.log(`%c[ADD HEURISTIC] Creating new heuristic:`, 'color: #059669; font-weight: bold;');
      console.log(JSON.stringify(newHeuristic, null, 2));
      
      // Add to existing array and save
      const updatedHeuristics = [...heuristics, newHeuristic];
      return saveHeuristics(updatedHeuristics);
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot previous value for rollback
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      const previousHeuristics = [...heuristics];
      
      // Create the new heuristic with full structure
      const newHeuristic: PersonalHeuristic = {
        id: uuid(),
        name: newName.trim(),
        text: newName.trim(),
        description: newNotes.trim(),
        notes: newNotes.trim(),
        favourite: false
      };
      
      // Update local state for immediate UI feedback
      const updatedHeuristics = [...heuristics, newHeuristic];
      setHeuristics(updatedHeuristics);
      
      // Optimistically update the query cache
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
      
      // Show feedback toast
      toast({
        title: "Adding heuristic...",
        description: "Your personal heuristic is being saved.",
      });
      
      return { previousPlan, previousHeuristics };
    },
    onSuccess: () => {
      // Clear input fields
      setNewName("");
      setNewNotes("");
      
      // Return focus to name input
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
      
      toast({
        title: "Heuristic added",
        description: "Your custom heuristic has been added successfully."
      });
    },
    onError: (error, _variables, context) => {
      console.error("Error adding heuristic:", error);
      
      // Revert to previous state
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      if (context?.previousHeuristics) {
        setHeuristics(context.previousHeuristics);
      }
      
      toast({
        title: "Failed to add heuristic",
        description: "There was an error saving your heuristic. Your changes have been reverted.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Remove heuristic mutation
  const removeHeuristicMutation = useMutation({
    mutationFn: async (id: string) => {
      const updatedHeuristics = heuristics.filter(h => h.id !== id);
      return saveHeuristics(updatedHeuristics);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      
      // Snapshot previous values
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      const previousHeuristics = [...heuristics];
      
      // Get heuristic being removed for logging
      const heuristicToRemove = heuristics.find(h => h.id === id);
      console.log(`%c[REMOVE HEURISTIC] Removing heuristic with ID ${id}:`, 'color: #dc2626; font-weight: bold;');
      console.log(JSON.stringify(heuristicToRemove, null, 2));
      
      // Update local state
      const updatedHeuristics = heuristics.filter(h => h.id !== id);
      setHeuristics(updatedHeuristics);
      
      // Optimistic update
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
      console.error("Error removing heuristic:", error);
      
      // Roll back to previous state
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      if (context?.previousHeuristics) {
        setHeuristics(context.previousHeuristics);
      }
      
      toast({
        title: "Failed to remove heuristic",
        description: "There was an error removing your heuristic. Your changes have been reverted.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Save all heuristics
  const saveAllHeuristicsMutation = useMutation({
    mutationFn: async () => {
      // Ensure all items are properly formatted
      const normalizedHeuristics = heuristics.map(h => ({
        id: h.id || uuid(),
        name: h.name,
        text: h.name,
        description: h.description,
        notes: h.description,
        favourite: h.favourite || false
      }));
      
      return saveHeuristics(normalizedHeuristics);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['plan', projectId] });
      const previousPlan = queryClient.getQueryData(['plan', projectId]);
      
      toast({
        title: "Saving all heuristics...",
        description: "Your custom heuristics are being saved."
      });
      
      return { previousPlan };
    },
    onSuccess: () => {
      toast({
        title: "All heuristics saved",
        description: "Your custom heuristics have been saved successfully."
      });
    },
    onError: (error, _variables, context) => {
      console.error("Error saving all heuristics:", error);
      
      if (context?.previousPlan) {
        queryClient.setQueryData(['plan', projectId], context.previousPlan);
      }
      
      toast({
        title: "Failed to save heuristics",
        description: "There was an error saving your heuristics. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', projectId] });
    }
  });
  
  // Handle form submission
  const handleAddHeuristic = () => {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Empty heuristic",
        description: "Please enter a name for your heuristic."
      });
      return;
    }
    
    addHeuristicMutation.mutate();
  };
  
  // Handle pressing Enter in the name input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHeuristic();
    }
  };
  
  // Clean up heuristics for rendering
  const renderName = (heuristic: PersonalHeuristic) => {
    return heuristic.name || heuristic.text || 
      (typeof heuristic === 'string' ? heuristic : '');
  };
  
  const renderNotes = (heuristic: PersonalHeuristic) => {
    return heuristic.description || heuristic.notes || '';
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
              <div className="space-y-4 mb-8 border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2">Add New Heuristic</h3>
                <div>
                  <label htmlFor="heuristic-name" className="block text-sm font-medium mb-1">Heuristic Name</label>
                  <Input
                    id="heuristic-name"
                    ref={nameInputRef}
                    placeholder="Enter a name or brief statement..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="heuristic-notes" className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <Textarea
                    id="heuristic-notes"
                    placeholder="Additional details or explanation..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full h-20"
                  />
                </div>
                <Button onClick={handleAddHeuristic} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Heuristic
                </Button>
              </div>
              
              {/* Heuristics list */}
              <div className="border rounded-lg mb-6">
                <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                  <h3 className="font-medium">Your Custom Heuristics ({heuristics.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveAllHeuristicsMutation.mutate()}
                    disabled={heuristics.length === 0}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save All
                  </Button>
                </div>
                
                <div className="max-h-[300px] overflow-auto p-2">
                  {heuristics.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No custom heuristics added yet. Use the form above to add some.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {heuristics.map((heuristic) => (
                        <li 
                          key={heuristic.id} 
                          className="flex items-start justify-between p-3 bg-white rounded border hover:bg-gray-50"
                        >
                          <div className="flex-grow pr-4">
                            <div className="font-medium">{renderName(heuristic)}</div>
                            {renderNotes(heuristic) && (
                              <div className="text-sm text-gray-600 mt-1">{renderNotes(heuristic)}</div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeHeuristicMutation.mutate(heuristic.id || '')}
                            aria-label="Remove heuristic"
                            className="flex-shrink-0"
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
                    onClick={() => saveAllHeuristicsMutation.mutate()}
                    disabled={heuristics.length === 0}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save All
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