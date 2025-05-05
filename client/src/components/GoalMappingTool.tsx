import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCanvas } from "@/hooks/use-canvas";
import {
  STORAGE_KEYS,
  GoalMapData,
  initialGoalMapData,
  loadFromLocalStorage,
  saveToLocalStorage
} from "@/lib/storage";
import { elementToPDF } from "@/lib/pdf-utils";
import { Link } from "wouter";
import { 
  FileDown, ArrowLeft, Target as TargetIcon, Compass as CompassIcon, 
  GitBranch as GitBranchIcon, File as FileIcon, Save, Download, Trash2,
  History
} from "lucide-react";

// Success Map Level types
type SuccessMapLevel = "strategic" | "business" | "product" | "custom";

type ToolNavLinkProps = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  isCurrent?: boolean;
};

function ToolNavLink({ href, label, icon, isCurrent = false }: ToolNavLinkProps) {
  return (
    <Link href={href}>
      <Button 
        variant={isCurrent ? "default" : "ghost"} 
        size="sm"
        className={`flex items-center gap-1 ${isCurrent ? 'bg-tcof-teal text-white hover:bg-tcof-teal/90' : 'text-tcof-dark hover:bg-tcof-light'}`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </Link>
  );
}

function ToolNavigation({ currentTool }: { currentTool: 'goal-mapping' | 'cynefin' | 'tcof-journey' }) {
  return (
    <div className="flex justify-between items-center w-full mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Button>
        </Link>
      </div>
      
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <ToolNavLink 
          href="/tools/goal-mapping" 
          label="Goal-Mapping" 
          icon={<TargetIcon className="h-4 w-4" />} 
          isCurrent={currentTool === 'goal-mapping'} 
        />
        <ToolNavLink 
          href="/tools/cynefin-orientation" 
          label="Cynefin" 
          icon={<CompassIcon className="h-4 w-4" />} 
          isCurrent={currentTool === 'cynefin'} 
        />
        <ToolNavLink 
          href="/tools/tcof-journey" 
          label="TCOF Journey" 
          icon={<GitBranchIcon className="h-4 w-4" />} 
          isCurrent={currentTool === 'tcof-journey'} 
        />
      </div>
      
      <Link href="/tools/starter-access">
        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-tcof-teal">
          <FileIcon className="h-4 w-4" />
          <span className="hidden sm:inline">View Saved Results</span>
          <span className="sm:hidden">Results</span>
        </Button>
      </Link>
    </div>
  );
}

export default function GoalMappingTool() {
  const [goalInput, setGoalInput] = useState("");
  const [goalLevel, setGoalLevel] = useState<SuccessMapLevel>("strategic");
  const [timeframeInput, setTimeframeInput] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [mapName, setMapName] = useState("My Success Map");
  const { toast } = useToast();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Database save mutation
  const saveMapMutation = useMutation({
    mutationFn: async (data: { name: string, data: any, projectId?: string }) => {
      const response = await apiRequest("POST", "/api/goal-maps", data);
      if (!response.ok) {
        throw new Error("Failed to save map to database");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps"] });
      toast({
        title: "Map saved",
        description: "Your success map has been saved to your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Load existing data from local storage
  const storedData = loadFromLocalStorage<GoalMapData>(STORAGE_KEYS.GOAL_MAP) || initialGoalMapData;
  
  const {
    canvasRef,
    svgRef,
    nodes,
    connections,
    addNode,
    deleteNode,
    clearCanvas
  } = useCanvas({
    initialNodes: storedData.nodes,
    initialConnections: storedData.connections,
    onNodeChange: (updatedNodes) => {
      saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, {
        nodes: updatedNodes,
        connections,
        lastUpdated: Date.now()
      });
    },
    onConnectionChange: (updatedConnections) => {
      saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, {
        nodes,
        connections: updatedConnections,
        lastUpdated: Date.now()
      });
    }
  });

  // Handle adding a new goal
  const handleAddGoal = () => {
    if (goalInput.trim() === "") {
      toast({
        title: "Goal text required",
        description: "Please enter a goal before adding.",
        variant: "destructive"
      });
      return;
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Place the new node in a reasonable default position
      const x = Math.random() * (rect.width - 200) + 50;
      const y = Math.random() * (rect.height - 100) + 50;
      
      // Add level prefix to goal timeframe
      let levelPrefix = "";
      switch (goalLevel) {
        case "strategic":
          levelPrefix = "Level 5: Strategic";
          break;
        case "business":
          levelPrefix = "Level 4: Business";
          break;
        case "product":
          levelPrefix = "Level 3: Product";
          break;
        default:
          levelPrefix = "Custom";
      }
      
      const formattedTimeframe = timeframeInput ? 
        `${levelPrefix} - ${timeframeInput}` : 
        levelPrefix;
      
      addNode(goalInput, formattedTimeframe, x, y);
      setGoalInput("");
      setTimeframeInput("");
      
      toast({
        title: "Goal added",
        description: "Your goal has been added to the success map."
      });
    }
  };

  // Handle saving the map
  const handleSaveMap = () => {
    // First save to localStorage for offline use
    const data = {
      nodes,
      connections,
      lastUpdated: Date.now()
    };
    
    const success = saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, data);
    
    if (!success) {
      toast({
        title: "Error saving locally",
        description: "There was a problem saving your success map to local storage.",
        variant: "destructive"
      });
      return;
    }
    
    // Then save to database if user is logged in
    if (user) {
      // Get current project ID from localStorage
      const projectId = localStorage.getItem('selectedProjectId');
      
      if (!projectId) {
        toast({
          title: "Warning",
          description: "No project selected. The map will be saved but not linked to any project.",
          variant: "destructive"
        });
      }
      
      saveMapMutation.mutate({
        name: mapName,
        data: data,
        projectId: projectId || undefined
      });
    } else {
      toast({
        title: "Map saved locally",
        description: "Your success map has been saved locally. Sign in to save it to your account.",
      });
    }
  };

  // Handle exporting the map
  const handleExportMap = () => {
    try {
      // Create a downloadable JSON file
      const dataStr = JSON.stringify({ nodes, connections });
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      
      const exportName = `success-map-${new Date().toISOString().slice(0, 10)}`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", `${exportName}.json`);
      linkElement.click();
      
      toast({
        title: "Map exported",
        description: "Your success map has been exported as JSON."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your success map.",
        variant: "destructive"
      });
    }
  };

  // Handle clearing the canvas
  const handleClearCanvas = () => {
    if (confirm("Are you sure you want to clear the canvas? This action cannot be undone.")) {
      clearCanvas();
      toast({
        title: "Canvas cleared",
        description: "All goals and connections have been removed."
      });
    }
  };

  return (
    <section>
      <ToolNavigation currentTool="goal-mapping" />
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">🎯 Goal-Mapping Tool</h2>
          <p className="text-gray-600">Create your Success Map to identify and connect your strategic goals.</p>
        </div>
        <Link href="/history">
          <Button variant="outline" size="sm" className="flex items-center gap-1 text-tcof-teal border-tcof-teal">
            <History className="h-4 w-4" />
            <span>View History</span>
          </Button>
        </Link>
      </div>
      
      {showIntro && (
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">Why identify goals?</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowIntro(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-lg"></i>
              </Button>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p>You need to know where you're going, before you can work out how to get there.</p>
              
              <h4 className="font-bold mt-4 mb-2">How to create your Success Map:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Start with the Success Map, working top down</li>
                <li>Focus on organisational Value Goals and outcomes (Levels 3-5) first. You can focus on Delivery Goals later (Levels 1-2)</li>
                <li>Set one clear goal per level, or up to three if needed</li>
                <li>Try to keep your total under 10. Fewer goals mean more focus, less stress, and better follow-through</li>
              </ol>
              
              <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-blue-800 font-medium">Key Tip: Don't overthink this exercise, it is best done as an individual or a very small group. We focus much more on this in Stage 1 and the first success factor.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">Start Your Success Map</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-800">Level 5. Strategic Success</h4>
                <p className="text-sm text-gray-700">Big-picture impact, beyond the business.</p>
                <p className="text-xs mt-2 text-blue-700 italic">Ask: What would 10x success look like?</p>
                <p className="text-xs mt-1 text-gray-500">Example: Influence 100,000 project managers to adopt this approach.</p>
              </div>
              
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <h4 className="font-medium text-green-800">Level 4. Business Success</h4>
                <p className="text-sm text-gray-700">Tangible value delivered to the organisation.</p>
                <p className="text-xs mt-2 text-green-700 italic">Ask: What value will this project deliver?</p>
                <p className="text-xs mt-1 text-gray-500">Example: Reduce operating costs by 10% in 12 months.</p>
              </div>
              
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <h4 className="font-medium text-purple-800">Level 3. Product Success</h4>
                <p className="text-sm text-gray-700">Whether the solution works and meets user needs.</p>
                <p className="text-xs mt-2 text-purple-700 italic">Ask: How will we know users are satisfied?</p>
                <p className="text-xs mt-1 text-gray-500">Example: Net promoter score of 8 out of 10.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="md:w-1/4 space-y-2">
              <label htmlFor="level-select" className="block text-sm font-medium text-gray-700">
                Success Level
              </label>
              <Select value={goalLevel} onValueChange={(value) => setGoalLevel(value as SuccessMapLevel)}>
                <SelectTrigger id="level-select">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategic">Level 5: Strategic Success</SelectItem>
                  <SelectItem value="business">Level 4: Business Success</SelectItem>
                  <SelectItem value="product">Level 3: Product Success</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-grow space-y-2">
              <label htmlFor="goal-input" className="block text-sm font-medium text-gray-700">
                Add Goal
              </label>
              <Input
                id="goal-input"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Enter your goal..."
              />
            </div>
            
            <div className="md:w-1/5 space-y-2">
              <label htmlFor="timeframe-input" className="block text-sm font-medium text-gray-700">
                Timeframe (Optional)
              </label>
              <Input
                id="timeframe-input"
                value={timeframeInput}
                onChange={(e) => setTimeframeInput(e.target.value)}
                placeholder="e.g., 12 months"
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleAddGoal} className="h-10">Add Goal</Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <div className="w-full md:w-1/3">
              <label htmlFor="map-name" className="block text-sm font-medium text-gray-700 mb-1">
                Map Name
              </label>
              <Input
                id="map-name"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                placeholder="Enter a name for your map"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={handleSaveMap} variant="secondary" className="flex items-center gap-1">
                <Save className="h-4 w-4" /> Save Map
              </Button>
              <Button onClick={handleExportMap} variant="outline" className="flex items-center gap-1">
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button 
                onClick={() => {
                  if (canvasRef.current) {
                    elementToPDF(canvasRef.current, 'goal-mapping-tool.pdf');
                    toast({
                      title: "PDF generated",
                      description: "Your success map has been exported as PDF."
                    });
                  }
                }} 
                variant="outline" 
                className="flex items-center gap-1 bg-tcof-light text-tcof-dark border-tcof-teal"
              >
                <FileDown className="h-4 w-4" /> Download as PDF
              </Button>
            </div>
          </div>

          <div 
            className="border border-gray-200 rounded-lg h-96 relative" 
            ref={containerRef}
          >
            <div id="goal-canvas" className="absolute inset-0 bg-gray-50 overflow-hidden" ref={canvasRef}>
              <svg 
                width="100%" 
                height="100%" 
                ref={svgRef}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}
              >
                {/* Render connections */}
                {connections.map(connection => {
                  const sourceNode = nodes.find(n => n.id === connection.sourceId);
                  const targetNode = nodes.find(n => n.id === connection.targetId);
                  
                  if (sourceNode && targetNode) {
                    return (
                      <line
                        key={connection.id}
                        x1={sourceNode.x + 75} // Approximate center of node
                        y1={sourceNode.y + 25}
                        x2={targetNode.x + 75}
                        y2={targetNode.y + 25}
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    );
                  }
                  return null;
                })}
              </svg>
              
              {/* Render nodes */}
              {nodes.map(node => (
                <div
                  key={node.id}
                  className="text-node"
                  style={{ top: node.y, left: node.x }}
                  data-id={node.id}
                >
                  <button 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(node.id);
                      toast({
                        title: "Goal deleted",
                        description: "The goal has been removed from your map."
                      });
                    }}
                  >
                    ×
                  </button>
                  <div className="text-sm font-medium">{node.text}</div>
                  {node.timeframe && (
                    <div className="text-xs text-gray-500">{node.timeframe}</div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Help overlay */}
            {showHelp && (
              <div className="absolute inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-10">
                <div className="bg-white p-6 rounded-lg max-w-md">
                  <h3 className="text-lg font-bold mb-2">Success Map Instructions</h3>
                  <ul className="list-disc pl-5 mb-4 text-sm">
                    <li>Choose a success level, enter your goal, and click "Add Goal"</li>
                    <li>Drag goals to reposition them on the canvas</li>
                    <li>Click the X on a goal to delete it</li>
                    <li>Save your map to keep track of your strategic goals</li>
                  </ul>
                  <Button onClick={() => setShowHelp(false)}>Got it!</Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={handleClearCanvas}
              className="text-gray-600 hover:text-red-500 text-sm font-medium transition flex items-center"
            >
              <i className="ri-delete-bin-line mr-1"></i> Clear Canvas
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setShowHelp(true)}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium transition flex items-center"
            >
              <i className="ri-question-line mr-1"></i> How to use
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
