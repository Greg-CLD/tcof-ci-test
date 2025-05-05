import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCanvas } from "@/hooks/use-canvas";
import { useProjectContext } from "@/contexts/ProjectContext";
import { GoalMappingView } from "@/components/GoalMappingView";
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
  History, Loader2
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
          <span className="hidden sm:inline">Pro Tools</span>
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
  // Use a fixed map name instead of user input
  const mapName = "Project Goal Map";
  const [isEditing, setIsEditing] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProjectContext();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get the project ID from the context
  const projectId = currentProject?.id;
  
  // Fetch goal map data from server for the current project
  const {
    data: serverGoalMap,
    isLoading: goalMapLoading,
    error: goalMapError
  } = useQuery<GoalMapData>({
    queryKey: ['/api/goal-maps', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No project selected");
      const res = await apiRequest("GET", `/api/goal-maps?projectId=${projectId}`);
      if (!res.ok) {
        if (res.status === 404) {
          return null; // No goal map found for this project
        }
        throw new Error("Failed to fetch goal map");
      }
      return await res.json();
    },
    enabled: !!projectId,
  });
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps", projectId] });
      toast({
        title: "Map saved",
        description: "Your success map has been saved to your account.",
      });
      setIsEditing(false); // Switch to view mode after saving
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update existing map mutation
  const updateMapMutation = useMutation({
    mutationFn: async (data: { id: string, name: string, data: any }) => {
      const response = await apiRequest("PUT", `/api/goal-maps/${data.id}`, {
        name: data.name,
        data: data.data
      });
      if (!response.ok) {
        throw new Error("Failed to update map");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps", projectId] });
      toast({
        title: "Map updated",
        description: "Your success map has been updated successfully.",
      });
      setIsEditing(false); // Switch to view mode after saving
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Use the canvas hook with proper initialization
  const {
    canvasRef,
    svgRef,
    nodes,
    connections,
    addNode,
    deleteNode,
    clearCanvas,
    loadCanvasData,
  } = useCanvas({
    initialNodes: [], 
    initialConnections: []
  });
  
  // Switch to edit mode
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  // Load data when component mounts or project changes
  useEffect(() => {
    // Reset loading state when project changes
    if (projectId) {
      setIsLoading(true);
      
      // When we have a response from the server
      if (!goalMapLoading) {
        if (serverGoalMap && serverGoalMap.nodes && serverGoalMap.connections) {
          console.log("Loading goal map data from server:", serverGoalMap);
          
          // Load canvas data
          loadCanvasData({
            nodes: serverGoalMap.nodes,
            connections: serverGoalMap.connections
          });
          
          // Start in view mode for existing maps
          setIsEditing(false);
        } else {
          // If no map exists, start in edit mode with empty canvas
          clearCanvas();
          setIsEditing(true);
        }
        
        setHasLoadedData(true);
        setIsLoading(false);
      }
    }
  }, [projectId, serverGoalMap, goalMapLoading, loadCanvasData, clearCanvas]);
  
  // Handle adding a goal
  const handleAddGoal = () => {
    if (!goalInput.trim()) {
      toast({
        title: "Input required",
        description: "Please enter a goal description.",
        variant: "destructive"
      });
      return;
    }
    
    // Get canvas dimensions for positioning
    const canvas = canvasRef.current;
    let x = 100;
    let y = 100;
    
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      x = Math.random() * (rect.width - 200) + 100;
      y = Math.random() * (rect.height - 200) + 100;
    }
    
    // Add the node at the position
    addNode(goalInput, timeframeInput || '', x, y);
    setGoalInput("");
    setTimeframeInput("");
  };
  
  // Reset the canvas
  const handleReset = () => {
    if (confirm("Are you sure you want to reset your Success Map? This cannot be undone.")) {
      clearCanvas();
    }
  };
  
  // Save the map - now with fixed name and simplified flow
  const handleSaveMap = () => {
    if (nodes.length === 0) {
      toast({
        title: "Map is empty",
        description: "Please add at least one goal before saving.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // Create goal map data with fixed name
    const mapData: GoalMapData = {
      name: mapName, // Using our fixed name constant
      nodes: nodes,
      connections: connections,
      lastUpdated: Date.now(),
      projectId: projectId // Include project ID directly
    };
    
    // First save to localStorage for backup/offline use
    const success = saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, mapData);
    
    if (!success) {
      toast({
        title: "Error saving locally",
        description: "There was a problem saving your map to local storage.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    // Then save to database if user is logged in
    if (user && projectId) {
      // If we have a server goal map already, update it
      if (serverGoalMap?.id) {
        updateMapMutation.mutate({
          id: serverGoalMap.id,
          name: mapName,
          data: mapData
        });
      } else {
        // Otherwise create a new one
        saveMapMutation.mutate({
          name: mapName,
          data: mapData,
          projectId
        });
      }
    } else {
      toast({
        title: "Map saved locally",
        description: "Your map has been saved locally. Sign in to save it to your account.",
      });
      setIsLoading(false);
    }
  };
  
  // Export as PDF
  const handleExportPDF = () => {
    if (containerRef.current) {
      elementToPDF(containerRef.current, `${mapName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast({
        title: "PDF generated",
        description: "Your success map has been exported as PDF."
      });
    }
  };
  
  // No longer need map name handling since it's a fixed constant
  
  // Show loading state while fetching data
  if (goalMapLoading && !hasLoadedData) {
    return (
      <section className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-tcof-teal mx-auto mb-4" />
          <p className="text-tcof-dark">Loading your goal map...</p>
        </div>
      </section>
    );
  }
  
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
              <ol className="list-decimal pl-5 space-y-1">
                <li>Enter your goals at different levels (strategic, business, product)</li>
                <li>Drag to position goals on the canvas</li>
                <li>Connect related goals by clicking and dragging between them</li>
                <li>Save your map when you're done</li>
              </ol>
              <p className="mt-2 text-xs text-gray-600">
                Your map is automatically saved with your project, and you can return to edit it anytime.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* View mode - show static visualization */}
      {!isEditing && serverGoalMap ? (
        <GoalMappingView 
          map={serverGoalMap} 
          onEdit={handleEditClick}
          isLoading={isLoading || goalMapLoading}
          svgRef={svgRef}
        />
      ) : (
        /* Edit mode - show interactive editor */
        <>
          <Card className="mb-6">
            <CardContent className="p-4 md:p-6 space-y-4">
              {/* Map name is now fixed - display as heading */}
              <div>
                <h3 className="text-lg font-semibold">{mapName}</h3>
              </div>
              
              {/* Goal Input Form */}
              <div className="flex flex-col md:flex-row gap-3">
                <Input 
                  type="text" 
                  placeholder="Enter your goal"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="flex-grow"
                />
                
                <Select 
                  value={goalLevel} 
                  onValueChange={(value) => setGoalLevel(value as SuccessMapLevel)}
                >
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strategic">Strategic</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input 
                  type="text" 
                  placeholder="Timeframe (optional)"
                  value={timeframeInput}
                  onChange={(e) => setTimeframeInput(e.target.value)}
                  className="w-full md:w-40"
                />
                
                <Button 
                  onClick={handleAddGoal}
                  className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
                >
                  Add Goal
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Canvas for Goal Mapping */}
          <div ref={containerRef} className="bg-white border rounded-md p-4 min-h-[500px] mb-6 relative">
            {/* Canvas SVG */}
            <div ref={canvasRef} className="w-full h-[500px]">
              {/* This div will contain the SVG element */}
              <svg ref={svgRef} width="100%" height="100%"></svg>
            </div>
            
            {/* Goal Explanation */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6 bg-white bg-opacity-90 rounded-md">
                  <TargetIcon className="h-12 w-12 text-tcof-teal mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Start Building Your Success Map</h3>
                  <p className="text-gray-600 max-w-md">
                    Add goals, position them on the canvas, and connect related goals to visualize your success path.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleReset}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Canvas
              </Button>
              
              <Button 
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={handleExportPDF}
                disabled={isLoading || nodes.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </div>
            
            <Button 
              className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
              onClick={handleSaveMap}
              disabled={isLoading || nodes.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Map
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}