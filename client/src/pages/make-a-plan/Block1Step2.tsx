import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlan } from "@/contexts/PlanContext";
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { ArrowLeft, ChevronRight, Plus, X, Save } from "lucide-react";

export default function Block1Step2() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();
  
  // Input ref for returning focus after adding
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local state for new heuristic
  const [newHeuristic, setNewHeuristic] = useState("");
  
  // Local state for heuristics list
  const [heuristics, setHeuristics] = useState<string[]>([]);
  
  // Initialize local state from plan data
  useEffect(() => {
    if (plan?.blocks?.block1?.personalHeuristics) {
      setHeuristics(plan.blocks.block1.personalHeuristics);
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
    
    // Add to local state
    const updatedHeuristics = [...heuristics, trimmedHeuristic];
    setHeuristics(updatedHeuristics);
    
    // Save to PlanContext
    saveBlock('block1', {
      personalHeuristics: updatedHeuristics,
      lastUpdated: new Date().toISOString(),
    });
    
    // Clear input and return focus
    setNewHeuristic("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    toast({
      title: "Heuristic added",
      description: "Your custom heuristic has been added."
    });
  };
  
  // Handle removing a heuristic
  const handleRemoveHeuristic = (index: number) => {
    const updatedHeuristics = heuristics.filter((_, i) => i !== index);
    
    // Update local state
    setHeuristics(updatedHeuristics);
    
    // Save to PlanContext
    saveBlock('block1', {
      personalHeuristics: updatedHeuristics,
      lastUpdated: new Date().toISOString(),
    });
    
    toast({
      title: "Heuristic removed",
      description: "Your custom heuristic has been removed."
    });
  };
  
  // Handle save button click
  const handleSave = () => {
    saveBlock('block1', {
      personalHeuristics: heuristics,
      lastUpdated: new Date().toISOString(),
    });
    
    toast({
      title: "Heuristics saved",
      description: "Your custom heuristics have been saved successfully."
    });
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
                          <span>{heuristic}</span>
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