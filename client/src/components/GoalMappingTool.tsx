import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useProgress } from "@/contexts/ProgressContext";
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
  History, Loader2, Clock
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

interface GoalMappingToolProps {
  projectId?: string | null;
}

export default function GoalMappingTool({ projectId: propProjectId }: GoalMappingToolProps) {
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
  
  // Get the project ID from props or context
  const projectId = propProjectId || currentProject?.id;
  
  // Fetch the actual project to ensure we have the correct ID format (UUID)
  const {
    data: projectData,
    isLoading: projectLoading,
  } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No project selected");
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch project data");
      }
      return await res.json();
    },
    enabled: !!projectId,
  });
  
  // Use the project UUID from the fetched project data
  const projectUuid = projectData?.id;
  
  // Log for debugging
  useEffect(() => {
    console.log(`GoalMappingTool: Using projectId: ${projectId} (from props: ${propProjectId}, from context: ${currentProject?.id})`);
    console.log(`GoalMappingTool: Fetched UUID: ${projectUuid}`);
  }, [projectId, propProjectId, currentProject?.id, projectUuid]);
  
  // Fetch goal map data from server for the current project
  const {
    data: serverGoalMap,
    isLoading: goalMapLoading,
    error: goalMapError
  } = useQuery<GoalMapData>({
    queryKey: ['/api/goal-maps', projectUuid],
    queryFn: async () => {
      if (!projectUuid) throw new Error("No project UUID available");
      const res = await apiRequest("GET", `/api/goal-maps?projectId=${projectUuid}`);
      if (!res.ok) {
        if (res.status === 404) {
          return null; // No goal map found for this project
        }
        throw new Error("Failed to fetch goal map");
      }
      return await res.json();
    },
    enabled: !!projectUuid,
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
    onSuccess: (savedMap) => {
      // Use the saved map's project ID for query invalidation to ensure consistency
      const savedMapProjectId = savedMap.projectId || projectUuid;
      
      // Invalidate the specific query
      queryClient.invalidateQueries({ queryKey: ['/api/goal-maps', savedMapProjectId] });
      
      // Also invalidate the general goal maps list
      queryClient.invalidateQueries({ queryKey: ['/api/goal-maps'] });
      
      // Invalidate the project-progress query to update tool completion status
      queryClient.invalidateQueries({ queryKey: ['project-progress', savedMapProjectId] });
      
      toast({
        title: "Map saved",
        description: "Your success map has been saved to your account.",
      });
      
      // Refresh the server goal map data
      if (projectUuid) {
        queryClient.refetchQueries({ queryKey: ['/api/goal-maps', projectUuid] });
      }
      
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
    onSuccess: (updatedMap) => {
      // Use the updated map's project ID for query invalidation to ensure consistency
      const updatedMapProjectId = updatedMap.projectId || projectUuid;
      
      // Invalidate the specific query
      queryClient.invalidateQueries({ queryKey: ['/api/goal-maps', updatedMapProjectId] });
      
      // Also invalidate the general goal maps list
      queryClient.invalidateQueries({ queryKey: ['/api/goal-maps'] });
      
      // Invalidate the project-progress query to update tool completion status
      queryClient.invalidateQueries({ queryKey: ['project-progress', updatedMapProjectId] });
      
      // Add debug logs
      console.log(`Invalidated goal maps and progress for project: ${updatedMapProjectId}`);
      
      // Refresh the data immediately to ensure view is updated
      if (projectUuid) {
        queryClient.refetchQueries({ queryKey: ['/api/goal-maps', projectUuid] });
      }
      
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
  
  // Use progress context to trigger a refetch after completion
  const { refetch: refetchProgress } = useProgress();
  
  // Mutation for marking the goal mapping as complete
  const submitPlanMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("POST", "/api/project-progress/goal-mapping/complete", {
        projectId
      });
      if (!response.ok) {
        throw new Error("Failed to submit plan");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the project-progress query to update tool completion status
      if (projectUuid) {
        queryClient.invalidateQueries({ queryKey: ['project-progress', projectUuid] });
        // Force a refetch of the progress data
        refetchProgress();
      }
      
      toast({
        title: "Plan submitted",
        description: "Your goal mapping has been marked as complete.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle submitting the plan
  const handleSubmitPlan = () => {
    if (nodes.length === 0) {
      toast({
        title: "Map is empty",
        description: "Please add at least one goal before submitting your plan.",
        variant: "destructive"
      });
      return;
    }
    
    // First save the current map if needed
    if (nodes.length > 0 && user && projectUuid) {
      // If we have existing data on server, update it first
      if (serverGoalMap?.id) {
        // Create updated map data
        const mapData: GoalMapData = {
          name: mapName,
          nodes: nodes,
          connections: connections,
          lastUpdated: Date.now(),
          projectId: projectUuid
        };
        
        // Update the server-side map
        updateMapMutation.mutate({
          id: serverGoalMap.id,
          name: mapName,
          data: mapData
        });
      } else {
        // Otherwise create a new one
        const mapData: GoalMapData = {
          name: mapName,
          nodes: nodes,
          connections: connections,
          lastUpdated: Date.now(),
          projectId: projectUuid
        };
        
        saveMapMutation.mutate({
          name: mapName,
          data: mapData,
          projectId: projectUuid
        });
      }
    }
    
    // Then mark the tool as complete
    if (projectUuid) {
      submitPlanMutation.mutate(projectUuid);
    } else {
      toast({
        title: "Error submitting plan",
        description: "No project ID available. Please save your map first.",
        variant: "destructive"
      });
    }
  };
  
  // Use the canvas hook with proper initialization
  const {
    canvasRef,
    svgRef,
    nodes,
    connections,
    addNode,
    deleteNode: originalDeleteNode,
    clearCanvas,
    loadCanvasData,
  } = useCanvas({
    initialNodes: [], 
    initialConnections: []
  });
  
  // Wrapper for deleteNode that also updates the server
  const deleteNode = useCallback((nodeId: string) => {
    // First, delete the node locally
    originalDeleteNode(nodeId);
    
    // Then update the server if we have a server goal map
    if (user && projectUuid && serverGoalMap?.id) {
      // Create updated map data without the deleted node
      const updatedNodes = nodes.filter(node => node.id !== nodeId);
      const updatedConnections = connections.filter(
        conn => conn.sourceId !== nodeId && conn.targetId !== nodeId
      );
      
      const mapData: GoalMapData = {
        name: mapName,
        nodes: updatedNodes,
        connections: updatedConnections,
        lastUpdated: Date.now(),
        projectId: projectUuid // Use projectUuid for consistent format
      };
      
      // Update the server-side map
      updateMapMutation.mutate({
        id: serverGoalMap.id,
        name: mapName,
        data: mapData
      });
      
      // Also update local storage
      saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, mapData);
    }
  }, [originalDeleteNode, nodes, connections, user, projectUuid, serverGoalMap, updateMapMutation, mapName]);
  
  // Switch to edit mode
  const handleEditClick = () => {
    setIsEditing(true);
  };
  
  // Load data when component mounts or project changes
  useEffect(() => {
    // Reset loading state when project changes
    if (projectId) {
      setIsLoading(true);
      
      const loadSavedData = async () => {
        // First try to get data from server
        if (!goalMapLoading) {
          if (serverGoalMap && serverGoalMap.nodes && serverGoalMap.connections) {
            console.log("Loading goal map data from server:", serverGoalMap);
            
            // Load canvas data
            loadCanvasData({
              nodes: serverGoalMap.nodes,
              connections: serverGoalMap.connections
            });
            
            // Also save to localStorage for offline access
            saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, serverGoalMap);
            
            // Start in view mode for existing maps
            setIsEditing(false);
            setHasLoadedData(true);
            setIsLoading(false);
            return;
          } 
          
          // If no server data, try local storage
          try {
            const localData = await loadFromLocalStorage<GoalMapData>(STORAGE_KEYS.GOAL_MAP);
            if (localData && localData.nodes && localData.connections) {
              console.log("Loading goal map data from local storage:", localData);
              
              // Only use local data if it matches the current project
              if (localData.projectId === projectId) {
                loadCanvasData({
                  nodes: localData.nodes,
                  connections: localData.connections
                });
                
                // Start in view mode for existing maps
                setIsEditing(false);
                setHasLoadedData(true);
                setIsLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error("Error loading from local storage:", error);
          }
          
          // If no data found at all, start with empty canvas in edit mode
          clearCanvas();
          setIsEditing(true);
          setHasLoadedData(true);
          setIsLoading(false);
        }
      };
      
      loadSavedData();
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
    
    // Add the node at the position with the selected level
    const newNodeId = addNode(goalInput, timeframeInput || '', x, y);
    
    // Update the node type based on selected goal level
    if (newNodeId) {
      const updatedNodes = nodes.map(node => {
        if (node.id === newNodeId) {
          return { ...node, type: goalLevel };
        }
        return node;
      });
      
      // Update the nodes state with the modified nodes
      loadCanvasData({
        nodes: updatedNodes,
        connections: connections
      });
      
      // Save the updated nodes to the server if we already have a map saved
      if (user && projectUuid && serverGoalMap?.id) {
        console.log(`Adding goal for project UUID: ${projectUuid}`);
        
        // Create updated map data with the new goal
        const mapData: GoalMapData = {
          name: mapName,
          nodes: updatedNodes,
          connections: connections,
          lastUpdated: Date.now(),
          projectId: projectUuid // Use projectUuid for consistent format
        };
        
        // Update the server-side map
        updateMapMutation.mutate({
          id: serverGoalMap.id,
          name: mapName,
          data: mapData
        });
        
        // Also update local storage
        saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, mapData);
      }
    }
    
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
      projectId: projectUuid // Use projectUuid for consistent format
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
    if (user && projectUuid) {
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
          projectId: projectUuid // Pass the UUID format
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
          
          {/* Goals Table Display */}
          <div ref={containerRef} className="bg-white border rounded-md p-4 mb-6 relative">
            {nodes.length > 0 ? (
              <div className="space-y-6">
                {/* Group nodes by type/level */}
                {(() => {
                  // Group nodes by level (or type)
                  const goalsByLevel = nodes.reduce((acc: Record<string, any[]>, node: any) => {
                    // Default to the selected goal level if no type is available
                    const level = node.type || goalLevel;
                    if (!acc[level]) {
                      acc[level] = [];
                    }
                    acc[level].push(node);
                    return acc;
                  }, {});
                  
                  // Get a user-friendly level name
                  const getLevelName = (level: string) => {
                    switch(level) {
                      case 'strategic': return 'Strategic Goals';
                      case 'business': return 'Business Goals';
                      case 'product': return 'Product Goals';
                      case 'custom': return 'Custom Goals';
                      default: return `${level.charAt(0).toUpperCase() + level.slice(1)} Goals`;
                    }
                  };
                  
                  return Object.entries(goalsByLevel).map(([level, goals]) => (
                    <div key={level} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-3 border-b font-medium text-gray-700">
                        {getLevelName(level)} ({goals.length})
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-2 px-4 text-left font-medium text-gray-600">Goal</th>
                            <th className="py-2 px-4 text-left font-medium text-gray-600 w-1/4">Timeframe</th>
                            <th className="py-2 px-4 text-left font-medium text-gray-600 w-1/5">Related Goals</th>
                            <th className="py-2 px-4 text-right font-medium text-gray-600 w-[100px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {goals.map((goal) => {
                            // Find related goals based on connections
                            const relatedGoals = connections
                              .filter(conn => conn.sourceId === goal.id || conn.targetId === goal.id)
                              .map(conn => {
                                const relatedId = conn.sourceId === goal.id ? conn.targetId : conn.sourceId;
                                const related = nodes.find(n => n.id === relatedId);
                                return related?.text || '';
                              });
                            
                            return (
                              <tr key={goal.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="flex items-start">
                                    <TargetIcon className="w-5 h-5 text-tcof-teal mt-0.5 mr-2 flex-shrink-0" />
                                    <span>{goal.text}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  {goal.timeframe ? (
                                    <div className="flex items-center text-gray-600">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4 mr-1 text-gray-400"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      <span>{goal.timeframe}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">No timeframe</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {relatedGoals.length > 0 ? (
                                    <div className="text-xs space-y-1">
                                      {relatedGoals.map((text, i) => (
                                        <div key={i} className="bg-gray-100 rounded px-2 py-1 inline-block mr-1 mb-1 truncate max-w-[150px]" title={text}>
                                          {text.length > 20 ? `${text.substring(0, 20)}...` : text}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">None</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                    onClick={() => deleteNode(goal.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-center p-6 bg-white rounded-md">
                  <TargetIcon className="h-12 w-12 text-tcof-teal mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Start Building Your Success Map</h3>
                  <p className="text-gray-600 max-w-md">
                    Add goals using the form above and organize them by level to create your success map.
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
                Reset Goals
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
            
            <div className="flex gap-2">
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
              
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSubmitPlan}
                disabled={isLoading || nodes.length === 0 || submitPlanMutation.isPending}
              >
                {submitPlanMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Submit Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}