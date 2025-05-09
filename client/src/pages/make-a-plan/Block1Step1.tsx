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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlan } from "@/contexts/PlanContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProjectBanner from "@/components/ProjectBanner";
import { ArrowLeft, ChevronRight, Info, Save } from "lucide-react";
import { useSuccessFactors } from "@/hooks/useSuccessFactors";
import { useResonanceRatings } from "@/hooks/useResonanceRatings";

// Define the EvaluationInput interface locally if it's not exported from the hook
interface EvaluationInput {
  factorId: string;
  resonance: number;
  notes?: string;
}

// Define the success factor resonance options with improved descriptions
const RESONANCE_OPTIONS = [
  { 
    value: "1", 
    symbol: '❌', 
    label: "Doesn't Resonate", 
    desc: "This factor doesn't seem relevant to my project context."
  },
  { 
    value: "2", 
    symbol: '🤔', 
    label: "Slightly Familiar", 
    desc: "I recognize this, but haven't seen much evidence of its importance." 
  },
  { 
    value: "3", 
    symbol: '🟡', 
    label: "Moderately Important", 
    desc: "This seems valuable and I should consider it." 
  },
  { 
    value: "4", 
    symbol: '✅', 
    label: "Very Important", 
    desc: "I've experienced this and know it's valuable for success." 
  },
  { 
    value: "5", 
    symbol: '🔥', 
    label: "Critical Factor", 
    desc: "This is absolutely essential to my project's success." 
  },
];

