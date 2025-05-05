import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BellRing, ChevronDown, ChevronUp, Clock, Save } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { type Outcome } from "./OutcomeSelectorModal";

export interface OutcomeProgress {
  id: string;
  outcomeId: string;
  projectId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

interface OutcomeProgressTrackerProps {
  projectId: string;
  outcomes: Outcome[];
  outcomeProgress: OutcomeProgress[];
  onSelectOutcomes: () => void;
}

export function OutcomeProgressTracker({ 
  projectId,
  outcomes,
  outcomeProgress,
  onSelectOutcomes
}: OutcomeProgressTrackerProps) {
  const { toast } = useToast();
  const [progressValues, setProgressValues] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(true);
  
  // Create a mutation for saving outcome progress
  const saveProgressMutation = useMutation({
    mutationFn: async ({ outcomeId, value }: { outcomeId: string; value: number }) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/projects/${projectId}/outcomes/${outcomeId}`, 
        { value }
      );
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh progress data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/outcomes/progress`] });
      
      // Update the local state with the server response
      setProgressValues(prev => ({
        ...prev,
        [data.outcomeId]: data.value
      }));
      
      setLastUpdate(prev => ({
        ...prev,
        [data.outcomeId]: data.updatedAt
      }));
      
      toast({
        title: "Progress saved",
        description: "Your outcome progress has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save progress",
        description: error.message || "An error occurred while saving progress.",
        variant: "destructive",
      });
    }
  });
  
  // Initialize progress values from the latest progress data
  useEffect(() => {
    const values: Record<string, number> = {};
    const updates: Record<string, string> = {};
    
    // Group progress by outcomeId and get the latest entry for each
    const latestProgressByOutcome = outcomeProgress.reduce((acc, progress) => {
      if (!acc[progress.outcomeId] || new Date(progress.updatedAt) > new Date(acc[progress.outcomeId].updatedAt)) {
        acc[progress.outcomeId] = progress;
      }
      return acc;
    }, {} as Record<string, OutcomeProgress>);
    
    // Set the values and last update timestamps
    Object.values(latestProgressByOutcome).forEach(progress => {
      values[progress.outcomeId] = progress.value;
      updates[progress.outcomeId] = progress.updatedAt;
    });
    
    setProgressValues(values);
    setLastUpdate(updates);
  }, [outcomeProgress]);
  
  // Handle slider change
  const handleSliderChange = (outcomeId: string, value: number[]) => {
    setProgressValues(prev => ({
      ...prev,
      [outcomeId]: value[0]
    }));
  };
  
  // Save progress for a specific outcome
  const handleSaveProgress = (outcomeId: string) => {
    saveProgressMutation.mutate({
      outcomeId,
      value: progressValues[outcomeId] || 0
    });
  };
  
  // Format the last update timestamp
  const formatLastUpdate = (timestamp: string) => {
    if (!timestamp) return "Not tracked yet";
    
    try {
      return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Outcome Progress</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>
            Track progress towards your selected outcomes.
          </CardDescription>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-2">
            {outcomes.length === 0 ? (
              <div className="py-8 text-center">
                <BellRing className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No outcomes selected</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Select up to 5 outcomes to track your project's progress.
                </p>
                <Button onClick={onSelectOutcomes}>Select Outcomes</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {outcomes.map((outcome) => (
                  <div key={outcome.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{outcome.title}</h4>
                      <span className="text-sm font-medium">
                        {progressValues[outcome.id] ?? 0}%
                      </span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <Slider
                          defaultValue={[progressValues[outcome.id] ?? 0]}
                          max={100}
                          step={5}
                          value={[progressValues[outcome.id] ?? 0]}
                          onValueChange={(value) => handleSliderChange(outcome.id, value)}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleSaveProgress(outcome.id)}
                        disabled={saveProgressMutation.isPending && 
                          saveProgressMutation.variables?.outcomeId === outcome.id}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                    {lastUpdate[outcome.id] && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Last updated: {formatLastUpdate(lastUpdate[outcome.id])}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {outcomes.length > 0 && (
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" onClick={onSelectOutcomes}>
                Manage Outcomes
              </Button>
              <div className="text-sm text-muted-foreground">
                {outcomes.length}/5 outcomes selected
              </div>
            </CardFooter>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}