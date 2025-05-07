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
  
  // State to capture server logs for debugging
  const [logs, setLogs] = useState<any>(null);
  
  // Fetch existing goal map for this project
  const { data: existingGoalMap, isLoading } = useQuery<GoalMapData>({
    queryKey: ['/api/goal-maps', projectId],
    queryFn: async () => {
      console.log("🔄 FETCH GOAL MAP REQUEST:", `/api/goal-maps?projectId=${projectId}`);
      const res = await apiRequest("GET", `/api/goal-maps?projectId=${projectId}`);
      
      // Log the raw response before any processing
      const responseText = await res.clone().text();
      console.log("📥 FETCH GOAL MAP RAW RESPONSE:", responseText);
      
      if (!res.ok) {
        if (res.status === 404) {
          console.log("❌ No goal map found (404) – using empty template");
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
      console.log("📋 FETCH GOAL MAP PARSED RESPONSE:", JSON.stringify(json, null, 2));
      
      // CRITICAL: Only use the empty template fallback for actual 404 responses
      // If the server returns a 200 with empty goals, preserve our current goals
      if (json.goals?.length === 0) {
        console.log("⚠️ Fetched JSON.goals is empty but status was 200 – preserving previous state");
        if (existingGoalMap && existingGoalMap.goals && existingGoalMap.goals.length > 0) {
          console.log('🔒 Using existing goals from cache:', JSON.stringify(existingGoalMap.goals, null, 2));
          json.goals = [...existingGoalMap.goals]; // Create a new array to ensure reactivity
        }
      }
      return json;
    },
    enabled: !!projectId
  });
  
  // Track if we've initialized from server data to avoid data loss
  const [serverDataProcessed, setServerDataProcessed] = useState(false);
  
  // Load data from server when available - but only once when it first loads
  useEffect(() => {
    // Only process server data if we haven't already or if we have a fresh non-null response
    if (existingGoalMap && (!serverDataProcessed || existingGoalMap.id)) {
      console.log("📢 existingGoalMap CHANGED:", JSON.stringify(existingGoalMap, null, 2));
      console.log("🔃 BEFORE PROCESSING - Current goalMap state:", JSON.stringify(goalMap, null, 2));
      console.log("📥 LOADING NEW DATA - existingGoalMap from server:", JSON.stringify(existingGoalMap, null, 2));
      
      // Special case: If we have goals locally but server returns empty, preserve our goals
      if (
        goalMap.goals?.length > 0 && 
        (!existingGoalMap.goals || existingGoalMap.goals.length === 0)
      ) {
        console.log("⚠️ CRITICAL DATA LOSS PREVENTED - Server returned empty goals but we have valid goals in state");
        console.log("🔒 Will preserve current goals:", JSON.stringify(goalMap.goals, null, 2));
        
        // Only merge the metadata from server, keep our goals
        const preservedGoalMapData = {
          ...existingGoalMap,
          goals: [...goalMap.goals] // Create a deep copy to ensure reactivity
        };
        
        console.log("✅ AFTER PRESERVATION - Final goal map to use:", JSON.stringify(preservedGoalMapData, null, 2));
        setGoalMap(preservedGoalMapData);
        
        // Mark as processed so we don't replace data again
        setServerDataProcessed(true);
        return; // Skip the rest of the processing
      }
      
      // Normal processing path (server data is valid or local state is empty)
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
        console.log("🔄 CONVERT - Converted nodes to goals:", JSON.stringify(convertedGoals, null, 2));
      } else if (!goalMapData.goals) {
        // Initialize empty array if neither format exists
        goalMapData.goals = [];
        console.log("⚠️ NO GOALS FOUND - Initializing empty goals array");
      } else {
        // Normalize timeframe values for existing goals
        goalMapData.goals = goalMapData.goals.map((goal: any) => ({
          ...goal,
          // Ensure timeframe is always a string, even if empty
          timeframe: goal.timeframe !== undefined && goal.timeframe !== null ? goal.timeframe : ""
        }));
        console.log("🔄 NORMALIZE - Normalized timeframes for goals:", JSON.stringify(goalMapData.goals, null, 2));
      }
      
      console.log("✅ AFTER PROCESSING - Final goal map to use:", JSON.stringify(goalMapData, null, 2));
      setGoalMap(goalMapData);
      
      // Mark as processed so we don't replace data again unless we get a new server response with ID
      setServerDataProcessed(true);
    }
  }, [existingGoalMap, serverDataProcessed]);
  
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
      
      // Capture server logs for debugging
      if (data.logs) {
        console.log("SAVE DRAFT - Server logs:", data.logs);
        setLogs(data.logs);
      } else {
        // If server doesn't return logs, create our own debug info
        setLogs({
          operation: "save-draft",
          timestamp: new Date().toISOString(),
          response: data,
          goals: data.goals || (data.data && data.data.goals) || [],
          goalCount: data.goals?.length || (data.data && data.data.goals?.length) || 0
        });
      }
      
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
    mutationFn: async (payload: { projectId: string; currentGoals: GoalTableRow[] }) => {
      if (!payload.projectId) throw new Error("No project selected");
      
      // Ensure projectId is properly formatted as a string
      const projectIdStr = String(payload.projectId);
      
      // Add projectId to the payload for consistency
      const fullPayload = { 
        projectId: projectIdStr,
        currentGoals: payload.currentGoals 
      };
      console.log("SUBMIT PLAN - Sending payload:", JSON.stringify(fullPayload, null, 2));
      
      // Mark the goal mapping as complete with the current goals
      const response = await apiRequest("POST", "/api/project-progress/goal-mapping/complete", fullPayload);
      
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
      
      // Capture server logs for debugging
      if (data.logs) {
        console.log("SUBMIT PLAN - Server logs:", data.logs);
        setLogs(data.logs);
      } else {
        // If server doesn't return logs, create our own debug info
        setLogs({
          operation: "submit-plan",
          timestamp: new Date().toISOString(),
          response: data,
          currentGoals: goalMap.goals,
          currentGoalCount: goalMap.goals.length,
          responseGoals: data.goals || (data.data && data.data.goals) || [],
          responseGoalCount: data.goals?.length || (data.data && data.data.goals?.length) || 0
        });
      }
      
      toast({
        title: "Plan submitted successfully",
        description: "Your Goal Mapping has been marked as complete.",
      });
      
      // Ensure projectId is a string for consistent cache invalidation
      const projectIdStr = String(projectId);
      
      // Invalidate all relevant queries to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ["project-progress", projectIdStr] });
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goal-maps", projectIdStr] });
      
      // Also invalidate the general project queries as progress might be shown there
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectIdStr] });
      
      // Refresh progress to update UI right after cache invalidation
      if (refreshProgress) {
        console.log("SUBMIT PLAN - Refreshing project progress after Goal Mapping completion");
        refreshProgress();
      }
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
    console.log("🔵 SAVE DRAFT - BEFORE:", JSON.stringify(goalMap, null, 2));
    
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
    
    console.log("🔵 SAVE DRAFT - PREPARING MAP:", JSON.stringify(updatedMap, null, 2));
    console.log("🔵 SAVE DRAFT - GOAL COUNT:", updatedMap.goals.length);
    
    setIsSaving(true);
    saveGoalMapMutation.mutate(updatedMap);
  };
  
  // Handle submitting the plan
  const handleSubmitPlan = () => {
    console.log("🔴 SUBMIT PLAN - BEFORE:", JSON.stringify(goalMap, null, 2));
    console.log("🔴 SUBMIT PLAN - GOAL COUNT:", goalMap.goals.length);
    
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
    
    // Create a backup copy of the current goals (in case they get lost during submit)
    const goalBackup = [...goalMap.goals];
    console.log("🔴 SUBMIT PLAN - GOALS BACKUP CREATED:", JSON.stringify(goalBackup, null, 2));
    
    // Then mark the tool as complete
    setIsSubmitting(true);
    
    // Call the complete API endpoint with the current goals to ensure they're preserved
    submitPlanMutation.mutate({ 
      projectId, 
      currentGoals: goalMap.goals // Send the current goals with the completion request
    }, {
      onSuccess: (data) => {
        console.log("🟢 SUBMIT PLAN - SUCCESS RESPONSE:", data);
        // If the server sent back goals, update our state to match
        if (data.goals && Array.isArray(data.goals) && data.goals.length > 0) {
          console.log(`🟢 SUBMIT PLAN - Server returned ${data.goals.length} goals`);
          setGoalMap(prev => ({
            ...prev,
            goals: data.goals // Use the goals returned from the server
          }));
        }
      },
      onError: (error) => {
        console.error("🔴 SUBMIT PLAN - ERROR:", error);
        // Restore goals from backup if there was an error
        console.log("🔴 SUBMIT PLAN - RESTORING GOALS FROM BACKUP AFTER ERROR");
        setGoalMap(prev => ({
          ...prev,
          goals: goalBackup
        }));
      }
    });
    
    // Safety check to verify goals are preserved (after a delay to let state updates happen)
    setTimeout(() => {
      console.log("🔴 SUBMIT PLAN - VERIFICATION CHECK AFTER SUBMIT:");
      console.log("🔴 CURRENT GOALS COUNT:", goalMap.goals.length);
      console.log("🔴 BACKUP GOALS COUNT:", goalBackup.length);
      
      // If goals were lost in the submission process, restore them
      if (goalMap.goals.length === 0 && goalBackup.length > 0) {
        console.log("🔴 SUBMIT PLAN - RESTORING GOALS FROM BACKUP");
        setGoalMap(prev => ({
          ...prev,
          goals: goalBackup
        }));
      }
    }, 2000); // Extended timeout to ensure async operations complete
  };
  
  // Add a new goal
  const handleAddGoal = () => {
    console.log("🟢 ADD GOAL - BEFORE:", JSON.stringify(goalMap, null, 2));
    
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
    setGoalMap(prev => {
      const updated = {
        ...prev,
        goals: [...prev.goals, newGoal]
      };
      console.log("🟢 ADD GOAL - AFTER:", JSON.stringify(updated, null, 2));
      return updated;
    });
  };
  
  // Update a goal's text
  const handleUpdateGoalText = (id: string, text: string) => {
    console.log(`🟢 UPDATE GOAL TEXT (${id}) - BEFORE:`, JSON.stringify(goalMap, null, 2));
    
    setGoalMap(prev => {
      const updated = {
        ...prev,
        goals: prev.goals.map(goal => 
          goal.id === id ? { ...goal, text } : goal
        )
      };
      console.log(`🟢 UPDATE GOAL TEXT (${id}) - AFTER:`, JSON.stringify(updated, null, 2));
      return updated;
    });
  };
  
  // Update a goal's timeframe
  const handleUpdateGoalTimeframe = (id: string, timeframe: string) => {
    console.log(`🟢 UPDATE GOAL TIMEFRAME (${id}) - BEFORE:`, JSON.stringify(goalMap, null, 2));
    
    // Ensure timeframe is always a string, never null/undefined
    const normalizedTimeframe = timeframe !== undefined && timeframe !== null ? timeframe : "";
    
    setGoalMap(prev => {
      const updated = {
        ...prev,
        goals: prev.goals.map(goal => 
          goal.id === id ? { ...goal, timeframe: normalizedTimeframe } : goal
        )
      };
      console.log(`🟢 UPDATE GOAL TIMEFRAME (${id}) - AFTER:`, JSON.stringify(updated, null, 2));
      return updated;
    });
  };
  
  // Update a goal's level
  const handleUpdateGoalLevel = (id: string, levelStr: string) => {
    console.log(`🟢 UPDATE GOAL LEVEL (${id}) - BEFORE:`, JSON.stringify(goalMap, null, 2));
    
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
    
    setGoalMap(prev => {
      const updated = {
        ...prev,
        goals: prev.goals.map(goal => 
          goal.id === id ? { ...goal, level } : goal
        )
      };
      console.log(`🟢 UPDATE GOAL LEVEL (${id}) - AFTER:`, JSON.stringify(updated, null, 2));
      return updated;
    });
  };
  
  // Delete a goal
  const handleDeleteGoal = (id: string) => {
    console.log(`🟢 DELETE GOAL (${id}) - BEFORE:`, JSON.stringify(goalMap, null, 2));
    
    setGoalMap(prev => {
      const updated = {
        ...prev,
        goals: prev.goals.filter(goal => goal.id !== id)
      };
      console.log(`🟢 DELETE GOAL (${id}) - AFTER:`, JSON.stringify(updated, null, 2));
      return updated;
    });
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
      
      {/* Debug logs section */}
      {logs && (
        <div className="mt-6 border border-amber-300 bg-amber-50 rounded-md p-4">
          <h3 className="font-medium text-amber-800 mb-2">Debug Logs:</h3>
          <pre className="text-xs bg-white p-3 rounded border border-amber-200 overflow-x-auto max-h-[400px] overflow-y-auto">
            {JSON.stringify(logs, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