export default function Block1Step1() {
  console.log('🔥 Block1Step1 v2 loaded 🔥');

  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { plan, saveBlock } = usePlan();
  const { toast } = useToast();

  console.log('🧩 Block1Step1 component - projectId:', projectId, 'planState:', plan?.blocks?.block1 ? 'present' : 'missing');

  // Use our new hooks
  const { successFactors, isLoading: factorsLoading } = useSuccessFactors();
  const { 
    ratings: evaluations, 
    isLoading: evaluationsLoading, 
    updateRatings: updateEvaluations,
    updateSingleRating: updateSingleEvaluation,
    isSaving
  } = useResonanceRatings(projectId);

  console.log('🧩 Hook state - success factors:', successFactors?.length, 'evaluations:', evaluations?.length, 'loading:', factorsLoading, evaluationsLoading);

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
        const value = planEvaluations[factorId];
        const evaluation = typeof value === 'string' ? parseInt(value) : value;
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

    console.log(`🧪 handleEvaluationChange - factorId: ${factorId}, value: ${evaluationValue}, numeric: ${numericEvaluation}`);

    // Update local state for immediate UI feedback
    setLocalEvaluations(prev => {
      const newState = {
        ...prev,
        [factorId]: numericEvaluation
      };
      console.log('🧪 localEvaluations update - before:', prev, 'after:', newState);
      return newState;
    });

    // Save to PlanContext
    const updatedRatings = {
      ...plan?.blocks?.block1?.successFactorRatings,
      [factorId]: evaluationValue
    };
    console.log('🧪 saveBlock updatedRatings:', updatedRatings);

    saveBlock('block1', {
      successFactorRatings: updatedRatings,
      lastUpdated: new Date().toISOString(),
    });

    // Save to database
    try {
      console.log('🧪 Calling updateSingleEvaluation API with:', { factorId, resonance: numericEvaluation });

      await updateSingleEvaluation({
        factorId,
        resonance: numericEvaluation
      });

      console.log('🧪 updateSingleEvaluation API call successful');
    } catch (error) {
      console.error("🔴 Error saving evaluation to database:", error);
      // UI already updated from local state, so no need to show error toast
      // as it's saved in context
    }
  };

  // Handle save button click
  const handleSave = async () => {
    console.log('🧪 handleSave - starting batch save operation');
    console.log('🧪 handleSave - Current plan ID:', plan?.id || 'null');
    console.log('🧪 localEvaluations raw state:', localEvaluations);

    // If no plan ID exists, this may be our first save
    if (!plan?.id) {
      console.info(`[SAVE] Block1Step1.handleSave - No plan ID detected, ensuring plan exists`);

      try {
        // Create a minimal plan to ensure we have an ID
        const response = await apiRequest(
          "POST", 
          "/api/plans", 
          { 
            projectId, 
            blocks: {
              block1: {
                successFactorRatings: localEvaluations
              }
            }
          }
        );

        if (!response.ok) {
          console.error(`[SAVE] Block1Step1.handleSave - Failed to create plan: ${response.status} ${response.statusText}`);
        } else {
          const result = await response.json();
          console.info(`[SAVE] Block1Step1.handleSave - Created new plan with ID: ${result.id}`);
        }
      } catch (error) {
        console.error(`[SAVE] Block1Step1.handleSave - Error creating plan:`, error);
      }
    }

    // Format local evaluations for the API, filtering out any invalid values
    const evaluationInputs: EvaluationInput[] = Object.entries(localEvaluations)
      .filter(([factorId, resonance]) => {
        // Filter out entries with missing factorId or undefined/invalid resonance
        if (!factorId || resonance === undefined || resonance === null) {
          console.warn(`🔸 Skipping invalid evaluation: factorId=${factorId}, resonance=${resonance}`);
          return false;
        }
        // Ensure resonance is a valid number between 1-5
        const resonanceNum = typeof resonance === 'number' ? resonance : parseInt(resonance as unknown as string);
        if (isNaN(resonanceNum) || resonanceNum < 1 || resonanceNum > 5) {
          console.warn(`🔸 Skipping out-of-range resonance value: ${resonance}`);
          return false;
        }
        return true;
      })
      .map(([factorId, resonance]) => ({
        factorId,
        resonance
      }));

    console.log('🧪 evaluationInputs prepared for API:', evaluationInputs);

    // Save to PlanContext (only valid evaluations)
    const validEvaluations = Object.fromEntries(
      Object.entries(localEvaluations).filter(([_, resonance]) => 
        resonance !== undefined && resonance !== null && 
        (typeof resonance === 'number' ? resonance >= 1 && resonance <= 5 : 
          !isNaN(parseInt(resonance as unknown as string)))
      )
    );

    console.log('🧪 validEvaluations for PlanContext:', validEvaluations);

    saveBlock('block1', {
      successFactorRatings: validEvaluations,
      lastUpdated: new Date().toISOString(),
    });

    // Save to database
    try {
      if (evaluationInputs.length === 0) {
        console.warn('🔶 No valid evaluations to save');
        toast({
          title: "No evaluations to save",
          description: "There are no valid evaluations to save to the server.",
          variant: "destructive"
        });
        return;
      }

      console.log('🧪 Calling updateEvaluations API with:', evaluationInputs.length, 'evaluations');
      console.log('🧪 First few evaluations:', evaluationInputs.slice(0, 3));
      await updateEvaluations(evaluationInputs);
      console.log('🧪 updateEvaluations API call successful');

      toast({
        title: "Evaluations saved",
        description: "Your success factor evaluations have been saved successfully."
      });
    } catch (error) {
      console.error("🔴 Error saving evaluations to database:", error);
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
            <div className="mt-4 sm:mt-0 bg-tcof-light rounded-lg px-4 py-3 flex items-center">
              <div className="flex flex-col mr-3">
                <span className="text-sm font-medium text-tcof-dark mb-1">
                  Factors Evaluated: {Object.keys(localEvaluations).length}/{successFactors?.length || 12}
                </span>
                <div className="w-32 bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ease-out ${
                      completionPercentage >= 100 
                        ? 'bg-green-500' 
                        : completionPercentage >= 50 
                          ? 'bg-tcof-teal' 
                          : 'bg-tcof-light'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm font-medium text-tcof-dark flex flex-col items-center justify-center bg-white rounded-full w-12 h-12 border-2 border-tcof-teal">
                <span>{completionPercentage}%</span>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Evaluate TCOF Success Factors</h2>
              <p className="text-gray-600 mb-6">
                For each success factor, evaluate how strongly it resonates with your specific project context.
                Your evaluations will help prioritize and customize tasks in your project plan.
                Click on the emoji circles below to indicate importance levels.
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
                    <TableCaption>TCOF Success Factors Evaluation</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[400px]">Success Factor</TableHead>
                        <TableHead>Importance Evaluation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {successFactors.map((factor) => (
                        <TableRow key={factor.factorId}>
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
                            <div className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                {RESONANCE_OPTIONS.map((option) => {
                                  const isSelected = localEvaluations[factor.factorId]?.toString() === option.value;
                                  return (
                                    <TooltipProvider key={option.value}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => handleEvaluationChange(factor.factorId, option.value)}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                                              isSelected 
                                                ? 'bg-tcof-teal text-white ring-2 ring-tcof-dark shadow-lg transform scale-110' 
                                                : `bg-gray-100 hover:bg-gray-200 hover:shadow ${
                                                    option.value === "1" ? "hover:bg-red-50" :
                                                    option.value === "2" ? "hover:bg-orange-50" :
                                                    option.value === "3" ? "hover:bg-yellow-50" :
                                                    option.value === "4" ? "hover:bg-green-50" :
                                                    "hover:bg-tcof-light"
                                                  }`
                                            }`}
                                            aria-label={`Rate as ${option.label}`}
                                          >
                                            <span className="text-xl">{option.symbol}</span>
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs bg-white border border-gray-200 shadow-lg rounded-lg p-3">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{option.symbol}</span>
                                            <span className="font-bold text-tcof-dark">{option.label}</span>
                                          </div>
                                          <p className="text-sm text-gray-600">{option.desc}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 w-full px-1">
                                <span>Not relevant</span>
                                <span>Critical factor</span>
                              </div>
                            </div>
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