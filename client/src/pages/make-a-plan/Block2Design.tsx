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
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  MoveRight,
  ClipboardList
} from "lucide-react";
import { useProgress } from "@/contexts/ProgressContext";
import { usePlan } from "@/contexts/PlanContext";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface Task {
  id: string;
  title: string;
  description: string;
  stage: string;
  priority: number;
  assignedTo?: string;
}

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  influence: number;
  interest: number;
}

export default function Block2Design() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { progress } = useProgress();
  const { plan, saveBlock, markBlockComplete } = usePlan();
  const [activeTab, setActiveTab] = useState("overview");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  
  // Verify that Block 1 is completed
  const block1Completed = plan?.blocks?.block1?.completed;
  
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
  
  // Initialize with data from the plan context
  useEffect(() => {
    if (plan?.blocks?.block2) {
      if (plan.blocks.block2.tasks) {
        setTasks(plan.blocks.block2.tasks);
      }
      if (plan.blocks.block2.stakeholders) {
        setStakeholders(plan.blocks.block2.stakeholders);
      }
    }
  }, [plan]);
  
  // One-time check to redirect if prerequisites are not met
  useEffect(() => {
    console.log("Routing OK: Block2Design mounted");
    if (projectId && !block1Completed) {
      console.log("Block 1 not completed, redirecting to Block 1");
      navigate(`/make-a-plan/${projectId}/block-1`);
    }
  }, [projectId, block1Completed, navigate]);
  
  // If user directly navigates to this page without completing Block 1, redirect
  if (!block1Completed) {
    return <div className="p-8 text-center">Checking prerequisites...</div>;
  }
  
  // Handler to save the current block data
  const handleSaveBlock = async () => {
    await saveBlock('block2', {
      tasks,
      stakeholders,
    });
  };
  
  // Handler to mark this block as complete and proceed to next block
  const handleCompleteBlock = async () => {
    await markBlockComplete('block2');
    navigate(`/make-a-plan/${projectId}/block-3`);
  };
  
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
          <h1 className="text-3xl font-bold text-tcof-dark">Block 2: Design</h1>
          <p className="text-gray-600 mt-1">Create a structured action plan</p>
        </div>
        
        <div className="mt-4 sm:mt-0 bg-tcof-light rounded-lg px-4 py-2 flex items-center">
          <span className="text-sm font-medium text-tcof-dark mr-2">Project:</span>
          <span className="text-sm text-tcof-teal">{project?.name || "Loading..."}</span>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="step1">Step 1: Create Tasks</TabsTrigger>
          <TabsTrigger value="step2">Step 2: Stakeholder Mapping</TabsTrigger>
          <TabsTrigger value="step3">Step 3: Heuristic Mapping</TabsTrigger>
          <TabsTrigger value="step4">Step 4: Unlinked Tasks</TabsTrigger>
          <TabsTrigger value="summary">Summary & Next Steps</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="pt-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-tcof-light to-white p-8 rounded-xl shadow-md">
            <div className="flex items-center mb-6">
              <div className="bg-tcof-teal rounded-full p-2 mr-4">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-tcof-dark">Block 2: Design Your Plan</h2>
                <p className="text-gray-600">Transform success factors into actionable tasks</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              In this second block, you'll convert the success factors identified in Block 1 
              into specific actions and tasks. You'll also identify key stakeholders and 
              determine their engagement strategy.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-tcof-dark">Step 1: Create Tasks</CardTitle>
                  <CardDescription>Develop actionable tasks from success factors</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Break down each success factor into specific tasks with clear 
                    responsibilities and priorities based on your project's unique context.
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
                  <CardTitle className="text-tcof-dark">Step 2: Stakeholder Mapping</CardTitle>
                  <CardDescription>Identify and analyze key stakeholders</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Map stakeholders based on their influence and interest levels to 
                    create an effective engagement strategy for your project.
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
                <strong>Tip:</strong> Be specific when creating tasks and consider all stakeholders
                who might influence your project's success.
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={() => setActiveTab("step1")}
              >
                Begin Block 2 <MoveRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
        
        {/* Step 1: Create Tasks Tab */}
        <TabsContent value="step1" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 1: Create Tasks</CardTitle>
              <CardDescription>
                Convert success factors into actionable tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Based on the success factors identified in Block 1, create specific tasks 
                that will help you achieve your project goals.
              </p>
              
              {/* This section would normally have a full task creation interface */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Task List</h3>
                
                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task, index) => (
                      <div 
                        key={task.id || index} 
                        className="p-4 border rounded-lg bg-white hover:border-tcof-teal transition-colors"
                      >
                        <h4 className="font-medium text-tcof-dark">{task.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        <div className="flex justify-between mt-2 text-sm">
                          <span>Stage: {task.stage}</span>
                          <span>Priority: {task.priority}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No tasks created yet. Coming soon: Task creation interface.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                >
                  Save Progress
                </Button>
              </div>
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
        
        {/* Step 2: Stakeholder Mapping Tab */}
        <TabsContent value="step2" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 2: Stakeholder Mapping</CardTitle>
              <CardDescription>
                Identify and analyze key stakeholders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Identify the key stakeholders in your project and analyze their level of
                influence and interest to develop appropriate engagement strategies.
              </p>
              
              {/* This section would normally have a full stakeholder mapping interface */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Stakeholder List</h3>
                
                {stakeholders.length > 0 ? (
                  <div className="space-y-4">
                    {stakeholders.map((stakeholder, index) => (
                      <div 
                        key={stakeholder.id || index} 
                        className="p-4 border rounded-lg bg-white hover:border-tcof-teal transition-colors"
                      >
                        <h4 className="font-medium text-tcof-dark">{stakeholder.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">Role: {stakeholder.role}</p>
                        <div className="flex justify-between mt-2 text-sm">
                          <span>Influence: {stakeholder.influence}/5</span>
                          <span>Interest: {stakeholder.interest}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No stakeholders identified yet. Coming soon: Stakeholder mapping interface.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                >
                  Save Progress
                </Button>
              </div>
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
                onClick={() => setActiveTab("step3")}
              >
                Continue to Step 3 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Step 3: Heuristic Mapping Tab */}
        <TabsContent value="step3" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 3: Heuristic Mapping</CardTitle>
              <CardDescription>
                Map your personal heuristics to TCOF Success Factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Link each of your custom heuristics from Block 1 to the most relevant TCOF Success Factor.
                This ensures your personal guiding principles align with established best practices.
              </p>
              
              {/* Redirect to the dedicated mapping page */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                <p className="mb-4">
                  The Heuristic Mapping feature is available on a dedicated page for better usability.
                </p>
                <Button 
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-2/step-3`)}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                >
                  Open Heuristic Mapping Tool
                </Button>
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                <p className="text-amber-800">
                  <strong>Tip:</strong> Mapping your heuristics to success factors ensures your custom
                  principles inherit the proven tasks and practices associated with each factor.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                >
                  Save Progress
                </Button>
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
                onClick={() => setActiveTab("step4")}
              >
                Continue to Step 4 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Step 4: Unlinked Heuristic Tasks Tab */}
        <TabsContent value="step4" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 4: Tasks for Unlinked Heuristics</CardTitle>
              <CardDescription>
                Create specific tasks for heuristics not linked to success factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                For each heuristic that wasn't linked to a TCOF success factor, define your 
                own custom tasks across each of the four project stages.
              </p>
              
              {/* Redirect to the dedicated tasks page */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                <p className="mb-4">
                  This feature is available on a dedicated page for better usability.
                </p>
                <Button 
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-2/step-4`)}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                >
                  Open Task Creation Tool
                </Button>
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                <p className="text-amber-800">
                  <strong>Tip:</strong> You can add up to 3 tasks per stage (Identification, Definition, 
                  Delivery, Closure) for each unlinked heuristic. Tasks save automatically as you create them.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                >
                  Save Progress
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("step3")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 3
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
              <CardTitle className="text-tcof-dark">Block 2 Summary</CardTitle>
              <CardDescription>
                Review your progress and prepare for Block 3
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 rounded-lg p-6 mb-6 flex items-center">
                <Check className="h-10 w-10 text-green-500 mr-4" />
                <div>
                  <h3 className="text-lg font-medium text-green-800 mb-1">Block 2 Ready for Completion</h3>
                  <p className="text-green-700">
                    You've identified tasks and stakeholders for your project.
                  </p>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-tcof-dark mb-4">Summary of Key Elements</h3>
              
              <div className="mb-6">
                <h4 className="font-medium text-tcof-dark mb-2">Tasks:</h4>
                {tasks.length > 0 ? (
                  <ul className="list-disc pl-6 space-y-1">
                    {tasks.map((task, index) => (
                      <li key={task.id || index} className="text-gray-700">
                        {task.title} <span className="text-tcof-teal text-sm">
                          (Priority: {task.priority}/5)
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No tasks created yet</p>
                )}
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-tcof-dark mb-2">Stakeholders:</h4>
                {stakeholders.length > 0 ? (
                  <ul className="list-disc pl-6 space-y-1">
                    {stakeholders.map((stakeholder, index) => (
                      <li key={stakeholder.id || index} className="text-gray-700">
                        {stakeholder.name} <span className="text-tcof-teal text-sm">
                          (Role: {stakeholder.role})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No stakeholders identified yet</p>
                )}
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                <p className="text-amber-800">
                  <strong>What's Next:</strong> In Block 3, you'll develop a timeline and finalize your delivery approach.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("step3")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 3
              </Button>
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={handleCompleteBlock}
              >
                Complete Block 2 & Proceed <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}