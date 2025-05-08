import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/contexts/PlanContext";
import { useToolProgress } from "@/hooks/useToolProgress";
import MakeAPlanLayout from "@/layouts/MakeAPlanLayout";
import StepNavigation from "@/components/StepNavigation";

// Framework type definition
interface Framework {
  code: string;
  name: string;
  description: string;
}

// Available frameworks
const frameworks: Framework[] = [
  {
    code: "praxis",
    name: "Praxis Framework",
    description: "Integrated framework for project, program, and portfolio management",
  },
  { 
    code: "green_book", 
    name: "UK Government Green Book",
    description: "HM Treasury guidance on appraisal and evaluation of policies, programs and projects",
  },
  { 
    code: "agilepm", 
    name: "AgilePM",
    description: "Project management approach that incorporates agile principles",
  },
  { 
    code: "safe", 
    name: "SAFe (Scaled Agile Framework)",
    description: "Framework for implementing agile practices at enterprise scale",
  },
  { 
    code: "custom", 
    name: "Custom / Other",
    description: "Your organization's custom framework or another framework not listed",
  },
];

// Quadrant matrix for recommended frameworks
const quadrantRecommendations: Record<string, Record<string, string[]>> = {
  small: {
    clear: ["agilepm", "praxis"],
    fuzzy: ["agilepm", "custom"],
    unclear: ["agilepm", "custom"]
  },
  medium: {
    clear: ["praxis", "green_book"],
    fuzzy: ["agilepm", "praxis"],
    unclear: ["agilepm", "safe"]
  },
  large: {
    clear: ["praxis", "green_book", "safe"],
    fuzzy: ["safe", "praxis"],
    unclear: ["safe", "custom"]
  }
};

