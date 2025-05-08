import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { ArrowLeft, ChevronRight, Info, Save } from "lucide-react";
import { useSuccessFactors } from "@/hooks/useSuccessFactors";
import { useResonanceRatings, type RatingInput } from "@/hooks/useResonanceRatings";

export default function Block1Step1() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();
  
  // Use our new hooks
  const { successFactors, isLoading: factorsLoading } = useSuccessFactors();
  const { 
    ratings, 
    isLoading: ratingsLoading, 
    updateRatings,
    updateSingleRating,
    isSaving
  } = useResonanceRatings(projectId);
  
  // Local state for ratings (merges DB ratings with local changes)
  const [localRatings, setLocalRatings] = useState<{[key: string]: number}>({});
  
  // Initialize local state from DB ratings
  useEffect(() => {
    if (ratings.length > 0) {
      const ratingMap: {[key: string]: number} = {};
      ratings.forEach(rating => {
        ratingMap[rating.factorId] = rating.resonance;
      });
      setLocalRatings(ratingMap);
    }
  }, [ratings]);
  
  // Initialize from plan context as fallback
  useEffect(() => {
    if (plan?.blocks?.block1?.successFactorRatings && Object.keys(localRatings).length === 0) {
      const planRatings = plan.blocks.block1.successFactorRatings;
      const convertedRatings: {[key: string]: number} = {};
      
      // Convert string ratings to numbers
      Object.keys(planRatings).forEach(factorId => {
        const rating = parseInt(planRatings[factorId]);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
          convertedRatings[factorId] = rating;
        }
      });
      
      setLocalRatings(convertedRatings);
    }
  }, [plan, localRatings]);
  
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
  const handleRatingChange = async (factorId: string, ratingValue: string) => {
    const numericRating = parseInt(ratingValue);
    
    // Update local state for immediate UI feedback
    setLocalRatings(prev => ({
      ...prev,
      [factorId]: numericRating
    }));
    
    // Save to PlanContext
    saveBlock('block1', {
      successFactorRatings: {
        ...plan?.blocks?.block1?.successFactorRatings,
        [factorId]: ratingValue
      },
      lastUpdated: new Date().toISOString(),
    });
    
    // Save to database
    try {
      await updateSingleRating({
        factorId,
        resonance: numericRating
      });
    } catch (error) {
      console.error("Error saving rating to database:", error);
      // UI already updated from local state, so no need to show error toast
      // as it's saved in context
    }
  };
  
  // Handle save button click
  const handleSave = async () => {
    // Format local ratings for the API
    const ratingInputs: RatingInput[] = Object.entries(localRatings).map(([factorId, resonance]) => ({
      factorId,
      resonance
    }));
    
    // Save to PlanContext
    saveBlock('block1', {
      successFactorRatings: localRatings,
      lastUpdated: new Date().toISOString(),
    });
    
    // Save to database
    try {
      await updateRatings(ratingInputs);
      
      toast({
        title: "Ratings saved",
        description: "Your success factor ratings have been saved successfully."
      });
    } catch (error) {
      console.error("Error saving ratings to database:", error);
      toast({
        title: "Error saving ratings",
        description: "There was an error saving your ratings to the database. Your changes have been saved locally.",
        variant: "destructive"
      });
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (!successFactors || successFactors.length === 0) return 0;
    
    const ratedCount = Object.keys(localRatings).length;
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
                      {successFactors.map((factor) => (
                        <TableRow key={factor.id}>
                          <TableCell className="py-4">
                            <div>
                              <h3 className="font-medium text-tcof-dark">{factor.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {factor.description && factor.description.length > 100 
                                  ? `${factor.description.substring(0, 100)}...` 
                                  : factor.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RadioGroup
                              value={localRatings[factor.id]?.toString() || ""}
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