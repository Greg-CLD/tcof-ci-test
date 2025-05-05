import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Info, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Outcome type interface
export interface Outcome {
  id: string;
  title: string;
  level: string;
}

interface OutcomeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingOutcomes: Outcome[];
}

export function OutcomeSelectorModal({
  isOpen,
  onClose,
  projectId,
  existingOutcomes
}: OutcomeSelectorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<string[]>([]);
  const [newOutcomeTitle, setNewOutcomeTitle] = useState("");
  const [isAddingOutcome, setIsAddingOutcome] = useState(false);
  
  // Define response type for outcomes data
  interface OutcomesResponse {
    selectedOutcomeIds: string[];
    customOutcomes: Outcome[];
  }
  
  // Fetch project outcomes (selected outcome IDs and custom outcomes)
  const { data: outcomesData, isLoading: isLoadingOutcomes } = useQuery<OutcomesResponse>({
    queryKey: [`/api/projects/${projectId}/outcomes`],
    enabled: isOpen && !!projectId,
  });
  
  // Mutation to update selected outcomes
  const updateOutcomesMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/projects/${projectId}/outcomes`, 
        { selectedOutcomeIds: selectedIds }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outcomes`] });
      toast({
        title: "Outcomes updated",
        description: "Your tracked outcomes have been updated.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update outcomes",
        description: error.message || "An error occurred while updating outcomes.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to create a custom outcome
  const createOutcomeMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest(
        "POST", 
        `/api/projects/${projectId}/outcomes`, 
        { title, level: "custom" }
      );
      return res.json();
    },
    onSuccess: (newOutcome) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outcomes`] });
      // Add the new outcome to selected outcomes
      setSelectedOutcomeIds(prev => [...prev, newOutcome.id]);
      setNewOutcomeTitle("");
      setIsAddingOutcome(false);
      toast({
        title: "Custom outcome created",
        description: "Your custom outcome has been created and selected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create custom outcome",
        description: error.message || "An error occurred while creating custom outcome.",
        variant: "destructive",
      });
    },
  });
  
  // Initialize selected outcomes when data is loaded
  useEffect(() => {
    if (outcomesData) {
      setSelectedOutcomeIds(outcomesData.selectedOutcomeIds || []);
    }
  }, [outcomesData]);
  
  // Handle checkbox change
  const handleOutcomeSelect = (outcomeId: string) => {
    setSelectedOutcomeIds(prev => {
      // If already selected, remove it
      if (prev.includes(outcomeId)) {
        return prev.filter(id => id !== outcomeId);
      }
      
      // If we have 5 or more outcomes, don't add more
      if (prev.length >= 5) {
        toast({
          title: "Maximum outcomes reached",
          description: "You can select a maximum of 5 outcomes to track.",
          variant: "destructive",
        });
        return prev;
      }
      
      // Add the outcome to selection
      return [...prev, outcomeId];
    });
  };
  
  // Save selected outcomes
  const handleSave = () => {
    updateOutcomesMutation.mutate(selectedOutcomeIds);
  };
  
  // Handle creating a new custom outcome
  const handleCreateOutcome = () => {
    if (!newOutcomeTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your custom outcome.",
        variant: "destructive",
      });
      return;
    }
    
    createOutcomeMutation.mutate(newOutcomeTitle.trim());
  };
  
  // Get all available outcomes (existing + custom)
  const allOutcomes = [
    ...existingOutcomes, 
    ...(outcomesData?.customOutcomes || [])
  ];
  
  // Check if we can add more outcomes
  const canAddMoreOutcomes = selectedOutcomeIds.length < 5;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Outcomes to Track</DialogTitle>
          <DialogDescription>
            Choose up to 5 outcomes to track in your project. You can select from existing outcomes or create custom ones.
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingOutcomes ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                Selected: {selectedOutcomeIds.length}/5
              </div>
              {!isAddingOutcome && canAddMoreOutcomes && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAddingOutcome(true)}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add Custom</span>
                </Button>
              )}
            </div>
            
            {isAddingOutcome && (
              <div className="mb-4 p-3 border rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Add Custom Outcome</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsAddingOutcome(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="customOutcome">Outcome Title</Label>
                    <Input
                      id="customOutcome"
                      value={newOutcomeTitle}
                      onChange={(e) => setNewOutcomeTitle(e.target.value)}
                      placeholder="E.g., Increase customer satisfaction"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={handleCreateOutcome}
                      disabled={createOutcomeMutation.isPending}
                    >
                      {createOutcomeMutation.isPending ? "Creating..." : "Create & Select"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <ScrollArea className="max-h-[300px] overflow-y-auto pr-3">
              <div className="space-y-2">
                {allOutcomes.map((outcome) => (
                  <div key={outcome.id} className="flex items-start space-x-2 py-1">
                    <Checkbox
                      id={`outcome-${outcome.id}`}
                      checked={selectedOutcomeIds.includes(outcome.id)}
                      onCheckedChange={() => handleOutcomeSelect(outcome.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`outcome-${outcome.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {outcome.title}
                      </label>
                      {outcome.level === "custom" && (
                        <p className="text-xs text-muted-foreground">Custom outcome</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {allOutcomes.length === 0 && (
                  <div className="py-4 text-center text-muted-foreground">
                    <Info className="h-5 w-5 mx-auto mb-2" />
                    <p>No outcomes available. Create a custom outcome to get started.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateOutcomesMutation.isPending || selectedOutcomeIds.length === 0}
          >
            {updateOutcomesMutation.isPending ? "Saving..." : "Save Selections"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}