import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePlan } from "@/contexts/PlanContext";
import { useProgress } from "@/contexts/ProgressContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { ArrowLeft, ChevronRight, Info, Save } from "lucide-react";

export default function Block1Step1() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for ratings
  const [ratings, setRatings] = useState<{[key: string]: string}>({});
  
  // Fetch success factors data
  const {
    data: successFactors,
    isLoading: factorsLoading
  } = useQuery({
    queryKey: ['/api/success-factors'],
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
    if (plan?.blocks?.block1?.successFactorRatings) {
      setRatings(plan.blocks.block1.successFactorRatings);
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
  
  // Handle rating change
  const handleRatingChange = (factorId: string, rating: string) => {
    // Update local state
    setRatings(prev => ({
      ...prev,
      [factorId]: rating
    }));
    
    // Save to PlanContext
    saveBlock('block1', {
      successFactorRatings: {
        ...plan?.blocks?.block1?.successFactorRatings,
        [factorId]: rating
      },
      lastUpdated: new Date().toISOString(),
    });
  };
  
  // Handle save button click
  const handleSave = () => {
    saveBlock('block1', {
      successFactorRatings: ratings,
      lastUpdated: new Date().toISOString(),
    });
    
    toast({
      title: "Ratings saved",
      description: "Your success factor ratings have been saved successfully."
    });
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (!successFactors || successFactors.length === 0) return 0;
    
    const ratedCount = Object.keys(ratings).length;
    return Math.round((ratedCount / successFactors.length) * 100);
  };
  
  const completionPercentage = calculateCompletionPercentage();
  
  return (
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
              <h1 className="text-3xl font-bold text-tcof-dark">Block 1: Rate Success Factors</h1>
              <p className="text-gray-600 mt-1">Rate how strongly each success factor resonates with your project</p>
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
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Rate TCOF Success Factors</h2>
              <p className="text-gray-600 mb-6">
                For each success factor, indicate how strongly it resonates with your specific project.
                This will help prioritize tasks in your plan.
              </p>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Your ratings are automatically saved as you make selections.
                      Rate all 12 factors for the best results.
                    </p>
                  </div>
                </div>
              </div>
              
              {factorsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-tcof-teal border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableCaption>TCOF success factors resonance rating</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[400px]">Success Factor</TableHead>
                        <TableHead>Resonance Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {successFactors?.map((factor: { id: string; name: string; description: string }) => (
                        <TableRow key={factor.id}>
                          <TableCell className="py-4">
                            <div>
                              <h3 className="font-medium text-tcof-dark">{factor.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{factor.description.substring(0, 100)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RadioGroup
                              value={ratings[factor.id] || ""}
                              onValueChange={(value) => handleRatingChange(factor.id, value)}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-5">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="1" id={`rating-1-${factor.id}`} />
                                  <Label htmlFor={`rating-1-${factor.id}`}>1</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="2" id={`rating-2-${factor.id}`} />
                                  <Label htmlFor={`rating-2-${factor.id}`}>2</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="3" id={`rating-3-${factor.id}`} />
                                  <Label htmlFor={`rating-3-${factor.id}`}>3</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="4" id={`rating-4-${factor.id}`} />
                                  <Label htmlFor={`rating-4-${factor.id}`}>4</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="5" id={`rating-5-${factor.id}`} />
                                  <Label htmlFor={`rating-5-${factor.id}`}>5</Label>
                                </div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 w-full px-1 pt-1">
                                <span>Doesn't resonate</span>
                                <span>Strongly resonates</span>
                              </div>
                            </RadioGroup>
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
                  onClick={() => navigate(`/make-a-plan/${projectId}`)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSave}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save Ratings
                  </Button>
                  <Button
                    onClick={() => navigate(`/make-a-plan/${projectId}/block-1/step-2`)}
                    className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                    disabled={completionPercentage < 50}
                  >
                    Next: Personal Heuristics <ChevronRight className="ml-2 h-4 w-4" />
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