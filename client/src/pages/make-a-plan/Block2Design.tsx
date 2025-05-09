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
import { useToast } from "@/hooks/use-toast";
import { useBlockSave } from "@/hooks/useBlockSave";

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
  const { plan } = usePlan();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  
  // Use our new reliable save hook
  const { saveBlock, markBlockComplete, isSaving } = useBlockSave("block2", projectId);
  
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
  
  // State for personal heuristics from Block 1
  const [personalHeuristics, setPersonalHeuristics] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  
  // Initialize with data from the plan context
  useEffect(() => {
    // Load Block 2 data
    if (plan?.blocks?.block2) {
      if (plan.blocks.block2.tasks) {
        setTasks(plan.blocks.block2.tasks);
      }
      if (plan.blocks.block2.stakeholders) {
        setStakeholders(plan.blocks.block2.stakeholders);
      }
      if (plan.blocks.block2.mappings) {
        setMappings(plan.blocks.block2.mappings);
      }
    }
    
    // Load personal heuristics from Block 1
    if (plan?.blocks?.block1?.personalHeuristics) {
      console.log('📋 Loading personal heuristics from Block 1:', 
        plan.blocks.block1.personalHeuristics.length);
      setPersonalHeuristics(plan.blocks.block1.personalHeuristics);
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
    try {
      // Save data with our useBlockSave hook
      await saveBlock({
        tasks,
        stakeholders,
      });
      toast({
        title: "Success",
        description: "Your progress has been saved",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving block data:", error);
      toast({
        title: "Save failed",
        description: "There was a problem saving your progress. Your changes are stored locally.",
        variant: "destructive",
      });
    }
  };
  
  // Handler to mark this block as complete and proceed to next block
  const handleCompleteBlock = async () => {
    try {
      // Mark block as complete and advance to next block
      await markBlockComplete({
        tasks,
        stakeholders,
      });
      navigate(`/make-a-plan/${projectId}/block-3`);
    } catch (error) {
      console.error("Error marking block as complete:", error);
      toast({
        title: "Action failed",
        description: "There was a problem completing this block. Please try again.",
        variant: "destructive",
      });
    }
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
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
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
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
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
                Link each of your custom heuristics from Block 1 to the relevant 
                TCOF Success Factors to ensure comprehensive coverage.
              </p>
              
              {/* This section will have a heuristic mapping interface */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Heuristic Mapping</h3>
                <p className="text-gray-500">
                  Coming soon: Heuristic mapping interface.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
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
        
        {/* Step 4: Unlinked Tasks Tab */}
        <TabsContent value="step4" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 4: Unlinked Tasks</CardTitle>
              <CardDescription>
                Identify any tasks that aren't linked to success factors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Review any tasks in your project that aren't directly linked to
                success factors and determine if they should remain or be revised.
              </p>
              
              {/* This section will have an unlinked tasks review interface */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Unlinked Tasks</h3>
                <p className="text-gray-500">
                  Coming soon: Unlinked tasks interface.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
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
        
        {/* Summary & Next Steps */}
        <TabsContent value="summary" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Block 2 Summary & Next Steps</CardTitle>
              <CardDescription>
                Review your design work and prepare for delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Review the work you've done in Block 2 and prepare to move to Block 3,
                where you'll develop a delivery approach for your project.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Block 2 Summary</h3>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-medium text-tcof-dark flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      Tasks Created
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {tasks.length > 0 
                        ? `${tasks.length} task(s) created based on success factors`
                        : "No tasks created yet"}
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-medium text-tcof-dark flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      Stakeholder Mapping
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {stakeholders.length > 0 
                        ? `${stakeholders.length} stakeholder(s) identified and analyzed`
                        : "No stakeholders identified yet"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
                <p className="text-amber-800">
                  <strong>Next:</strong> In Block 3, you'll develop a delivery approach that 
                  addresses your project challenges and establishes clear owner accountability.
                </p>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleSaveBlock}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Progress"}
                </Button>
                
                <Button 
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  onClick={handleCompleteBlock}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Complete Block 2 & Continue"} <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("step4")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Step 4
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}