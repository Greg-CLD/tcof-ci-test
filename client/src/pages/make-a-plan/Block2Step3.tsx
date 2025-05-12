import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
// ProjectBanner removed - now only in AppLayout
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { usePlan } from "@/contexts/PlanContext";
import { apiRequest } from "@/lib/queryClient";
import { usePersonalHeuristics } from "@/hooks/usePersonalHeuristics";
import { useHeuristicLinks } from "@/hooks/useHeuristicLinks";

interface SuccessFactor {
  id: string;
  factor: string;
  description: string;
  category: string;
}

export default function Block2Step3() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan } = usePlan();
  const { toast } = useToast();
  
  // Get personal heuristics from Block 1
  const { data: personalHeuristics = [], isLoading: isLoadingHeuristics } = usePersonalHeuristics(projectId);
  
  // Get heuristic links and link management functions
  const { 
    updateHeuristicLink, 
    getFactorIdForHeuristic, 
    isLoading: isUpdatingLinks 
  } = useHeuristicLinks(projectId);
  
  // Fetch success factors
  const { data: successFactors = [], isLoading: isLoadingFactors } = useQuery<SuccessFactor[]>({
    queryKey: ["successFactors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/success-factors");
      if (!res.ok) {
        throw new Error("Failed to fetch success factors");
      }
      return res.json();
    }
  });
  
  // Check if Block 1 is completed
  const block1Completed = plan?.blocks?.block1?.completed;
  
  // If we don't have a project ID, show a message
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
  
  // If user directly navigates to this page without completing Block 1, suggest redirection
  if (!block1Completed) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Prerequisites Not Met</CardTitle>
            <CardDescription>
              You need to complete Block 1 before proceeding to this step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Block 1 needs to be completed to define personal heuristics for this step.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate(`/make-a-plan/${projectId}/block-1`)}>
              Go to Block 1
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Handle factor selection
  const handleFactorSelection = (heuristicId: string, factorId: string | null) => {
    updateHeuristicLink(heuristicId, factorId);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Banner */}
      {/* ProjectBanner removed - now only in AppLayout */}
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button 
          variant="outline" 
          onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Block 2
        </Button>
        
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col mb-6">
            <h1 className="text-3xl font-bold text-tcof-dark">
              Block 2: Step 3 - Heuristic Mapping
            </h1>
            <p className="text-gray-600 mt-1">
              Map your personal heuristics to success factors to inherit their tasks
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Map Heuristics to Success Factors</CardTitle>
              <CardDescription>
                For each heuristic you created in Block 1, select the most relevant TCOF Success Factor, 
                or choose "No Match" if it doesn't align with any factor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHeuristics || isLoadingFactors ? (
                <div className="text-center py-8">
                  <div className="spinner h-8 w-8 mx-auto mb-4 border-4 border-tcof-teal border-t-transparent rounded-full animate-spin"></div>
                  <p>Loading heuristics and success factors...</p>
                </div>
              ) : personalHeuristics.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-amber-50">
                  <p className="text-amber-800 font-medium">
                    Add at least one heuristic in Block 1 before linking.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/make-a-plan/${projectId}/block-1/step-2`)}
                    className="mt-4"
                  >
                    Add Heuristics
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {personalHeuristics.map((heuristic) => (
                    <div 
                      key={heuristic.id} 
                      className="p-4 border rounded-lg bg-white hover:border-tcof-teal transition-colors"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        <div className="lg:col-span-6">
                          <h3 className="font-medium text-tcof-dark mb-1">Your Heuristic:</h3>
                          <p className="text-gray-700">{heuristic.text}</p>
                        </div>
                        <div className="lg:col-span-6">
                          <h3 className="font-medium text-tcof-dark mb-1">Map to Success Factor:</h3>
                          <Select
                            value={getFactorIdForHeuristic(heuristic.id) || "null"}
                            onValueChange={(value) => handleFactorSelection(
                              heuristic.id, 
                              value === "null" ? null : value
                            )}
                            disabled={isUpdatingLinks}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a success factor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="null">No Match / Not Applicable</SelectItem>
                              {successFactors.map((factor) => (
                                <SelectItem key={factor.id} value={factor.id}>
                                  {factor.factor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-tcof-dark mb-2 flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-tcof-teal mr-2" />
                  Why This Matters
                </h3>
                <p className="text-gray-700 text-sm">
                  Heuristics that are mapped to a specific success factor will inherit that factor's tasks 
                  in later steps. This reduces duplication and ensures your project plan includes best 
                  practices from the TCOF framework.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}