export default function Block3Step6() {
  const { projectId } = useParams<{ projectId?: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateToolProgress } = useToolProgress();
  const { plan, saveBlock } = usePlan();
  
  // State
  const [projectSize, setProjectSize] = useState<string>("medium");
  const [pathClarity, setPathClarity] = useState<string>("fuzzy");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing data
  const { data: projectFrameworks, isLoading: isLoadingFrameworks } = useQuery({
    queryKey: ["project-frameworks", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest("GET", `/api/projects/${projectId}/frameworks`);
      if (!res.ok) {
        if (res.status !== 404) {
          toast({
            title: "Error loading frameworks",
            description: "Could not load saved frameworks",
            variant: "destructive",
          });
        }
        return null;
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  // Save frameworks mutation
  const saveFrameworksMutation = useMutation({
    mutationFn: async ({ projectId, frameworks }: { projectId: string, frameworks: string[] }) => {
      const res = await apiRequest(
        "POST", 
        `/api/projects/${projectId}/frameworks`,
        { selectedFrameworkCodes: frameworks }
      );
      
      if (!res.ok) {
        throw new Error("Failed to save frameworks");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-frameworks", projectId] });
      toast({
        title: "Frameworks saved",
        description: "Your selected frameworks have been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving frameworks",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Load existing data
  useEffect(() => {
    if (projectFrameworks) {
      if (projectFrameworks.selectedFrameworkCodes) {
        setSelectedFrameworks(projectFrameworks.selectedFrameworkCodes);
      }
      if (projectFrameworks.projectSize) {
        setProjectSize(projectFrameworks.projectSize);
      }
      if (projectFrameworks.pathClarity) {
        setPathClarity(projectFrameworks.pathClarity);
      }
    }
  }, [projectFrameworks]);

  // Initialize from plan context as backup
  useEffect(() => {
    if (plan?.blocks?.block3?.frameworks) {
      if (!selectedFrameworks.length) {
        setSelectedFrameworks(plan.blocks.block3.frameworks.selectedFrameworkCodes || []);
      }
      if (plan.blocks.block3.frameworks.projectSize) {
        setProjectSize(plan.blocks.block3.frameworks.projectSize);
      }
      if (plan.blocks.block3.frameworks.pathClarity) {
        setPathClarity(plan.blocks.block3.frameworks.pathClarity);
      }
    }
  }, [plan, selectedFrameworks.length]);

  // Get recommended frameworks based on quadrant selection
  const getRecommendedFrameworks = (): string[] => {
    if (!projectSize || !pathClarity) return [];
    return quadrantRecommendations[projectSize]?.[pathClarity] || [];
  };

  // Check if a framework is recommended
  const isRecommended = (frameworkCode: string): boolean => {
    return getRecommendedFrameworks().includes(frameworkCode);
  };

  // Handle framework selection
  const handleFrameworkToggle = (frameworkCode: string) => {
    setSelectedFrameworks(prev => {
      if (prev.includes(frameworkCode)) {
        return prev.filter(code => code !== frameworkCode);
      } else {
        return [...prev, frameworkCode];
      }
    });
  };

  // Save selected frameworks
  const handleSaveFrameworks = async () => {
    if (!projectId) return;
    
    setIsSaving(true);
    try {
      // Save to the API
      await saveFrameworksMutation.mutateAsync({ 
        projectId, 
        frameworks: selectedFrameworks 
      });
      
      // Save to plan context for persistence between pages
      await saveBlock('block3', {
        frameworks: {
          selectedFrameworkCodes: selectedFrameworks,
          projectSize,
          pathClarity
        }
      });
      
    } catch (error) {
      console.error("Error saving frameworks:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Mark step as complete and navigate to next step
  const handleComplete = async () => {
    if (!projectId) return;
    
    // Save current state before marking complete
    await handleSaveFrameworks();
    
    // Mark this step as complete
    await updateToolProgress(projectId, 'make-a-plan', 'block-3-step-6', { completed: true });
    
    // Navigate to step 7
    navigate(`/make-a-plan/${projectId}/block-3/step-7`);
  };

  // Loading state
  if (isLoadingFrameworks) {
    return (
      <MakeAPlanLayout
        title="Select Good Practice Frameworks"
        description="Choose frameworks that best suit your project's context"
        currentStep={6}
        block={3}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg text-muted-foreground">Loading frameworks...</span>
        </div>
      </MakeAPlanLayout>
    );
  }

  return (
    <MakeAPlanLayout
      title="Select Good Practice Frameworks"
      description="Choose frameworks that best suit your project's context"
      currentStep={6}
      block={3}
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Framework Selection</CardTitle>
          <CardDescription>
            Choose the appropriate frameworks for your project based on its characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Quadrant Picker */}
          <div className="p-6 bg-gray-50 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Project Characteristics</h3>
            <p className="text-gray-600 mb-6">
              Define your project's characteristics to get framework recommendations
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Size */}
              <div>
                <Label htmlFor="project-size" className="mb-2 block">
                  Project Size
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Consider budget, team size, duration, and organizational impact when determining project size
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Select value={projectSize} onValueChange={setProjectSize}>
                  <SelectTrigger id="project-size" className="w-full">
                    <SelectValue placeholder="Select project size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Path Clarity */}
              <div>
                <Label htmlFor="path-clarity" className="mb-2 block">
                  Path Clarity
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          How clear is the path to achieving your project goals? Clear means well-defined requirements and approaches, unclear means high uncertainty
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Select value={pathClarity} onValueChange={setPathClarity}>
                  <SelectTrigger id="path-clarity" className="w-full">
                    <SelectValue placeholder="Select path clarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">Clear</SelectItem>
                    <SelectItem value="fuzzy">Fuzzy</SelectItem>
                    <SelectItem value="unclear">Unclear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Framework Checklist */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Frameworks</h3>
            <p className="text-gray-600 mb-4">
              Based on your project characteristics, we recommend the highlighted frameworks.
              You can select any combination that fits your project needs.
            </p>
            
            <div className="space-y-3">
              {frameworks.map((framework) => {
                const recommended = isRecommended(framework.code);
                return (
                  <div 
                    key={framework.code}
                    className={`flex items-start space-x-3 p-4 rounded-lg border ${
                      recommended ? 'border-tcof-teal/40 bg-tcof-light/10' : 'border-gray-200'
                    }`}
                  >
                    <Checkbox 
                      id={`framework-${framework.code}`}
                      checked={selectedFrameworks.includes(framework.code)}
                      onCheckedChange={() => handleFrameworkToggle(framework.code)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor={`framework-${framework.code}`}
                        className="font-medium text-md flex items-center"
                      >
                        {framework.name}
                        {recommended && (
                          <span className="ml-2 text-xs px-2 py-1 bg-tcof-teal/20 text-tcof-teal rounded-full">
                            Recommended
                          </span>
                        )}
                      </Label>
                      <p className="text-sm text-gray-600">{framework.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(`/make-a-plan/${projectId}/block-3`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSaveFrameworks}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" /> 
              )}
              Save Progress
            </Button>
            <Button
              disabled={selectedFrameworks.length === 0 || isSaving}
              onClick={handleComplete}
            >
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <StepNavigation
        prevLink={`/make-a-plan/${projectId}/block-3`}
        nextLink={`/make-a-plan/${projectId}/block-3/step-7`}
        onComplete={handleComplete}
        nextDisabled={selectedFrameworks.length === 0}
      />
    </MakeAPlanLayout>
  );
}