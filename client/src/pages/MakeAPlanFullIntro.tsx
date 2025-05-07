import React from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ChevronRight, ArrowLeft, BookOpen, ClipboardList, Clock, Settings, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useProgress } from "@/contexts/ProgressContext";
import { PlanProvider } from "@/contexts/PlanContext";
import ProjectBanner from "@/components/ProjectBanner";

export default function MakeAPlanFullIntro() {
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
            onClick={() => navigate(`/make-a-plan/${projectId}`)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Make a Plan
          </Button>
          
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-tcof-dark mb-2">Full Planning Journey</h1>
            <p className="text-lg text-gray-600 mb-8">
              Create a comprehensive action plan through our guided three-block process
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
                      before creating your plan. However, you can still proceed if you wish.
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
            
            {/* Main Introduction */}
            <div className="bg-white p-8 rounded-xl shadow-md mb-8">
              <h2 className="text-2xl font-semibold text-tcof-dark mb-6">About the Planning Process</h2>
              
              <p className="text-gray-700 mb-6">
                This planning tool guides you through creating a comprehensive project plan using the Connected Outcomes Framework.
                The process is divided into three main blocks, each addressing different aspects of your planning journey:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-l-4 border-tcof-teal">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-tcof-dark mb-2">Block 1: Discover</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Define success criteria and outline key success factors for your project.
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Rate the 12 TCOF success factors</li>
                      <li>Add your personal heuristics</li>
                      <li>Define your success criteria</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-tcof-teal">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-tcof-dark mb-2">Block 2: Design</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Create tasks and map stakeholders based on your success factors.
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Map heuristics to TCOF factors</li>
                      <li>Create tasks for each factor</li>
                      <li>Add organizational policy tasks</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border-l-4 border-tcof-teal">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-tcof-dark mb-2">Block 3: Deliver</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Finalize your delivery approach and implementation timeline.
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Select your delivery approach</li>
                      <li>Add good-practice tasks</li>
                      <li>Generate your final checklist</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-tcof-dark mb-3">Your Progress Will Be Saved</h3>
                <p className="text-gray-600 mb-4">
                  You can complete each block at your own pace. Your progress will be automatically saved,
                  allowing you to return and continue where you left off.
                </p>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>You can navigate between blocks at any time</span>
                </div>
              </div>
              
              <div className="flex justify-center mt-8">
                <Button
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white text-lg px-8 py-6"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-1`)}
                >
                  Start with Block 1: Discover <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
            
            {/* Block Navigation */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-lg font-medium text-tcof-dark mb-4">Jump to Any Block</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <Button
                  className="flex-1 bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-1`)}
                >
                  <span className="bg-white text-tcof-teal rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                  Block 1: Discover
                </Button>
                <Button
                  className="flex-1 bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
                >
                  <span className="bg-white text-tcof-teal rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                  Block 2: Design
                </Button>
                <Button
                  className="flex-1 bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-3`)}
                >
                  <span className="bg-white text-tcof-teal rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                  Block 3: Deliver
                </Button>
              </div>
            </div>
            
            {/* Getting Help */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-tcof-dark mb-4">Need Help?</h3>
              <p className="text-gray-600 mb-4">
                Each block provides detailed guidance and tooltips to help you through the process.
                For more detailed information about TCOF and the planning methodology, visit the 
                resources section.
              </p>
              <Button
                variant="outline"
                className="border-tcof-teal text-tcof-teal hover:bg-tcof-light"
                onClick={() => window.open('https://www.sbs.ox.ac.uk/research/centres-and-initiatives/major-programme-management/technology-and-connected-outcomes-framework', '_blank')}
              >
                Learn More About TCOF <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PlanProvider>
  );
}