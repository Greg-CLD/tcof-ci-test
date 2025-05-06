import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Heuristic {
  id: string;
  organisationId: string;
  successFactor: string;
  goal?: string | null;
  metric?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HeuristicsEditorProps {
  defaults: Heuristic[];
  onSave: (updated: Heuristic[]) => void;
  onCancel?: () => void;
}

// Use a utility function to generate an ID for new heuristics
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function HeuristicsEditor({ defaults = [], onSave, onCancel }: HeuristicsEditorProps) {
  // Store the current state of heuristics being edited
  const [heuristics, setHeuristics] = useState<Heuristic[]>(
    defaults.length > 0 ? 
    defaults : 
    [] // Empty array if no defaults provided
  );
  
  // Store the available success factors from the database
  const [availableFactors, setAvailableFactors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load success factors from the database
  const { data: successFactors, isLoading: factorsLoading } = useQuery({
    queryKey: ["/api/successFactors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/successFactors");
      if (!res.ok) {
        throw new Error("Failed to load success factors");
      }
      return res.json();
    }
  });
  
  // When success factors load, extract just the titles for the dropdown
  useEffect(() => {
    if (successFactors) {
      // Extract unique factor titles
      const factors = successFactors.map((factor: any) => factor.title);
      setAvailableFactors(factors);
    }
  }, [successFactors]);
  
  // Initialize with defaults when they change
  useEffect(() => {
    if (defaults.length > 0) {
      setHeuristics(defaults);
    }
  }, [defaults]);
  
  // Handle adding a new heuristic
  const handleAddHeuristic = () => {
    // Create a new heuristic with a placeholder success factor
    const newHeuristic: Heuristic = {
      id: generateId(),
      organisationId: defaults[0]?.organisationId || "", // Keep the same organisation ID
      successFactor: availableFactors[0] || "Select a success factor",
      goal: null,
      metric: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setHeuristics(prev => [...prev, newHeuristic]);
  };
  
  // Handle removing a heuristic
  const handleRemoveHeuristic = (id: string) => {
    setHeuristics(prev => prev.filter(h => h.id !== id));
  };
  
  // Handle heuristic field changes
  const handleHeuristicChange = (id: string, field: keyof Heuristic, value: string) => {
    setHeuristics(prev => 
      prev.map(h => 
        h.id === id 
          ? { ...h, [field]: value, updatedAt: new Date().toISOString() } 
          : h
      )
    );
  };
  
  // Handle save button click
  const handleSave = () => {
    setIsLoading(true);
    // Filter out incomplete heuristics (those without a success factor)
    const validHeuristics = heuristics.filter(
      h => h.successFactor && h.successFactor !== "Select a success factor"
    );
    
    onSave(validHeuristics);
    setIsLoading(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-tcof-dark">Edit Success Factors</h2>
        <div className="space-x-2">
          {onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={isLoading || heuristics.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
      
      {factorsLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-tcof-teal" />
        </div>
      ) : (
        <div className="space-y-4">
          {heuristics.map((heuristic) => (
            <Card key={heuristic.id} className="relative">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`successFactor-${heuristic.id}`}>Success Factor</Label>
                    <Select
                      value={heuristic.successFactor}
                      onValueChange={(value) => handleHeuristicChange(heuristic.id, 'successFactor', value)}
                    >
                      <SelectTrigger id={`successFactor-${heuristic.id}`}>
                        <SelectValue placeholder="Select a success factor" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFactors.map((factor) => (
                          <SelectItem key={factor} value={factor}>
                            {factor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`goal-${heuristic.id}`}>Goal</Label>
                    <Input
                      id={`goal-${heuristic.id}`}
                      value={heuristic.goal || ''}
                      onChange={(e) => handleHeuristicChange(heuristic.id, 'goal', e.target.value)}
                      placeholder="Enter a goal for this success factor"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`metric-${heuristic.id}`}>Metric</Label>
                    <Textarea
                      id={`metric-${heuristic.id}`}
                      value={heuristic.metric || ''}
                      onChange={(e) => handleHeuristicChange(heuristic.id, 'metric', e.target.value)}
                      placeholder="Enter measurement criteria for this success factor"
                      rows={2}
                    />
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-500"
                  onClick={() => handleRemoveHeuristic(heuristic.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          <Button 
            variant="outline" 
            className="w-full py-6 border-dashed"
            onClick={handleAddHeuristic}
            disabled={false} // Remove the disabled condition to always enable the button
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Success Factor
          </Button>
        </div>
      )}
    </div>
  );
}