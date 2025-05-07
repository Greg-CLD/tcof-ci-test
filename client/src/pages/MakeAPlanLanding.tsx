import React, { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  ArrowLeft, 
  Zap, 
  Wrench, 
  FileText, 
  Settings, 
  ChevronRight 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useProgress } from "@/contexts/ProgressContext";
import { PlanProvider } from "@/contexts/PlanContext";
import ProjectBanner from "@/components/ProjectBanner";

export default function MakeAPlanLanding() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { progress } = useProgress();
  
  // Fetch project details if projectId is provided
  const { 
    data: project, 
    isLoading: projectLoading 
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      console.log(`Fetching project details for: ${projectId}`);
      const res = await apiRequest("GET", `/api/projects-detail/${projectId}`);
      if (!res.ok) {
        console.error("Failed to fetch project details");
        return null;
      }
      return res.json();
    },
    enabled: !!projectId
  });
  
  // Fetch saved plan data
  const {
    data: planData,
    isLoading: planLoading
  } = useQuery({
    queryKey: ['plan', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const res = await apiRequest("GET", `/api/plans/project/${projectId}`);
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
    enabled: !!projectId
  });
  
  const hasSavedPlan = !!planData && !planLoading;
  
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
  
  // Check if prerequisites are completed
  const allPrerequisitesCompleted = 
    progress?.tools?.goalMapping?.completed &&
    progress?.tools?.cynefinOrientation?.completed &&
    progress?.tools?.tcofJourney?.completed;
  
  return (
    <PlanProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Project Banner */}
        {project && <ProjectBanner project={project} />}
        
        {/* Main content */}
        <div className="container mx-auto px-4 py-8">
          {/* Back button */}
          <Button 
            variant="outline" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
          </Button>
          
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-tcof-dark mb-2">Make a Plan</h1>
            <p className="text-lg text-gray-600 mb-8">
              Create a structured action plan for your project using the Connected Outcomes Framework
            </p>
            
            {/* Prerequisites warning */}
            {!allPrerequisitesCompleted && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      <strong>Recommendation:</strong> For best results, complete all three tools in "Get Your Bearings" 
                      before creating your plan.
                    </p>
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-amber-400 text-amber-700 hover:bg-amber-100"
                        onClick={() => navigate(`/get-your-bearings/${projectId}`)}
                      >
                        Go to Get Your Bearings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Options Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              
              {/* Full Configuration */}
              <Card className="border-2 border-tcof-teal/30 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-tcof-dark">
                    <Wrench className="h-5 w-5 mr-2 text-tcof-teal" /> 
                    Full Configuration
                  </CardTitle>
                  <CardDescription>
                    Create a comprehensive plan through our guided three-block journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Walk through all three blocks of the planning process with full customization options:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
                    <li>Block 1: Discover - Define success criteria</li>
                    <li>Block 2: Design - Map stakeholders and tasks</li>
                    <li>Block 3: Deliver - Finalize your delivery approach</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                    onClick={() => navigate(`/make-a-plan/full/intro`)}
                  >
                    Start Full Configuration <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Quick Start */}
              <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-tcof-dark">
                    <Zap className="h-5 w-5 mr-2 text-amber-500" /> 
                    Quick Start
                  </CardTitle>
                  <CardDescription>
                    Generate a plan based on your project's complexity and domain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Skip the detailed configuration and get a pre-populated plan based on your:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
                    <li>Project complexity (from Cynefin)</li>
                    <li>Delivery approach (from TCOF Journey)</li>
                    <li>Most relevant success factors</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate(`/make-a-plan/${projectId}/quick-start`)}
                    disabled={!allPrerequisitesCompleted}
                  >
                    Use Quick Start {!allPrerequisitesCompleted && "(Complete prerequisites first)"}
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Continue Saved Plan */}
              <Card className={`border border-gray-200 shadow-md hover:shadow-lg transition-shadow ${!hasSavedPlan ? 'opacity-70' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-tcof-dark">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" /> 
                    Continue Saved Plan
                  </CardTitle>
                  <CardDescription>
                    Resume working on your previously saved plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    {hasSavedPlan 
                      ? "You have a saved plan that you can continue working on:" 
                      : "You don't have any saved plans for this project yet."}
                  </p>
                  {hasSavedPlan && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                      <div className="font-medium">Last edited: {new Date(planData?.updatedAt || Date.now()).toLocaleDateString()}</div>
                      <div className="text-gray-500 mt-1">
                        Progress: {planData?.progress ? `${Math.round(planData.progress * 100)}%` : 'Just started'}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate(`/make-a-plan/${projectId}/continue`)}
                    disabled={!hasSavedPlan}
                  >
                    {hasSavedPlan ? "Continue Plan" : "No Saved Plan Available"}
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Admin Preset Editor */}
              <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl text-tcof-dark">
                    <Settings className="h-5 w-5 mr-2 text-gray-600" /> 
                    Admin Tools
                  </CardTitle>
                  <CardDescription>
                    Advanced tools for administrators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Access administrative tools for managing planning templates:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
                    <li>Success Factor Editor</li>
                    <li>Preset Plan Templates</li>
                    <li>Relations Graph Explorer</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate("/make-a-plan/admin")}
                  >
                    Access Admin Tools
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {/* Quick access to individual blocks */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-tcof-dark mb-4">Quick Access to Individual Blocks</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-1`)}
                >
                  Block 1: Discover
                </Button>
                <Button
                  variant="outline"
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
                >
                  Block 2: Design
                </Button>
                <Button
                  variant="outline"
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-3`)}
                >
                  Block 3: Deliver
                </Button>
                <Button
                  variant="outline"
                  className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                  onClick={() => navigate(`/make-a-plan/${projectId}/full`)}
                >
                  View Full Journey
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlanProvider>
  );
}