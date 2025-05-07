import React, { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthProtection } from "@/hooks/use-auth-protection";
import { useAuth } from "@/hooks/use-auth";
import { ClipboardList, Clock, Award, ChevronRight, ArrowLeft, CheckCircle2, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useProgress } from "@/contexts/ProgressContext";
import { PlanProvider } from "@/contexts/PlanContext";

export default function MakeAPlan() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { isAuthenticated } = useAuthProtection();
  const { user } = useAuth();
  const { progress } = useProgress();
  const isAuthorized = isAuthenticated('starter-access') || !!user;
  
  // Check if all three prerequisite tools are completed
  const allThreeCompleted = 
    progress?.tools?.goalMapping?.completed &&
    progress?.tools?.cynefinOrientation?.completed &&
    progress?.tools?.tcofJourney?.completed;
  
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
  
  useEffect(() => {
    console.log("MakeAPlan restored:", location);
  }, [location]);
  
  // Instead of direct Redirect that can cause loops, we'll use conditional rendering
  // and a one-time navigation effect with a ref to prevent infinite redirects
  const redirectedRef = React.useRef(false);
  
  // One-time safe redirect if needed
  useEffect(() => {
    if (location === "/make-a-plan" && !projectId && !redirectedRef.current) {
      console.log("Missing projectId, will redirect to /organisations (ONE-TIME)");
      redirectedRef.current = true;
      setTimeout(() => navigate("/organisations"), 0);
    }
  }, [location, projectId, navigate]);
  
  // Guard against invalid state - no project ID available
  if (!projectId) {
    console.log("No projectId available in MakeAPlan, rendering empty state");
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
  
  // Authentication check component
  const AuthCheck = () => (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-2xl font-bold text-tcof-dark mb-4">Authentication Required</h2>
      <p className="text-gray-600 mb-6">You need to sign in or enter the access password to use these tools.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
          onClick={() => navigate("/auth")}
        >
          Sign In
        </Button>
        <Button 
          variant="outline" 
          className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
          onClick={() => navigate("/tools/starter-access")}
        >
          Enter Access Password
        </Button>
      </div>
    </div>
  );
  
  // Render content function that we'll wrap in the PlanProvider
  const renderContent = () => (
    <>
      {/* Back button */}
      <div className="container mx-auto px-4 py-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/projects/${projectId}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Button>
      </div>
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-tcof-light py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-tcof-dark">
            {project ? `${project.name}: Make a Plan` : "Make a Plan"}
          </h1>
          
          {/* Prerequisites status indicators */}
          <div className="mt-4 mb-4">
            {!allThreeCompleted && progress ? (
              <div className="flex flex-col items-center">
                <div className="text-amber-600 font-medium mb-2">
                  Recommended prerequisites:
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {[
                    { 
                      name: "Goal Mapping", 
                      completed: progress.tools?.goalMapping?.completed,
                      path: `/goal-mapping/${projectId}`
                    },
                    { 
                      name: "Cynefin Orientation", 
                      completed: progress.tools?.cynefinOrientation?.completed,
                      path: `/cynefin-orientation/${projectId}`
                    },
                    { 
                      name: "TCOF Journey", 
                      completed: progress.tools?.tcofJourney?.completed,
                      path: `/tcof-journey/${projectId}`
                    }
                  ].map((tool) => (
                    <div 
                      key={tool.name}
                      className={`px-3 py-1 rounded-full flex items-center gap-2 
                        ${tool.completed 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                    >
                      {tool.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {tool.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : allThreeCompleted && (
              <div className="flex items-center justify-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mx-auto w-fit">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">All prerequisites completed!</span>
              </div>
            )}
          </div>
          
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-6">
            Create a structured action plan for your transformation or delivery initiative using the
            Connected Outcomes Framework
          </p>
          {project && (
            <div className="bg-white shadow rounded-lg p-4 max-w-md mx-auto mb-6">
              <p className="font-medium text-tcof-dark">Project Context:</p>
              <p className="text-gray-600">
                {project.description || "No project description available"}
              </p>
            </div>
          )}
          <div className="h-1 w-20 bg-tcof-teal mx-auto mb-12"></div>
        </div>
      </section>
      
      {/* Main Section - Show blocks regardless of completion status */}
      <section className="py-12 container mx-auto px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-tcof-light to-white p-8 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-tcof-dark text-center">Your Planning Journey</h2>
          
          {/* Display warning if prerequisites not completed */}
          {!allThreeCompleted && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
              <p className="text-amber-800">
                <strong>Note:</strong> For best results, we recommend completing all "Get Your Bearings" tools 
                before proceeding, but you can continue with planning if you wish.
              </p>
            </div>
          )}

          {/* Block cards - always displayed */}
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 items-center justify-center gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-tcof-teal max-w-xs w-full">
              <h4 className="font-bold text-lg mb-2">Block 1: Discover</h4>
              <p className="text-gray-600 text-sm mb-4">Define success criteria and outline key success factors for your project</p>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white w-full"
                onClick={() => navigate(`/make-a-plan/${projectId}/block-1`)}
              >
                Go to Block 1 <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-tcof-teal max-w-xs w-full">
              <h4 className="font-bold text-lg mb-2">Block 2: Design</h4>
              <p className="text-gray-600 text-sm mb-4">Create tasks and map stakeholders based on your success factors</p>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white w-full"
                onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
              >
                Go to Block 2 <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-tcof-teal max-w-xs w-full">
              <h4 className="font-bold text-lg mb-2">Block 3: Deliver</h4>
              <p className="text-gray-600 text-sm mb-4">Finalize your delivery approach and timeline for implementation</p>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white w-full"
                onClick={() => navigate(`/make-a-plan/${projectId}/block-3`)}
              >
                Go to Block 3 <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-gray-300 max-w-xs w-full opacity-90">
              <h4 className="font-bold text-lg mb-2">Full Journey</h4>
              <p className="text-gray-600 text-sm mb-4">See an overview of all three planning blocks and your progress so far</p>
              <Button 
                variant="outline"
                className="border-tcof-teal text-tcof-teal hover:bg-tcof-light w-full"
                onClick={() => navigate(`/make-a-plan/${projectId}/full`)}
              >
                <Eye className="h-4 w-4 mr-2" /> View Full Journey
              </Button>
            </div>
          </div>

          {/* Get Your Bearings button */}
          <div className="text-center mt-6">
            <Button 
              variant="outline" 
              className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
              onClick={() => navigate(projectId ? `/get-your-bearings/${projectId}` : "/get-your-bearings")}
            >
              Go to Get Your Bearings
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12 text-tcof-dark">What You'll Create</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Success Criteria</h3>
                <p className="text-sm text-gray-600">Clear metrics and KPIs to measure progress and outcomes</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Risk Assessment</h3>
                <p className="text-sm text-gray-600">Identify and mitigate potential obstacles to delivery</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Stakeholder Map</h3>
                <p className="text-sm text-gray-600">Strategy for engaging and aligning key stakeholders</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 hover:border-tcof-teal transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold mb-3 text-tcof-dark">Action Timeline</h3>
                <p className="text-sm text-gray-600">Sequenced activities with responsibilities and deadlines</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Call to action for incomplete prerequisites */}
      {!allThreeCompleted && progress && (
        <section className="py-16 bg-gradient-to-r from-tcof-dark to-tcof-teal">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl text-white font-bold mb-4">Complete Your Journey</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Complete the prerequisite tools to get the most out of your planning experience.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center max-w-xl mx-auto mb-8">
              {[
                { 
                  name: "Goal Mapping", 
                  completed: progress.tools?.goalMapping?.completed,
                  path: `/goal-mapping/${projectId}`,
                  icon: Award,
                  description: "Set clear outcomes and objectives"
                },
                { 
                  name: "Cynefin Orientation", 
                  completed: progress.tools?.cynefinOrientation?.completed,
                  path: `/cynefin-orientation/${projectId}`,
                  icon: Clock,
                  description: "Understand your project complexity"
                },
                { 
                  name: "TCOF Journey", 
                  completed: progress.tools?.tcofJourney?.completed,
                  path: `/tcof-journey/${projectId}`,
                  icon: ClipboardList,
                  description: "Map your delivery approach"
                }
              ]
              .filter(tool => !tool.completed)
              .map((tool) => {
                const Icon = tool.icon;
                return (
                  <Button 
                    key={tool.name}
                    className="bg-white text-tcof-dark hover:bg-gray-100 flex items-center gap-2 p-6"
                    onClick={() => navigate(tool.path)}
                  >
                    <div className="flex-shrink-0">
                      <Icon className="h-6 w-6 text-tcof-teal" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{tool.name}</div>
                      <div className="text-sm text-gray-600">{tool.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                );
              })}
            </div>
            
            <p className="text-white/90 text-sm max-w-xl mx-auto">
              Completing these tools will help ensure your plan is built on a solid foundation
              of research-backed principles.
            </p>
          </div>
        </section>
      )}
    </>
  );
  
  // Return the content wrapped in PlanProvider
  return (
    <PlanProvider>
      {renderContent()}
    </PlanProvider>
  );
}