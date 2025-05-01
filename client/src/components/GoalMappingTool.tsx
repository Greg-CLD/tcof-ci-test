import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCanvas } from "@/hooks/use-canvas";
import {
  STORAGE_KEYS,
  GoalMapData,
  initialGoalMapData,
  loadFromLocalStorage,
  saveToLocalStorage
} from "@/lib/storage";

export default function GoalMappingTool() {
  const [goalInput, setGoalInput] = useState("");
  const [timeframeInput, setTimeframeInput] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
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
      
      addNode(goalInput, timeframeInput, x, y);
      setGoalInput("");
      setTimeframeInput("");
      
      toast({
        title: "Goal added",
        description: "Your goal has been added to the canvas."
      });
    }
  };

  // Handle saving the map
  const handleSaveMap = () => {
    const success = saveToLocalStorage(STORAGE_KEYS.GOAL_MAP, {
      nodes,
      connections,
      lastUpdated: Date.now()
    });
    
    if (success) {
      toast({
        title: "Map saved",
        description: "Your goal map has been saved successfully.",
      });
    } else {
      toast({
        title: "Error saving",
        description: "There was a problem saving your goal map.",
        variant: "destructive"
      });
    }
  };

  // Handle exporting the map
  const handleExportMap = () => {
    try {
      // Create a downloadable JSON file
      const dataStr = JSON.stringify({ nodes, connections });
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      
      const exportName = `goal-map-${new Date().toISOString().slice(0, 10)}`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", `${exportName}.json`);
      linkElement.click();
      
      toast({
        title: "Map exported",
        description: "Your goal map has been exported as JSON."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your goal map.",
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🎯 Goal-Mapping Tool</h2>
        <p className="text-gray-600">Map your strategic goals and organize your initiatives visually.</p>
      </div>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-grow space-y-2">
              <label htmlFor="goal-input" className="block text-sm font-medium text-gray-700">
                Add Strategic Goal
              </label>
              <Input
                id="goal-input"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Enter your strategic goal..."
                className="rounded-r-none"
              />
            </div>
            <div className="md:w-1/4 space-y-2">
              <label htmlFor="timeframe-input" className="block text-sm font-medium text-gray-700">
                Timeframe (Optional)
              </label>
              <Input
                id="timeframe-input"
                value={timeframeInput}
                onChange={(e) => setTimeframeInput(e.target.value)}
                placeholder="e.g., Q2 2023"
                className="rounded-none"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddGoal} className="rounded-l-none h-10">Add</Button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mb-4">
            <Button onClick={handleSaveMap} variant="secondary" className="flex items-center gap-1">
              <i className="ri-save-line"></i> Save Map
            </Button>
            <Button onClick={handleExportMap} variant="outline" className="flex items-center gap-1">
              <i className="ri-download-line"></i> Export
            </Button>
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
                  <div className="text-sm font-medium">{node.text}</div>
                  {node.timeframe && (
                    <div className="text-xs text-gray-500">{node.timeframe}</div>
                  )}
                  <button 
                    className="absolute top-1 right-1 text-gray-400 hover:text-red-500"
                    onClick={() => deleteNode(node.id)}
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              ))}
            </div>
            
            {/* Help overlay */}
            {showHelp && (
              <div className="absolute inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-10">
                <div className="bg-white p-6 rounded-lg max-w-md">
                  <h3 className="text-lg font-bold mb-2">Goal-Mapping Instructions</h3>
                  <ul className="list-disc pl-5 mb-4 text-sm">
                    <li>Click "Add" to place a new goal on the canvas</li>
                    <li>Drag goals to reposition them</li>
                    <li>Connect related goals by dragging from one goal to another</li>
                    <li>Click the X on a goal to delete it</li>
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
