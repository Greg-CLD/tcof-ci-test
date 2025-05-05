import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Info, Plus, Search } from "lucide-react";
import { useOutcomes } from "@/hooks/useOutcomes";

export interface Outcome {
  id: string;
  title: string;
  level: string;
  description?: string;
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
  existingOutcomes = []
}: OutcomeSelectorModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [newOutcomeTitle, setNewOutcomeTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "custom">("select");
  const MAX_OUTCOMES = 5;
  
  const {
    selectedOutcomeIds,
    customOutcomes,
    selectOutcomes,
    createOutcome,
    isSelectingOutcomes,
    isCreatingOutcome
  } = useOutcomes({ projectId });
  
  // Initialize selected IDs from existing selection
  useEffect(() => {
    if (selectedOutcomeIds) {
      setSelectedIds(selectedOutcomeIds);
    }
  }, [selectedOutcomeIds]);
  
  // All available outcomes (standard + custom)
  const allOutcomes = [...existingOutcomes, ...customOutcomes];
  
  // Filter outcomes based on search query
  const filteredOutcomes = allOutcomes.filter(outcome => 
    outcome.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Check if an outcome is selected
  const isSelected = (id: string) => selectedIds.includes(id);
  
  // Handle outcome selection
  const handleOutcomeToggle = (id: string) => {
    if (isSelected(id)) {
      // Remove from selection
      setSelectedIds(prev => prev.filter(outId => outId !== id));
    } else {
      // Add to selection if under the limit
      if (selectedIds.length < MAX_OUTCOMES) {
        setSelectedIds(prev => [...prev, id]);
      } else {
        // Show toast if limit reached
        toast({
          title: "Maximum outcomes reached",
          description: `You can select up to ${MAX_OUTCOMES} outcomes to track.`,
        });
      }
    }
  };
  
  // Handle create custom outcome
  const handleCreateOutcome = () => {
    if (!newOutcomeTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your custom outcome.",
        variant: "destructive",
      });
      return;
    }
    
    createOutcome(newOutcomeTitle.trim());
    setNewOutcomeTitle("");
    setStep("select");
  };
  
  // Handle save selections
  const handleSaveSelections = () => {
    selectOutcomes(selectedIds);
    onClose();
  };
  
  // Calculate remaining slots
  const remainingSlots = MAX_OUTCOMES - selectedIds.length;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Select Project Outcomes" : "Create Custom Outcome"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? `Choose up to ${MAX_OUTCOMES} outcomes to track for your project.` 
              : "Create a custom outcome to track progress specific to your project."}
          </DialogDescription>
        </DialogHeader>
        
        {step === "select" ? (
          <>
            <div className="flex items-center space-x-2 mb-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search outcomes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <Badge variant={remainingSlots > 0 ? "outline" : "destructive"}>
                {selectedIds.length}/{MAX_OUTCOMES} selected
              </Badge>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep("custom")}
                className="flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Custom</span>
              </Button>
            </div>
            
            <div className="space-y-1 my-4 max-h-[50vh] overflow-y-auto pr-2">
              {filteredOutcomes.length > 0 ? (
                filteredOutcomes.map((outcome) => (
                  <div 
                    key={outcome.id} 
                    className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`outcome-${outcome.id}`}
                                  checked={isSelected(outcome.id)}
                                  onCheckedChange={() => handleOutcomeToggle(outcome.id)}
                                  disabled={!isSelected(outcome.id) && selectedIds.length >= MAX_OUTCOMES}
                                />
                                <div>
                                  <label
                                    htmlFor={`outcome-${outcome.id}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {outcome.title}
                                  </label>
                                  {outcome.level === 'custom' && (
                                    <Badge variant="outline" className="ml-2 text-xs">Custom</Badge>
                                  )}
                                </div>
                              </div>
                              {outcome.description && (
                                <Info className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        {outcome.description && (
                          <TooltipContent>
                            <p className="max-w-xs">{outcome.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {searchQuery 
                    ? "No outcomes found matching your search." 
                    : "No outcomes available."}
                </div>
              )}
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSelections}
                disabled={isSelectingOutcomes}
              >
                Save Selection
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label htmlFor="outcome-title" className="text-sm font-medium">
                  Outcome Title
                </label>
                <Input
                  id="outcome-title"
                  placeholder="Enter a title for your custom outcome"
                  value={newOutcomeTitle}
                  onChange={(e) => setNewOutcomeTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Custom outcomes help you track project-specific goals not covered by standard outcomes.
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                className="sm:order-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleCreateOutcome}
                disabled={!newOutcomeTitle.trim() || isCreatingOutcome}
                className="sm:order-2"
              >
                Create
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}