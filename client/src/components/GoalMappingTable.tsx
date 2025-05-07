import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useProgress } from "@/contexts/ProgressContext";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2, CheckCircle } from "lucide-react";

// Table-specific Goal Node type (adds level)
interface GoalTableRow {
  id: string;
  text: string;
  timeframe: string;
  level: number;
}

// Data structure for the Goal Map
interface GoalMapData {
  name: string;
  goals: GoalTableRow[];
  lastUpdated: number;
  id?: string;
  projectId?: string;
}

interface GoalMappingTableProps {
  projectId: string;
}

export function GoalMappingTable({ projectId }: GoalMappingTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { refreshProgress } = useProgress();
  
  // State to track the current goal map data
  const [goalMap, setGoalMap] = useState<GoalMapData>({
    name: "Project Goals",
    goals: [],
    lastUpdated: Date.now(),
    projectId
  });
  
  // State to track if the map is being saved
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch existing goal map for this project
  const { data: existingGoalMap, isLoading } = useQuery<GoalMapData>({
    queryKey: ['/api/goal-maps', projectId],
    queryFn: async () => {
      console.log("FETCH GOAL MAP REQUEST:", `/api/goal-maps?projectId=${projectId}`);
      const res = await apiRequest("GET", `/api/goal-maps?projectId=${projectId}`);
      if (!res.ok) {
        if (res.status === 404) {
          console.log("No goal map found (404) – using empty template");
          return {
            name: "Project Goals",
            goals: [],
            lastUpdated: Date.now(),
            projectId
          };
        }
        throw new Error("Failed to fetch goal map");
      }
      const json = await res.json();
      console.log("FETCH GOAL MAP RESPONSE:", json);
      
      // Preserve previously loaded goals if the new payload has none
      if (json.goals?.length === 0) {
        console.log("Fetched JSON.goals is empty – preserving previous state");
        if (existingGoalMap && existingGoalMap.goals && existingGoalMap.goals.length > 0) {
          console.log('Using existing goals from cache:', existingGoalMap.goals.length);
          json.goals = existingGoalMap.goals;
        }
      }
      return json;
    },
    enabled: !!projectId
  });
  
  // Load data from server when available
  useEffect(() => {
    if (existingGoalMap) {
      console.log("Loading goal map data from server:", existingGoalMap);
      
      // Initialize the goal map structure if needed
      let goalMapData = { ...existingGoalMap };
      
      // Convert nodes from old structure if needed
      if (!goalMapData.goals && (goalMapData as any).nodes) {
        // Handle legacy format with nodes
        const nodes = (goalMapData as any).nodes || [];
        const convertedGoals = nodes.map((node: any, index: number) => ({
          id: node.id,
          text: node.text,
          // Ensure timeframe is always a string, even if empty
          timeframe: node.timeframe !== undefined && node.timeframe !== null ? node.timeframe : "",
          level: Math.min(Math.floor(index / 3) + 1, 5) // Assign levels based on index
        }));
        
        goalMapData = {
          ...goalMapData,
          goals: convertedGoals
        };
      } else if (!goalMapData.goals) {
        // Initialize empty array if neither format exists
        goalMapData.goals = [];
      } else {
        // Normalize timeframe values for existing goals
        goalMapData.goals = goalMapData.goals.map((goal: any) => ({
          ...goal,
          // Ensure timeframe is always a string, even if empty
          timeframe: goal.timeframe !== undefined && goal.timeframe !== null ? goal.timeframe : ""
        }));
      }
      
      console.log("Normalized goal map data:", goalMapData);
      setGoalMap(goalMapData);
    }
  }, [existingGoalMap]);
  
  // Save goal map mutation
  const saveGoalMapMutation = useMutation({
    mutationFn: async (data: GoalMapData) => {
      if (!data.projectId) {
        throw new Error("Project ID is required");
      }
      
      // Ensure projectId is properly formatted as a string
      const projectIdStr = String(data.projectId);
      
      // Ensure we have all required fields with proper structure for the server API
      const payload = {
        projectId: projectIdStr,
        name: data.name || "Goal Map",
        data: {
          // Include projectId in the data object for consistent handling
          projectId: projectIdStr,
          goals: data.goals || [],
          // Additional metadata to ensure complete data object
          timestamp: new Date().toISOString(),
          version: "1.0"
        }
      };
      
      // Log full payload before sending
      console.log("SAVE DRAFT - Sending goal map payload:", JSON.stringify(payload, null, 2));
      
      // Check if we're updating or creating a new map
      if (data.id) {
        console.log(`SAVE DRAFT - Updating existing goal map ${data.id} for project ${projectIdStr}`);
        // Update existing map
        const response = await apiRequest("PUT", `/api/goal-maps/${data.id}`, payload);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`SAVE DRAFT - Update failed with status ${response.status}: ${errorText}`);
          throw new Error(`Failed to update goal map: ${errorText}`);
        }
        
        const resultData = await response.json();
        console.log(`SAVE DRAFT - Update succeeded. Response data:`, JSON.stringify(resultData, null, 2));
        return resultData;
      } else {
        console.log(`SAVE DRAFT - Creating new goal map for project ${projectIdStr}`);
        // Create new map
        const response = await apiRequest("POST", "/api/goal-maps", payload);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`SAVE DRAFT - Creation failed with status ${response.status}: ${errorText}`);
          throw new Error(`Failed to save goal map: ${errorText}`);
        }
        
        const resultData = await response.json();
        console.log(`SAVE DRAFT - Creation succeeded. Response data:`, JSON.stringify(resultData, null, 2));
        return resultData;
      }
    },
    onSuccess: (data) => {
      // Update the map ID after saving a new map
      setGoalMap(prev => ({ ...prev, id: data.id }));
      
      console.log("SAVE DRAFT - Goal map saved successfully. Response:", data);
      
      // Ensure projectId is a string for consistent cache invalidation
      const projectIdStr = String(projectId);
      
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/goal-maps'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goal-maps', projectIdStr] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectIdStr] });
      
      toast({
        title: "Goal map saved",
        description: "Your goals have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Error saving goal map:", error);
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  // Submit plan mutation
  const submitPlanMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project selected");
      
      // Ensure projectId is properly formatted as a string
      const projectIdStr = String(projectId);
      
      // Prepare payload with consistently formatted ID
      const payload = { projectId: projectIdStr };
      console.log("SUBMIT PLAN - Sending payload:", JSON.stringify(payload, null, 2));
      
      // Mark the goal mapping as complete
      const response = await apiRequest("POST", "/api/project-progress/goal-mapping/complete", payload);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SUBMIT PLAN - Failed with status ${response.status}: ${errorText}`);
        throw new Error(`Failed to mark goal mapping as complete: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // Log the raw JSON response
      console.log("SUBMIT PLAN RESPONSE RAW:", data);
      
      toast({
        title: "Plan submitted successfully",
        description: "Your Goal Mapping has been marked as complete.",
      });
      
      // Ensure projectId is a string for consistent cache invalidation
      const projectIdStr = String(projectId);
      
      // Refresh progress to update UI
      if (refreshProgress) {
        console.log("SUBMIT PLAN - Refreshing project progress after Goal Mapping completion");
        refreshProgress();
      }
      
      // Invalidate all relevant queries to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ["project-progress", projectIdStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps", projectIdStr] });
      
      // Also invalidate the general project queries as progress might be shown there
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectIdStr] });
    },
    onError: (error: Error) => {
      console.error("Error submitting Goal Mapping plan:", error);
      toast({
        title: "Error submitting plan",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });
  
  // Handle saving the goal map
  const handleSave = () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }
    
    if (goalMap.goals.length === 0) {
      toast({
        title: "No goals defined",
        description: "Please add at least one goal before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // Update the lastUpdated timestamp
    const updatedMap = {
      ...goalMap,
      lastUpdated: Date.now(),
      projectId
    };
    
    setIsSaving(true);
    saveGoalMapMutation.mutate(updatedMap);
  };
  
  // Handle submitting the plan
  const handleSubmitPlan = () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }
    
    if (goalMap.goals.length === 0) {
      toast({
        title: "No goals defined",
        description: "Please add at least one goal before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Save the current state first
    handleSave();
    
    // Then mark the tool as complete
    setIsSubmitting(true);
    submitPlanMutation.mutate();
  };
  
  // Add a new goal
  const handleAddGoal = () => {
    // Check if we've reached the maximum goals limit (10)
    if (goalMap.goals.length >= 10) {
      toast({
        title: "Maximum goals reached",
        description: "You can only add up to 10 goals total.",
        variant: "destructive",
      });
      return;
    }
    
    // Default to level 1 or the last used level
    const lastGoal = goalMap.goals[goalMap.goals.length - 1];
    const defaultLevel = lastGoal ? lastGoal.level : 1;
    
    // Count goals at this level
    const goalsAtLevel = goalMap.goals.filter(g => g.level === defaultLevel).length;
    
    // Check if we've reached the maximum goals for this level (3)
    if (goalsAtLevel >= 3) {
      toast({
        title: "Maximum goals for level reached",
        description: "You can only add up to 3 goals per level.",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new goal with a unique ID
    const newGoal: GoalTableRow = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text: "",
      timeframe: "",
      level: defaultLevel
    };
    
    // Add the new goal to the list
    setGoalMap(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));
  };
  
  // Update a goal's text
  const handleUpdateGoalText = (id: string, text: string) => {
    setGoalMap(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === id ? { ...goal, text } : goal
      )
    }));
  };
  
  // Update a goal's timeframe
  const handleUpdateGoalTimeframe = (id: string, timeframe: string) => {
    // Ensure timeframe is always a string, never null/undefined
    const normalizedTimeframe = timeframe !== undefined && timeframe !== null ? timeframe : "";
    
    setGoalMap(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === id ? { ...goal, timeframe: normalizedTimeframe } : goal
      )
    }));
  };
  
  // Update a goal's level
  const handleUpdateGoalLevel = (id: string, levelStr: string) => {
    const level = parseInt(levelStr, 10);
    
    // Count goals at the new level
    const goalsAtLevel = goalMap.goals.filter(g => g.level === level && g.id !== id).length;
    
    // Check if we've reached the maximum goals for this level (3)
    if (goalsAtLevel >= 3) {
      toast({
        title: "Maximum goals for level reached",
        description: "You can only add up to 3 goals per level.",
        variant: "destructive",
      });
      return;
    }
    
    setGoalMap(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === id ? { ...goal, level } : goal
      )
    }));
  };
  
  // Delete a goal
  const handleDeleteGoal = (id: string) => {
    setGoalMap(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal.id !== id)
    }));
  };
  
  // Group goals by level for display
  const goalsByLevel = goalMap.goals.reduce<Record<number, GoalTableRow[]>>(
    (acc, goal) => {
      if (!acc[goal.level]) {
        acc[goal.level] = [];
      }
      acc[goal.level].push(goal);
      return acc;
    },
    {}
  );
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading goal map...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Goal Mapping Table</h2>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={handleAddGoal}
            disabled={goalMap.goals.length >= 10}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || goalMap.goals.length === 0}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          
          <Button
            onClick={handleSubmitPlan}
            disabled={isSubmitting || goalMap.goals.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Submit Plan
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Level</TableHead>
              <TableHead>Goal</TableHead>
              <TableHead className="w-[200px]">Timeframe (optional)</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goalMap.goals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No goals added. Click "Add Goal" to get started.
                </TableCell>
              </TableRow>
            ) : (
              goalMap.goals
                .sort((a, b) => a.level - b.level) // Sort by level
                .map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <Select
                        value={goal.level.toString()}
                        onValueChange={(value) => handleUpdateGoalLevel(goal.id, value)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1</SelectItem>
                          <SelectItem value="2">Level 2</SelectItem>
                          <SelectItem value="3">Level 3</SelectItem>
                          <SelectItem value="4">Level 4</SelectItem>
                          <SelectItem value="5">Level 5</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={goal.text}
                        onChange={(e) => handleUpdateGoalText(goal.id, e.target.value)}
                        placeholder="Enter goal text..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={goal.timeframe}
                        onChange={(e) => handleUpdateGoalTimeframe(goal.id, e.target.value)}
                        placeholder="E.g., Q3 2025"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-muted/50 p-4 rounded-md text-sm">
        <h3 className="font-medium mb-2">Guidelines:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Add up to 10 total goals across all levels</li>
          <li>Maximum 3 goals per level</li>
          <li>Level 1-2: Organization/value goals</li>
          <li>Level 3-5: Project-specific objectives</li>
          <li>Timeframes are optional - add when known</li>
        </ul>
      </div>
    </div>
  );
}
