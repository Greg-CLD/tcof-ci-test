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
import { useResonanceRatings, type EvaluationInput } from "@/hooks/useResonanceRatings";

export default function Block1Step1() {
  console.log('🔥 Block1Step1 v2 loaded 🔥');
  
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();
  
  // Use our new hooks
  const { successFactors, isLoading: factorsLoading } = useSuccessFactors();
  const { 
    ratings: evaluations, 
    isLoading: evaluationsLoading, 
    updateRatings: updateEvaluations,
    updateSingleRating: updateSingleEvaluation,
    isSaving
  } = useResonanceRatings(projectId);
  
  // Local state for evaluations (merges DB evaluations with local changes)
  const [localEvaluations, setLocalEvaluations] = useState<{[key: string]: number}>({});
  
  // Initialize local state from DB evaluations
  useEffect(() => {
    if (evaluations && evaluations.length > 0) {
      const evaluationMap: {[key: string]: number} = {};
      evaluations.forEach(evaluation => {
        if (evaluation && evaluation.factorId && evaluation.resonance !== undefined) {
          evaluationMap[evaluation.factorId] = evaluation.resonance;
        }
      });
      setLocalEvaluations(evaluationMap);
    }
  }, [evaluations]);
  
  // Initialize from plan context as fallback
  useEffect(() => {
    if (plan?.blocks?.block1?.successFactorRatings && Object.keys(localEvaluations).length === 0) {
      const planEvaluations = plan.blocks.block1.successFactorRatings;
      const convertedEvaluations: {[key: string]: number} = {};
      
      // Convert string evaluations to numbers
      Object.keys(planEvaluations).forEach(factorId => {
        const evaluation = parseInt(planEvaluations[factorId]);
        if (!isNaN(evaluation) && evaluation >= 1 && evaluation <= 5) {
          convertedEvaluations[factorId] = evaluation;
        }
      });
      
      setLocalEvaluations(convertedEvaluations);
    }
  }, [plan, localEvaluations]);
  
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
  
  // Handle evaluation change
  const handleEvaluationChange = async (factorId: string, evaluationValue: string) => {
    const numericEvaluation = parseInt(evaluationValue);
    
    // Update local state for immediate UI feedback
    setLocalEvaluations(prev => ({
      ...prev,
      [factorId]: numericEvaluation
    }));
    
    // Save to PlanContext
    saveBlock('block1', {
      successFactorRatings: {
        ...plan?.blocks?.block1?.successFactorRatings,
        [factorId]: evaluationValue
      },
      lastUpdated: new Date().toISOString(),
    });
    
    // Save to database
    try {
      await updateSingleEvaluation({
        factorId,
        resonance: numericEvaluation
      });
    } catch (error) {
      console.error("Error saving evaluation to database:", error);
      // UI already updated from local state, so no need to show error toast
      // as it's saved in context
    }
  };
  
  // Handle save button click
  const handleSave = async () => {
    // Format local evaluations for the API, filtering out any invalid values
    const evaluationInputs: EvaluationInput[] = Object.entries(localEvaluations)
      .filter(([factorId, resonance]) => {
        // Filter out entries with missing factorId or undefined/invalid resonance
        if (!factorId || resonance === undefined || resonance === null) {
          console.warn(`Skipping invalid evaluation: factorId=${factorId}, resonance=${resonance}`);
          return false;
        }
        // Ensure resonance is a valid number between 1-5
        const resonanceNum = typeof resonance === 'number' ? resonance : parseInt(resonance as unknown as string);
        if (isNaN(resonanceNum) || resonanceNum < 1 || resonanceNum > 5) {
          console.warn(`Skipping out-of-range resonance value: ${resonance}`);
          return false;
        }
        return true;
      })
      .map(([factorId, resonance]) => ({
        factorId,
        resonance
      }));
    
    // Save to PlanContext (only valid evaluations)
    const validEvaluations = Object.fromEntries(
      Object.entries(localEvaluations).filter(([_, resonance]) => 
        resonance !== undefined && resonance !== null && 
        (typeof resonance === 'number' ? resonance >= 1 && resonance <= 5 : 
          !isNaN(parseInt(resonance as unknown as string)))
      )
    );
    
    saveBlock('block1', {
      successFactorRatings: validEvaluations,
      lastUpdated: new Date().toISOString(),
    });
    
    // Save to database
    try {
      if (evaluationInputs.length === 0) {
        toast({
          title: "No evaluations to save",
          description: "There are no valid evaluations to save to the server.",
          variant: "destructive"
        });
        return;
      }
      
      await updateEvaluations(evaluationInputs);
      
      toast({
        title: "Evaluations saved",
        description: "Your success factor evaluations have been saved successfully."
      });
    } catch (error) {
      console.error("Error saving evaluations to database:", error);
      toast({
        title: "Error saving evaluations",
        description: "There was an error saving your evaluations to the database. Your changes have been saved locally.",
        variant: "destructive"
      });
    }
  };
  
  // Calculate completion percentage
  const calculateCompletionPercentage = () => {
    if (!successFactors || successFactors.length === 0) return 0;
    
    const evaluatedCount = Object.keys(localEvaluations).length;
    return Math.round((evaluatedCount / successFactors.length) * 100);
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
              <h1 className="text-3xl font-bold text-tcof-dark">Block 1: Evaluate Success Factors</h1>
              <p className="text-gray-600 mt-1">Evaluate how strongly each success factor resonates with your project</p>
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
              <h2 className="text-xl font-semibold mb-4">Evaluate TCOF Success Factors</h2>
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
                      Your evaluations are automatically saved as you make selections.
                      Evaluate all 12 factors for the best results.
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
                    <TableCaption>TCOF success factors resonance evaluation</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[400px]">Success Factor</TableHead>
                        <TableHead>Resonance Evaluation</TableHead>
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
                              value={localEvaluations[factor.id]?.toString() || ""}
                              onValueChange={(value) => handleEvaluationChange(factor.id, value)}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-5">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="1" id={`evaluation-1-${factor.id}`} />
                                  <Label htmlFor={`evaluation-1-${factor.id}`}>1</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="2" id={`evaluation-2-${factor.id}`} />
                                  <Label htmlFor={`evaluation-2-${factor.id}`}>2</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="3" id={`evaluation-3-${factor.id}`} />
                                  <Label htmlFor={`evaluation-3-${factor.id}`}>3</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="4" id={`evaluation-4-${factor.id}`} />
                                  <Label htmlFor={`evaluation-4-${factor.id}`}>4</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="5" id={`evaluation-5-${factor.id}`} />
                                  <Label htmlFor={`evaluation-5-${factor.id}`}>5</Label>
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
                    <Save className="mr-2 h-4 w-4" /> Save Evaluations
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