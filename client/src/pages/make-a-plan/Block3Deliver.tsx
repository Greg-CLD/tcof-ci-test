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
import { useToast } from "@/hooks/use-toast";
import { useBlockSave } from "@/hooks/useBlockSave";
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
  const { plan } = usePlan();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [deliveryApproach, setDeliveryApproach] = useState<string>("agile");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  
  // Use our new reliable save hook
  const { saveBlock, markBlockComplete, isSaving } = useBlockSave("block3", projectId);
  
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
  
  // State for personal heuristics from Block 1
  const [personalHeuristics, setPersonalHeuristics] = useState<any[]>([]);
  
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
    
    // Load personal heuristics from Block 1
    if (plan?.blocks?.block1?.personalHeuristics) {
      console.log('📋 Loading personal heuristics from Block 1 into Block 3:', 
        plan.blocks.block1.personalHeuristics.length);
      setPersonalHeuristics(plan.blocks.block1.personalHeuristics);
    }
  }, [plan]);
  
  // Block 3 can now be accessed directly without requiring Block 2 completion
  useEffect(() => {
    console.log("Block3Deliver mounted");
    // Log a warning if Block 2 is not completed, but don't redirect
    if (projectId && !block2Completed) {
      console.log("Note: Block 2 is not completed, but allowing access to Block 3 directly");
    }
  }, [projectId, block2Completed]);
  
  // Show a warning but don't redirect if Block 2 isn't completed
  const showWarning = !block2Completed;
  
  // Handler to save the current block data
  const handleSaveBlock = async () => {
    try {
      // Save data with our useBlockSave hook and include personal heuristics references
      await saveBlock({
        deliveryApproach,
        deliveryNotes,
        timeline: null, // Placeholder for future timeline implementation
        // Include reference to personal heuristics from Block 1
        heuristicLinks: personalHeuristics.map(h => h.id)
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
  
  // Handler to mark this block as complete and proceed to summary
  const handleCompleteBlock = async () => {
    try {
      // Mark block as complete and advance to summary
      await markBlockComplete({
        deliveryApproach,
        deliveryNotes,
        timeline: null,
        // Include reference to personal heuristics from Block 1
        heuristicLinks: personalHeuristics.map(h => h.id)
      });
      navigate(`/make-a-plan/${projectId}`);
    } catch (error) {
      console.error("Error marking block as complete:", error);
      toast({
        title: "Action failed",
        description: "There was a problem completing this block. Please try again.",
        variant: "destructive",
      });
    }
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
            {showWarning && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                <p className="text-amber-800">
                  <strong>Note:</strong> You haven't completed Block 2 yet. It's recommended to complete 
                  blocks in order, but you can continue using Block 3 directly if needed.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-amber-400 text-amber-700 hover:bg-amber-100"
                  onClick={() => navigate(`/make-a-plan/${projectId}/block-2`)}
                >
                  Go to Block 2
                </Button>
              </div>
            )}
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
              
              {/* Display Personal Heuristics from Block 1 */}
              {personalHeuristics.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium text-tcof-dark mb-4">Your Personal Heuristics</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    These are the personal heuristics you defined in Block 1. Consider how your delivery
                    approach supports these key factors for your project's success.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3 bg-gray-50 p-4 rounded-lg">
                    {personalHeuristics.map((heuristic, index) => (
                      <div key={heuristic.id} className="flex items-start bg-white p-3 rounded border">
                        <div className="bg-tcof-teal text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-tcof-dark">{heuristic.text}</h4>
                          {heuristic.description && (
                            <p className="text-sm text-gray-600 mt-1">{heuristic.description}</p>
                          )}
                          {heuristic.favourite && (
                            <span className="inline-flex items-center mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Favorite
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
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
              </div>
              
              <div className="flex justify-end mt-6">
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
                onClick={() => setActiveTab("summary")}
              >
                Continue to Summary <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Summary & Export */}
        <TabsContent value="summary" className="pt-6">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-tcof-dark">Block 3 Summary & Export</CardTitle>
              <CardDescription>
                Review your delivery plan and export your complete plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-700">
                You've now completed all three blocks of the Make a Plan tool. Review your
                delivery approach and complete this block to finalize your plan.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-tcof-dark mb-4">Plan Summary</h3>
                
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-white">
                    <h4 className="font-medium text-tcof-dark flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      Delivery Approach
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {deliveryApproach ? 
                        deliveryApproach.charAt(0).toUpperCase() + deliveryApproach.slice(1) 
                        : "Not selected"}
                    </p>
                    {deliveryNotes && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                        {deliveryNotes}
                      </p>
                    )}
                  </div>
                  
                  {/* Display Personal Heuristics summary */}
                  {personalHeuristics.length > 0 && (
                    <div className="p-4 border rounded-lg bg-white">
                      <h4 className="font-medium text-tcof-dark flex items-center">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                        Personal Heuristics
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        You defined {personalHeuristics.length} personal heuristic{personalHeuristics.length !== 1 ? 's' : ''} in Block 1
                      </p>
                      <div className="mt-2">
                        {personalHeuristics.map((h, i) => (
                          <div key={h.id} className="text-xs bg-gray-50 p-2 rounded mb-1 flex items-start">
                            <span className="text-tcof-teal font-medium mr-1">{i+1}.</span>
                            <span>{h.text}</span>
                            {h.favourite && <span className="ml-1 text-amber-600">(★)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8">
                <p className="text-amber-800">
                  <strong>Next Steps:</strong> After completing Block 3, you can export your
                  full plan or return to the Make a Plan dashboard to review your work.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  variant="outline" 
                  onClick={handleExportPlan}
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" /> Export Plan (Coming Soon)
                </Button>
                
                <Button 
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                  onClick={handleCompleteBlock}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Complete Block 3 & Finalize Plan"} <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab("step2")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Timeline
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}