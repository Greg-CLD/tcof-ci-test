import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MoveRight } from "lucide-react";
import { useProgress } from "@/contexts/ProgressContext";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface SuccessFactor {
  id: string;
  title: string;
  description: string;
  rating?: number;
}

interface PersonalHeuristic {
  id: string;
  text: string;
  rating: number;
}

export default function Block1Discover() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { progress } = useProgress();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Verify that all prerequisite tools are completed
  const allPrerequisitesCompleted = 
    progress?.tools?.goalMapping?.completed &&
    progress?.tools?.cynefinOrientation?.completed &&
    progress?.tools?.tcofJourney?.completed;
  
  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest("GET", `/api/projects-detail/${projectId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!projectId,
  });
  
  // Fetch the goal mapping data to display in this block
  const { data: goalMap } = useQuery({
    queryKey: ["goal-map", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiRequest("GET", `/api/goal-maps/${projectId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!projectId,
  });
  
  // One-time check to redirect if prerequisites are not met
  useEffect(() => {
    console.log("Routing OK: Block1Discover mounted");
    if (projectId && progress && !allPrerequisitesCompleted) {
      console.log("Prerequisites not completed, redirecting to Make A Plan");
      navigate(`/make-a-plan/${projectId}`);
    }
  }, [projectId, progress, allPrerequisitesCompleted, navigate]);
  
  // If user directly navigates to this page without completing prerequisites, redirect
  if (progress && !allPrerequisitesCompleted) {
    return <div className="p-8 text-center">Checking prerequisites...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <Button 
            variant="outline" 
            onClick={() => navigate(`/make-a-plan/${projectId}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make a Plan
          </Button>
          <h1 className="text-3xl font-bold text-tcof-dark">Block 1: Discover</h1>
          <p className="text-gray-600 mt-1">Define project scope and success criteria</p>
        </div>
        
        <div className="mt-4 sm:mt-0 bg-tcof-light rounded-lg px-4 py-2 flex items-center">
          <span className="text-sm font-medium text-tcof-dark mr-2">Project:</span>
          <span className="text-sm text-tcof-teal">{project?.name || "Loading..."}</span>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-4 w-full max-w-4xl mx-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="step1">Step 1: Success Factors</TabsTrigger>
          <TabsTrigger value="step2">Step 2: Personal Heuristics</TabsTrigger>
          <TabsTrigger value="summary">Summary & Next Steps</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="pt-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-tcof-light to-white p-8 rounded-xl shadow-md">
            <div className="flex items-center mb-6">
              <div className="bg-tcof-teal rounded-full p-2 mr-4">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-tcof-dark">Block 1: Discover Your Context</h2>
                <p className="text-gray-600">Define what success looks like for your project</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              In this first block, you'll review the success factors identified in the Goal Mapping Tool 
              and integrate them with your personal knowledge and experience. This will set the foundation
              for your detailed action plan.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-tcof-dark">Step 1: Success Factors</CardTitle>
                  <CardDescription>Review your Goal Mapping results</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    We'll show you the success factors that matter most for your project based on
                    the Goal Mapping Tool results. Confirm these priorities before proceeding.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab("step1")}
                  >
                    Start Step 1
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-tcof-dark">Step 2: Personal Heuristics</CardTitle>
                  <CardDescription>Add your own success criteria</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Apply your personal expertise and domain knowledge to identify additional
                    success factors unique to your project context.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab("step2")}
                  >
                    Go to Step 2
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
              <p className="text-amber-800">
                <strong>Tip:</strong> Take your time to review and refine the success factors. 
                These will be the foundation for your action plan in later blocks.
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={() => setActiveTab("step1")}
              >
                Begin Block 1 <MoveRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
        
        {/* Step 1: Success Factors Tab */}
        <TabsContent value="step1" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 1: Review Success Factors</CardTitle>
              <CardDescription>
                Based on your Goal Mapping results, these are the key success factors for your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                These success factors were identified as most relevant to your project based on your 
                responses in the Goal Mapping Tool. Confirm these are correct before proceeding.
              </p>
              
              {goalMap ? (
                <div className="grid gap-4">
                  {(goalMap.successFactorRatings || []).map((factor: SuccessFactor, index: number) => (
                    <div 
                      key={factor.id} 
                      className="p-4 border rounded-lg hover:border-tcof-teal transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="bg-tcof-light rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-1">
                          <span className="font-medium text-tcof-teal">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-tcof-dark mb-1">{factor.title}</h3>
                          <p className="text-gray-600 text-sm">{factor.description}</p>
                          <div className="mt-2 flex items-center">
                            <span className="text-sm text-gray-500 mr-2">Priority:</span>
                            <span className="font-medium text-tcof-teal">
                              {factor.rating === 5 ? "Very High" : 
                               factor.rating === 4 ? "High" : 
                               factor.rating === 3 ? "Medium" : 
                               factor.rating === 2 ? "Low" : "Very Low"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No Goal Mapping data available. Please complete the Goal Mapping Tool first.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("overview")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview
              </Button>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={() => setActiveTab("step2")}
              >
                Continue to Step 2 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Step 2: Personal Heuristics Tab */}
        <TabsContent value="step2" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 2: Personal Heuristics</CardTitle>
              <CardDescription>
                Add your personal expertise and domain knowledge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                In addition to the research-based success factors, your personal experience and
                domain knowledge can greatly enrich your delivery plan. Review any personal heuristics
                you previously identified.
              </p>
              
              {goalMap?.personalHeuristics?.length > 0 ? (
                <div className="grid gap-4">
                  {(goalMap.personalHeuristics || []).map((heuristic: PersonalHeuristic, index: number) => (
                    <div 
                      key={heuristic.id} 
                      className="p-4 border rounded-lg hover:border-tcof-teal transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="bg-tcof-light rounded-full w-8 h-8 flex items-center justify-center mr-3 mt-1">
                          <span className="font-medium text-tcof-teal">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-gray-700">{heuristic.text}</p>
                          <div className="mt-2 flex items-center">
                            <span className="text-sm text-gray-500 mr-2">Priority:</span>
                            <span className="font-medium text-tcof-teal">
                              {heuristic.rating === 5 ? "Very High" : 
                               heuristic.rating === 4 ? "High" : 
                               heuristic.rating === 3 ? "Medium" : 
                               heuristic.rating === 2 ? "Low" : "Very Low"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-500 mb-4">
                    You haven't added any personal heuristics yet. You can add these in the Goal Mapping Tool.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/tools/goal-mapping/${projectId}`)}
                    className="mx-auto"
                  >
                    Edit in Goal Mapping Tool
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("step1")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 1
              </Button>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={() => setActiveTab("summary")}
              >
                Continue to Summary <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Summary Tab */}
        <TabsContent value="summary" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Block 1 Summary</CardTitle>
              <CardDescription>
                Review your progress and prepare for Block 2
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 rounded-lg p-6 mb-6 flex items-center">
                <Check className="h-10 w-10 text-green-500 mr-4" />
                <div>
                  <h3 className="text-lg font-medium text-green-800 mb-1">Block 1 Completed</h3>
                  <p className="text-green-700">
                    You've successfully identified the key success factors for your project.
                  </p>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-tcof-dark mb-4">Summary of Key Factors</h3>
              
              <div className="mb-6">
                <h4 className="font-medium text-tcof-dark mb-2">Research-Based Success Factors:</h4>
                {goalMap?.successFactorRatings?.length > 0 ? (
                  <ul className="list-disc pl-6 space-y-1">
                    {goalMap.successFactorRatings.map((factor: SuccessFactor) => (
                      <li key={factor.id} className="text-gray-700">
                        {factor.title} <span className="text-tcof-teal text-sm">
                          (Priority: {factor.rating === 5 ? "Very High" : 
                                     factor.rating === 4 ? "High" : 
                                     factor.rating === 3 ? "Medium" : 
                                     factor.rating === 2 ? "Low" : "Very Low"})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No success factors identified</p>
                )}
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-tcof-dark mb-2">Your Personal Heuristics:</h4>
                {goalMap?.personalHeuristics?.length > 0 ? (
                  <ul className="list-disc pl-6 space-y-1">
                    {goalMap.personalHeuristics.map((heuristic: PersonalHeuristic) => (
                      <li key={heuristic.id} className="text-gray-700">
                        {heuristic.text} <span className="text-tcof-teal text-sm">
                          (Priority: {heuristic.rating === 5 ? "Very High" : 
                                     heuristic.rating === 4 ? "High" : 
                                     heuristic.rating === 3 ? "Medium" : 
                                     heuristic.rating === 2 ? "Low" : "Very Low"})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No personal heuristics added</p>
                )}
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                <p className="text-amber-800">
                  <strong>What's Next:</strong> In Block 2, you'll convert these success factors into 
                  specific actions and tasks tailored to your project's needs.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("step2")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 2
              </Button>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
              >
                Proceed to Block 2 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}