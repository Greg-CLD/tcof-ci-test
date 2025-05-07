import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, DownloadIcon, Clock, Target, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { elementToPDF } from '@/lib/pdf-utils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Updated table-based goal structure
interface GoalTableRow {
  id: string;
  text: string;
  timeframe: string;
  level: number;
}

interface GoalMapData {
  name: string;
  goals: GoalTableRow[];
  lastUpdated: number;
  id?: string;
  projectId?: string;
}

interface GoalMappingViewProps {
  projectId: string;
  onEdit?: () => void;
}

export function GoalMappingView({ projectId, onEdit }: GoalMappingViewProps) {
  const { toast } = useToast();
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Fetch goal map data
  const { data: goalMap, isLoading } = useQuery<GoalMapData>({
    queryKey: ['/api/goal-maps', projectId],
    queryFn: async () => {
      console.log("FETCH GOAL MAP REQUEST:", `/api/goal-maps?projectId=${projectId}`);
      const res = await apiRequest("GET", `/api/goal-maps?projectId=${projectId}`);
      const json = await res.json();
      console.log("FETCH GOAL MAP RESPONSE:", json);

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
      if (json.goals?.length === 0) {
        console.log("Fetched JSON.goals is empty – preserving previous state if any");
      }
      return json;
    },
    enabled: !!projectId,
  });
  
  // State to hold processed data for display
  const [processedMap, setProcessedMap] = useState<GoalMapData>({
    name: "Project Goals",
    goals: [],
    lastUpdated: Date.now()
  });
  
  // Process data when it arrives from the server
  useEffect(() => {
    if (goalMap) {
      // Check if we have the new format or need to convert from old
      let processedData: GoalMapData;
      
      if (goalMap.goals) {
        // Already in new format
        processedData = goalMap;
      } else if ((goalMap as any).nodes) {
        // Convert from old format
        const nodes = (goalMap as any).nodes || [];
        const convertedGoals = nodes.map((node: any, index: number) => ({
          id: node.id,
          text: node.text,
          timeframe: node.timeframe,
          level: Math.min(Math.floor(index / 3) + 1, 5) // Assign levels based on index
        }));
        
        processedData = {
          ...goalMap,
          name: goalMap.name || "Project Goals",
          goals: convertedGoals
        };
      } else {
        // Empty data
        processedData = {
          name: "Project Goals",
          goals: [],
          lastUpdated: Date.now(),
          projectId
        };
      }
      
      setProcessedMap(processedData);
    }
  }, [goalMap, projectId]);
  
  // Convert the timestamp to a readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle PDF export
  const handleExportPDF = () => {
    if (containerRef.current) {
      elementToPDF(containerRef.current, `goal-map-${projectId}.pdf`);
      toast({
        title: "PDF generated",
        description: "Your success map has been exported as PDF."
      });
    }
  };
  
  // Group goals by level for display
  const goalsByLevel = processedMap.goals.reduce<Record<number, GoalTableRow[]>>(
    (acc, goal) => {
      if (!acc[goal.level]) {
        acc[goal.level] = [];
      }
      acc[goal.level].push(goal);
      return acc;
    },
    {}
  );
  
  // Get a user-friendly level name
  const getLevelName = (level: number) => {
    switch(level) {
      case 1: return 'Level 1 - Organization Strategic Goals';
      case 2: return 'Level 2 - Organization Value Goals';
      case 3: return 'Level 3 - Project Strategic Goals';
      case 4: return 'Level 4 - Project Tactical Goals';
      case 5: return 'Level 5 - Project Operational Goals';
      default: return `Level ${level} Goals`;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading goal map...</span>
      </div>
    );
  }
  
  return (
    <Card className="shadow-md overflow-hidden" ref={containerRef}>
      <CardHeader className="flex flex-row items-center justify-between bg-blue-50/70 pb-6">
        <div>
          <CardTitle className="text-2xl text-tcof-dark">
            {processedMap.name}
          </CardTitle>
          <CardDescription>
            Last updated: {formatDate(processedMap.lastUpdated)}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={handleExportPDF}
          >
            <DownloadIcon className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
          {onEdit && (
            <Button 
              variant="outline" 
              className="text-tcof-teal border-tcof-teal hover:bg-tcof-teal/10"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Total Goals</div>
            <div className="text-2xl font-bold">{processedMap.goals.length}</div>
          </div>
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Goal Levels</div>
            <div className="text-2xl font-bold">{Object.keys(goalsByLevel).length}</div>
          </div>
          <div className="bg-blue-50 rounded-md p-4">
            <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Max Goals Per Level</div>
            <div className="text-2xl font-bold">3</div>
          </div>
        </div>
        
        {/* Goals Table Display */}
        {processedMap.goals.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(goalsByLevel)
              .sort(([levelA], [levelB]) => parseInt(levelA) - parseInt(levelB))
              .map(([level, goals]) => (
                <div key={level} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b font-medium text-gray-700">
                    {getLevelName(parseInt(level))} ({goals.length})
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-2 px-4 text-left font-medium text-gray-600">Goal</th>
                        <th className="py-2 px-4 text-left font-medium text-gray-600 w-1/4">Timeframe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goals.map((goal) => (
                        <tr key={goal.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-start">
                              <Target className="w-5 h-5 text-tcof-teal mt-0.5 mr-2 flex-shrink-0" />
                              <span>{goal.text}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {goal.timeframe ? (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                                <span>{goal.timeframe}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No timeframe</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center p-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-1">No Goals Yet</h3>
            <p className="text-gray-400 mb-4">Click the Edit button to start adding goals to your map.</p>
            {onEdit && (
              <Button
                onClick={onEdit}
                className="bg-tcof-teal hover:bg-tcof-teal/90 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Create Goals
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}