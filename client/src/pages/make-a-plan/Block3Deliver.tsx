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
  Calendar,
  Download
} from "lucide-react";
import { useProgress } from "@/contexts/ProgressContext";
import { usePlan } from "@/contexts/PlanContext";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Block3Deliver() {
  const [location, navigate] = useLocation();
  const { projectId } = useParams<{ projectId?: string }>();
  const { progress } = useProgress();
  const { plan, saveBlock, markBlockComplete } = usePlan();
  const [activeTab, setActiveTab] = useState("overview");
  const [deliveryApproach, setDeliveryApproach] = useState<string>("agile");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  
  // Verify that Block 2 is completed
  const block2Completed = plan?.blocks?.block2?.completed;
  
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
    if (plan?.blocks?.block3) {
      if (plan.blocks.block3.deliveryApproach) {
        setDeliveryApproach(plan.blocks.block3.deliveryApproach);
      }
      if (plan.blocks.block3.deliveryNotes) {
        setDeliveryNotes(plan.blocks.block3.deliveryNotes);
      }
    }
  }, [plan]);
  
  // One-time check to redirect if prerequisites are not met
  useEffect(() => {
    console.log("Routing OK: Block3Deliver mounted");
    if (projectId && !block2Completed) {
      console.log("Block 2 not completed, redirecting to Block 2");
      navigate(`/make-a-plan/${projectId}/block-2`);
    }
  }, [projectId, block2Completed, navigate]);
  
  // If user directly navigates to this page without completing Block 2, redirect
  if (!block2Completed) {
    return <div className="p-8 text-center">Checking prerequisites...</div>;
  }
  
  // Handler to save the current block data
  const handleSaveBlock = async () => {
    await saveBlock('block3', {
      deliveryApproach,
      deliveryNotes,
      timeline: null // Placeholder for future timeline implementation
    });
  };
  
  // Handler to mark this block as complete and proceed to summary
  const handleCompleteBlock = async () => {
    await markBlockComplete('block3');
    navigate(`/make-a-plan/${projectId}`);
  };
  
  // Handler to export the plan as PDF (placeholder)
  const handleExportPlan = () => {
    window.alert("Export functionality coming soon!");
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
          <h1 className="text-3xl font-bold text-tcof-dark">Block 3: Deliver</h1>
          <p className="text-gray-600 mt-1">Finalize your delivery approach</p>
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
          <TabsTrigger value="step1">Step 1: Delivery Approach</TabsTrigger>
          <TabsTrigger value="step2">Step 2: Timeline</TabsTrigger>
          <TabsTrigger value="summary">Summary & Export</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="pt-6">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-tcof-light to-white p-8 rounded-xl shadow-md">
            <div className="flex items-center mb-6">
              <div className="bg-tcof-teal rounded-full p-2 mr-4">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-tcof-dark">Block 3: Delivery Plan</h2>
                <p className="text-gray-600">Finalize your timeline and approach</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              In this final block, you'll choose a delivery approach that matches your project's 
              context and create a timeline for implementation. This completes your 
              comprehensive plan that you can share with your team.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-tcof-dark">Step 1: Delivery Approach</CardTitle>
                  <CardDescription>Select the right delivery method</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Based on your Cynefin orientation and project context, select the most
                    appropriate delivery approach (Agile, Waterfall, Hybrid, etc.).
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
                  <CardTitle className="text-tcof-dark">Step 2: Timeline</CardTitle>
                  <CardDescription>Develop a realistic timeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Create a timeline for implementing your tasks, considering dependencies
                    and resource constraints.
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
                <strong>Tip:</strong> Choose a delivery approach that matches your project's domain (as identified in the Cynefin Orientation Tool) and organizational context.
              </p>
            </div>
            
            <div className="flex justify-end">
              <Button 
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                onClick={() => setActiveTab("step1")}
              >
                Begin Block 3 <MoveRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
        
        {/* Step 1: Delivery Approach Tab */}
        <TabsContent value="step1" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 1: Delivery Approach</CardTitle>
              <CardDescription>
                Select the most appropriate delivery method for your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Based on your Cynefin orientation and the nature of your project, choose
                the delivery approach that best fits your context.
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Approach
                  </label>
                  <Select 
                    value={deliveryApproach} 
                    onValueChange={setDeliveryApproach}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select approach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agile">Agile / Iterative</SelectItem>
                      <SelectItem value="waterfall">Traditional / Waterfall</SelectItem>
                      <SelectItem value="hybrid">Hybrid Approach</SelectItem>
                      <SelectItem value="lean">Lean / Kanban</SelectItem>
                      <SelectItem value="prince2">PRINCE2</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes on Delivery Approach
                  </label>
                  <Textarea
                    placeholder="Explain your chosen approach and why it's appropriate for this project..."
                    className="min-h-[120px]"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium text-tcof-dark mb-2">Approach Guidance</h3>
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  {deliveryApproach === 'agile' && (
                    <div>
                      <p className="font-medium mb-1">Agile / Iterative</p>
                      <p className="text-gray-600">Best for complex projects where requirements may evolve. Focuses on iterative development with regular feedback cycles.</p>
                      <p className="mt-2 text-gray-600">Consider this approach if your Cynefin orientation indicated a Complex domain.</p>
                    </div>
                  )}
                  
                  {deliveryApproach === 'waterfall' && (
                    <div>
                      <p className="font-medium mb-1">Traditional / Waterfall</p>
                      <p className="text-gray-600">Best for projects with well-defined, stable requirements. Sequential phases from planning to implementation to closeout.</p>
                      <p className="mt-2 text-gray-600">Consider this approach if your Cynefin orientation indicated a Clear domain.</p>
                    </div>
                  )}
                  
                  {deliveryApproach === 'hybrid' && (
                    <div>
                      <p className="font-medium mb-1">Hybrid Approach</p>
                      <p className="text-gray-600">Combines elements of both Agile and Waterfall. Often used when some project components are well-defined while others require flexibility.</p>
                      <p className="mt-2 text-gray-600">Consider this approach if your Cynefin orientation indicated a mix of Clear and Complicated domains.</p>
                    </div>
                  )}
                  
                  {deliveryApproach === 'lean' && (
                    <div>
                      <p className="font-medium mb-1">Lean / Kanban</p>
                      <p className="text-gray-600">Focuses on minimizing waste and maximizing value. Emphasizes flow of work and continuous improvement.</p>
                      <p className="mt-2 text-gray-600">Consider this approach for ongoing operational improvement projects.</p>
                    </div>
                  )}
                  
                  {deliveryApproach === 'prince2' && (
                    <div>
                      <p className="font-medium mb-1">PRINCE2</p>
                      <p className="text-gray-600">Structured project management method with defined roles and stages. Good for projects requiring high governance and control.</p>
                      <p className="mt-2 text-gray-600">Consider this approach for large, complex projects in highly regulated environments.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
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
        
        {/* Step 2: Timeline Tab */}
        <TabsContent value="step2" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Step 2: Timeline</CardTitle>
              <CardDescription>
                Create a realistic timeline for your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                Develop a timeline for implementing your tasks, considering dependencies,
                available resources, and key milestones.
              </p>
              
              {/* Placeholder for timeline creation interface - would be implemented in the future */}
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Timeline Tool</h3>
                <p className="text-gray-600 mb-4">
                  The timeline creation tool is coming soon! This feature will allow you to:
                </p>
                <ul className="text-left text-gray-600 list-disc pl-8 mb-6 space-y-2">
                  <li>Organize tasks into phases</li>
                  <li>Set dependencies between tasks</li>
                  <li>Assign start and end dates</li>
                  <li>Define milestones</li>
                  <li>Visualize the project timeline</li>
                </ul>
                <p className="text-amber-600 font-medium">
                  For now, you can proceed to the summary and complete your plan.
                </p>
              </div>
              
              <div className="flex justify-end mt-6">
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
              <CardTitle className="text-tcof-dark">Plan Complete!</CardTitle>
              <CardDescription>
                Review your complete plan and export for your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 rounded-lg p-6 mb-6 flex items-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mr-4" />
                <div>
                  <h3 className="text-lg font-medium text-green-800 mb-1">Congratulations!</h3>
                  <p className="text-green-700">
                    You've completed all three blocks of the planning process. Your comprehensive
                    plan is now ready to be shared with your team and stakeholders.
                  </p>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-tcof-dark mb-4">Plan Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-lg border hover:border-tcof-teal transition-colors">
                  <h4 className="font-medium text-tcof-dark mb-2">Block 1: Discover</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    You identified key success factors and personal heuristics to guide your project.
                  </p>
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
                    <Check className="h-3 w-3 mr-1" /> Completed
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border hover:border-tcof-teal transition-colors">
                  <h4 className="font-medium text-tcof-dark mb-2">Block 2: Design</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    You created tasks and identified key stakeholders for effective delivery.
                  </p>
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
                    <Check className="h-3 w-3 mr-1" /> Completed
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border hover:border-tcof-teal transition-colors">
                  <h4 className="font-medium text-tcof-dark mb-2">Block 3: Deliver</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    You've selected a {deliveryApproach} delivery approach and prepared for implementation.
                  </p>
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center">
                    <Check className="h-3 w-3 mr-1" /> Completed
                  </div>
                </div>
              </div>
              
              <div className="bg-tcof-light p-6 rounded-lg mb-6">
                <h4 className="font-medium text-tcof-dark mb-4">Next Steps</h4>
                <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                  <li>Share your plan with key stakeholders and team members</li>
                  <li>Begin implementing tasks according to your selected delivery approach</li>
                  <li>Regularly review progress and adjust as needed</li>
                  <li>Refer back to your success factors to ensure you're on track</li>
                </ol>
              </div>
              
              <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={handleExportPlan}
                >
                  <Download className="h-4 w-4 mr-2" /> Export as PDF
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={handleExportPlan}
                >
                  <Download className="h-4 w-4 mr-2" /> Export as Word Document
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={handleExportPlan}
                >
                  <Download className="h-4 w-4 mr-2" /> Email to Team
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
                onClick={handleCompleteBlock}
              >
                Finish & Return to Overview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}